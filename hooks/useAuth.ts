import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase/config';
// Fix: Use scoped firebase packages to resolve module export errors.
import { 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  // Fix: Added imports for phone authentication
  signInWithPhoneNumber,
  type RecaptchaVerifier,
  type ConfirmationResult,
} from '@firebase/auth';
import { doc, getDoc, setDoc } from '@firebase/firestore';
import type { User } from '../types';
import useLocalization from './useLocalization';

export default function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLocalization();
  // Fix: Added state for phone authentication confirmation result
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const getAuthErrorMessage = useCallback((error: any): string => {
    switch (error.code) {
        // Email/Password
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return t('authError'); // Generic message for all invalid credential errors
        case 'auth/invalid-email':
            return t('authErrorInvalidEmail');
        case 'auth/user-disabled':
            return t('authErrorUserDisabled');
        case 'auth/email-already-in-use':
            return t('authErrorEmailInUse');
        case 'auth/weak-password':
            return t('authErrorWeakPassword');
        case 'auth/too-many-requests':
            return t('authErrorTooManyRequests');
        
        // Phone Auth
        case 'auth/invalid-phone-number':
            return t('authErrorInvalidPhoneNumber');
        case 'auth/quota-exceeded':
            return t('authErrorQuotaExceeded');
        case 'auth/captcha-check-failed':
            return t('authErrorCaptchaCheckFailed');
        case 'auth/code-expired':
            return t('authErrorCodeExpired');
        case 'auth/invalid-verification-code':
            return t('authErrorInvalidVerificationCode');
            
        default:
            return error.message || t('authErrorDefault');
    }
  }, [t]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as User);
        } else {
          // This case handles users who are authenticated but don't have a profile document in Firestore.
          // This can happen if profile creation failed during sign-up.
          // We create a profile on-the-fly to prevent the user from being stuck in a login loop.
          console.warn(`User profile not found for uid ${firebaseUser.uid}. Creating a new one.`);
          
          const newUserProfile: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User', // Use display name from auth, or a default
            phone: firebaseUser.phoneNumber || null,
            email: firebaseUser.email,
            preferred_language: language,
            createdAt: Date.now(),
          };

          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
            setUserProfile(newUserProfile);
          } catch (error) {
            console.error("Failed to create Firestore profile for existing auth user:", error);
            // If profile creation fails, log the user out to prevent an infinite loop.
            await firebaseSignOut(auth);
            setUserProfile(null);
          }
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (error: any) {
      console.error("Firebase sign in failed", error);
      return getAuthErrorMessage(error);
    }
  }, [getAuthErrorMessage]);
  
  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update Firebase Auth profile displayName
      await updateProfile(firebaseUser, { displayName: name });

      // Create user profile in Firestore
      const newUserProfile: User = {
        uid: firebaseUser.uid,
        name,
        phone: null, // Phone is not collected in this flow
        email: firebaseUser.email,
        preferred_language: language,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
      setUserProfile(newUserProfile);
      
      return null;
    } catch (error: any) {
      console.error("Firebase sign up failed", error);
      return getAuthErrorMessage(error);
    }
  }, [language, getAuthErrorMessage]);

  // Fix: Added sendOtp function for phone authentication
  const sendOtp = useCallback(async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      return null;
    } catch (error: any) {
      console.error("Firebase send OTP failed", error);
      return getAuthErrorMessage(error);
    }
  }, [getAuthErrorMessage]);

  // Fix: Added verifyOtp function for phone authentication
  const verifyOtp = useCallback(async (otp: string) => {
    if (!confirmationResult) {
      return t('otpRequestFirst');
    }
    try {
      await confirmationResult.confirm(otp);
      return null;
    } catch (error: any) {
      console.error("Firebase verify OTP failed", error);
      return getAuthErrorMessage(error);
    }
  }, [confirmationResult, getAuthErrorMessage, t]);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Firebase logout failed", error);
    }
  };

  // Fix: Added sendOtp and verifyOtp to returned object
  return { user, userProfile, loading, logout, signIn, signUp, sendOtp, verifyOtp };
}