import React, { useState, useEffect, useRef } from 'react';
import useTickets, { AddTicketResult } from '../hooks/useTickets';
import useLocalization from '../hooks/useLocalization';
import Spinner from './Spinner';
import ConfirmationModal from './ConfirmationModal';
import type { ComplaintCategory, Draft } from '../types';
import { CATEGORIES, SUBCATEGORIES } from '../constants';

interface SubmitGrievanceProps {
  setActiveView: (view: 'submit' | 'tickets' | 'drafts' | 'nearby') => void;
  draftToEdit?: Draft | null;
  clearDraftToEdit: () => void;
}

// Fix: Add type definitions for Web Speech API to resolve TypeScript errors.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

// These are array-like, but making them extend Array makes them iterable and indexable for TS
interface SpeechRecognitionResultList extends Array<SpeechRecognitionResult> {}
interface SpeechRecognitionResult extends Array<SpeechRecognitionAlternative> {
    readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

export default function SubmitGrievance({ setActiveView, draftToEdit, clearDraftToEdit }: SubmitGrievanceProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const { addTicket, isSubmitting, uploadProgress, addNotification } = useTickets();
  const [submissionResult, setSubmissionResult] = useState<AddTicketResult | null>(null);
  const { t, language } = useLocalization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State and refs for voice input
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotSupported, setVoiceNotSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const descriptionOnRecStart = useRef('');

  useEffect(() => {
    if (draftToEdit) {
      setTitle(draftToEdit.title);
      setDescription(draftToEdit.description);
      setCategory(draftToEdit.category);
      setSubcategory(draftToEdit.subcategory || '');
      setLocation(draftToEdit.location);
      if (draftToEdit.location) {
        setLocationMessage(t('locationAcquired'));
      }
    }
    // Cleanup function
    return () => {
      clearDraftToEdit();
    };
  }, [draftToEdit, clearDraftToEdit, t]);

  useEffect(() => {
    return () => {
      previews.forEach(URL.revokeObjectURL);
    };
  }, [previews]);

  // Effect to set up SpeechRecognition
  useEffect(() => {
    // Fix: Use augmented window object directly without casting
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotSupported(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (const result of event.results) {
        transcript += result[0].transcript;
      }
      // This is the fix: update React state directly from the API result
      setDescription(descriptionOnRecStart.current + transcript);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            addNotification(t('micPermissionDenied'));
        }
        setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
        recognitionRef.current?.abort();
    };
  }, [language, t, addNotification]);

