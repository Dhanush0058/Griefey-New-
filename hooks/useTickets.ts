import { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase/config';
// Fix: Use scoped firebase packages to resolve module export errors.
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  runTransaction,
  doc,
} from '@firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from '@firebase/storage';
import type { Complaint, ComplaintCategory } from '../types';
import { ComplaintStatus } from '../types';
import useAuth from './useAuth';
import { getAddressFromCoordinates, routeComplaintToDepartment, translateText, checkSemanticSimilarity } from '../services/geminiService';
import useDepartments from './useDepartments';
import { calculateJaccardSimilarity } from '../lib/similarity';
// Fix: Import `useLocalization` hook to resolve 'Cannot find name' error.
import useLocalization from './useLocalization';

// Define the structure for the return value of addTicket
export type AddTicketResult = { id: string; duplicate: false } | { parentTicketId: string; duplicate: true };


export default function useTickets() { // Filename kept for simplicity, logic is for Complaints
  const { userProfile } = useAuth();
  const { departments } = useDepartments();
  const [tickets, setTickets] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const { t } = useLocalization();

  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ticketsCollection = collection(db, 'complaints');
    const q = query(
      ticketsCollection, 
      where('userUid', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Complaint));
      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching complaints:", error);
      addNotification("Could not fetch complaints.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, addNotification]);
  
  const addTicket = async (
    { title, description, category, subcategory, location, attachments, isAnonymous }: 
    { title: string; description: string; category: ComplaintCategory; subcategory?: string; location: { lat: number; lng: number }; attachments: File[], isAnonymous: boolean }
  ): Promise<AddTicketResult | null> => {
    if (!userProfile) {
      addNotification("You must be logged in to submit a complaint.");
      return null;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      // 1. Duplicate Detection
      const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const latDelta = 0.01; // ~1.1km
      const lngDelta = 0.01; // ~1.1km

      const complaintsRef = collection(db, 'complaints');
      const q = query(complaintsRef, 
        where('parent_ticket_id', '==', null),
        where('category', '==', category),
        where('createdAt', '>=', sevenDaysAgo)
      );
      
      const querySnapshot = await getDocs(q);
      const nearbyComplaints: Complaint[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data() as Complaint;
        // Client-side location filtering
        if (
          data.location &&
          Math.abs(data.location.lat - location.lat) <= latDelta &&
          Math.abs(data.location.lng - location.lng) <= lngDelta
        ) {
          nearbyComplaints.push({ id: doc.id, ...data });
        }
      });
      
      let mostSimilarComplaint: Complaint | null = null;
      const JACCARD_THRESHOLD = 0.4; // Lower threshold for initial check
      const SEMANTIC_THRESHOLD = 0.8; // Confidence from AI

      for (const complaint of nearbyComplaints) {
          const jaccardSim = calculateJaccardSimilarity(description, complaint.description_original);
          if (jaccardSim > JACCARD_THRESHOLD) {
              const isSimilar = await checkSemanticSimilarity(description, complaint.description_original);
              if (isSimilar) {
                  mostSimilarComplaint = complaint;
                  break; // Found a semantic match, no need to check further
              }
          }
      }

      if (mostSimilarComplaint) {
        const parentTicketRef = doc(db, 'complaints', mostSimilarComplaint.id);

        await runTransaction(db, async (transaction) => {
          const parentDoc = await transaction.get(parentTicketRef);
          if (!parentDoc.exists()) {
            throw "Parent document does not exist!";
          }
          const upvotedBy = parentDoc.data().upvotedBy || [];
          if (!upvotedBy.includes(userProfile.uid)) {
            const newUpvotedBy = [...upvotedBy, userProfile.uid];
            transaction.update(parentTicketRef, { 
              upvote_count: newUpvotedBy.length,
              upvotedBy: newUpvotedBy
            });
          }
        });

        await addDoc(collection(db, 'complaints'), {
          userUid: userProfile.uid, title,
          description_original: description, description_en: description,
          category, subcategory: subcategory || null, location,
          attachments: [], status: ComplaintStatus.Duplicate,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          department_id: mostSimilarComplaint.department_id,
          upvote_count: 0, parent_ticket_id: mostSimilarComplaint.id,
          escalation_level: 0, escalation_due: mostSimilarComplaint.escalation_due,
          upvotedBy: [],
          isAnonymous: isAnonymous
        });

        return { parentTicketId: mostSimilarComplaint.id, duplicate: true };
      }

      // 2. No duplicate, create new ticket
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        const uploadPromises = attachments.map((file, index) => {
            const storageRef = ref(storage, `attachments/${userProfile.uid}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            return new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot: UploadTaskSnapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        const totalProgress = (index / attachments.length) * 100 + progress / attachments.length;
                        setUploadProgress(totalProgress);
                    },
                    (error) => { reject(error); },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });
        });
        attachmentUrls.push(...await Promise.all(uploadPromises));
      }
      setUploadProgress(100);

      const descriptionEn = await translateText(description);
      const departmentId = category === 'Other' ? await routeComplaintToDepartment(descriptionEn, departments) : null;
      const address = await getAddressFromCoordinates(location.lat, location.lng);
      const escalationDueDate = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));

      const newComplaint: Omit<Complaint, 'id'> = {
          userUid: userProfile.uid, title,
          description_original: description, description_en: descriptionEn,
          category, subcategory: subcategory || undefined,
          location: { ...location, address }, attachments: attachmentUrls,
          status: ComplaintStatus.Submitted,
          createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp,
          department_id: departmentId, upvote_count: 1, parent_ticket_id: null,
          escalation_level: 0, escalation_due: escalationDueDate,
          upvotedBy: [userProfile.uid],
          isAnonymous: isAnonymous
      };

      const docRef = await addDoc(collection(db, 'complaints'), newComplaint);
      return { id: docRef.id, duplicate: false };
    } catch (error) {
      console.error("Error submitting complaint:", error);
      addNotification(t('errorSubmitting'));
      return null;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const upvoteTicket = async (ticketId: string) => {
    if (!userProfile) {
      addNotification("You must be logged in to upvote.");
      return false;
    }
    const ticketRef = doc(db, 'complaints', ticketId);
    try {
      await runTransaction(db, async (transaction) => {
        const ticketDoc = await transaction.get(ticketRef);
        if (!ticketDoc.exists()) throw "Document does not exist!";
        
        const upvotedBy: string[] = ticketDoc.data().upvotedBy || [];
        const hasUpvoted = upvotedBy.includes(userProfile.uid);
        const newUpvotedBy = hasUpvoted 
          ? upvotedBy.filter(uid => uid !== userProfile.uid)
          : [...upvotedBy, userProfile.uid];

        transaction.update(ticketRef, { 
          upvote_count: newUpvotedBy.length,
          upvotedBy: newUpvotedBy
        });
      });
      addNotification(t('upvoteSuccess'));
      return true;
    } catch (error) {
      console.error("Error upvoting ticket:", error);
      addNotification(t('upvoteError'));
      return false;
    }
  };

  const getNearbyTickets = async (location: { lat: number, lng: number }) => {
    setLoading(true);
    if (!userProfile) {
      setLoading(false);
      return [];
    }

    try {
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const latDelta = 0.01; // ~1.1km
        const lngDelta = 0.01;

        const complaintsRef = collection(db, 'complaints');
        // Simplified query to use automatic single-field index and avoid composite index error.
        const q = query(complaintsRef,
            where('createdAt', '>=', sevenDaysAgo)
        );

        const querySnapshot = await getDocs(q);
        const nearbyComplaints: Complaint[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data() as Complaint;
            // Filter for original tickets and location client-side
            if (
                data.parent_ticket_id === null &&
                data.location &&
                data.userUid !== userProfile.uid &&
                Math.abs(data.location.lat - location.lat) <= latDelta &&
                Math.abs(data.location.lng - location.lng) <= lngDelta
            ) {
                nearbyComplaints.push({ id: doc.id, ...data });
            }
        });
        return nearbyComplaints.sort((a,b) => b.upvote_count - a.upvote_count);
    } catch (error) {
        console.error("Error fetching nearby tickets:", error);
        addNotification("Could not fetch nearby tickets.");
        return [];
    } finally {
        setLoading(false);
    }
  }

  return { tickets, loading, notifications, addTicket, isSubmitting, uploadProgress, addNotification, upvoteTicket, getNearbyTickets };
}