  const handleToggleRecording = () => {
    if (voiceNotSupported || !recognitionRef.current) {
        addNotification(t('voiceInputNotSupported'));
        return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      // Save current text and start recognition
      descriptionOnRecStart.current = description.trim() ? description.trim() + ' ' : '';
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    previews.forEach(URL.revokeObjectURL);
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(files);
      setPreviews(files.map(file => URL.createObjectURL(file as Blob)));
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
        setLocationMessage('Getting location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLocationMessage(t('locationAcquired'));
            },
            () => {
                setLocationMessage(t('locationError'));
            }
        );
    } else {
        setLocationMessage('Geolocation is not supported by this browser.');
    }
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setSubcategory('');
    setAttachments([]);
    setPreviews([]);
    setLocation(null);
    setLocationMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    clearDraftToEdit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim() && category && location) {
      const result = await addTicket({ title, description, category, subcategory, location, attachments });
      if (result) {
        setSubmissionResult(result);
        // if it was a draft, remove it
        if (draftToEdit) {
          const drafts = JSON.parse(localStorage.getItem('grievance-drafts') || '[]') as Draft[];
          const newDrafts = drafts.filter(d => d.draftId !== draftToEdit.draftId);
          localStorage.setItem('grievance-drafts', JSON.stringify(newDrafts));
        }
        resetForm();
      }
    }
  };

  const handleSaveDraft = () => {
    if (!title.trim() && !description.trim()) {
        addNotification('Title or description is needed to save a draft.');
        return;
    }
    const drafts = JSON.parse(localStorage.getItem('grievance-drafts') || '[]') as Draft[];
    
    let newDrafts;
    const draftData = { title, description, category, subcategory, location };

    if (draftToEdit) {
        // Update existing draft
        newDrafts = drafts.map(d => d.draftId === draftToEdit.draftId ? { ...d, ...draftData } : d);
    } else {
        // Create new draft
        const newDraft: Draft = { draftId: Date.now().toString(), ...draftData };
        newDrafts = [...drafts, newDraft];
    }
    
    localStorage.setItem('grievance-drafts', JSON.stringify(newDrafts));
    addNotification(t('draftSaved'));
    setActiveView('drafts');
    resetForm();
  };

  const handleCloseModal = () => {
    setSubmissionResult(null);
    setActiveView('tickets');
  };
  
  const isFormValid = title.trim() && description.trim() && category && location;
  const availableSubcategories = category ? SUBCATEGORIES[category] : [];

  return (
    <>
    <ConfirmationModal result={submissionResult} onClose={handleCloseModal} />
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('submitGrievance')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">{t('complaintTitle')}</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">{t('category')}</label>
          <select id="category" value={category} onChange={(e) => { setCategory(e.target.value as ComplaintCategory); setSubcategory(''); }} required className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="" disabled>{t('selectCategory')}</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
         {availableSubcategories.length > 0 && (
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="subcategory">{t('subcategory')}</label>
            <select id="subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('selectSubcategory')}</option>
              {availableSubcategories.map(subcat => <option key={subcat} value={subcat}>{subcat}</option>)}
            </select>
          </div>
        )}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 text-sm font-bold" htmlFor="description">{t('describeYourGrievance')}</label>
            {!voiceNotSupported && (
                <button 
                  type="button" 
                  onClick={handleToggleRecording} 
                  className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`} 
                  aria-label={isRecording ? t('stopRecording') : t('recordDescription')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm5 3a1 1 0 11-2 0V4a1 1 0 112 0v3zM4 9a1 1 0 00-1 1v1a5 5 0 0010 0v-1a1 1 0 10-2 0v1a3 3 0 11-6 0v-1a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
          </div>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" rows={5} />
          {isRecording && <p className="text-sm text-red-600 animate-pulse mt-1">{t('recording')}</p>}
          {voiceNotSupported && <p className="text-xs text-gray-500 mt-1">{t('voiceInputNotSupported')}</p>}
        </div>
        <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">{t('location')}</label>
            <button type="button" onClick={handleGetLocation} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200">
                {t('getLocation')}
            </button>
            {locationMessage && <p className={`text-sm mt-2 ${location ? 'text-green-600' : 'text-red-600'}`}>{locationMessage}</p>}
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="attachments">{t('attachments')}</label>
          <input id="attachments" type="file" accept="image/*" multiple onChange={handleImageChange} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
        </div>
        {previews.length > 0 && (
          <div>
            <p className="text-gray-700 text-sm font-bold mb-2">{t('imagePreview')}</p>
            <div className="grid grid-cols-3 gap-2">
                {previews.map((src, index) => <img key={index} src={src} alt={`Preview ${index + 1}`} className="rounded-lg h-24 w-24 object-cover"/>)}
            </div>
          </div>
        )}

        {isSubmitting && uploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
        )}

        <div className="flex space-x-2 pt-2">
            <button type="submit" disabled={isSubmitting || !isFormValid} className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:bg-blue-300">
              {isSubmitting ? <><Spinner /> {uploadProgress === 100 ? t('submitting') : t('uploadProgress')}</> : t('submit')}
            </button>
             <button type="button" onClick={handleSaveDraft} disabled={isSubmitting} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 disabled:bg-gray-400">
              {t('saveDraft')}
            </button>
        </div>
      </form>
    </div>
    </>
  );
}