import React, { useState, useEffect } from 'react';
import useLocalization from '../hooks/useLocalization';
import Spinner from './Spinner';
import { auth } from '../firebase/config';
// Fix: Use scoped firebase package to resolve module export errors.
import { RecaptchaVerifier } from '@firebase/auth';
import useAuth from '../hooks/useAuth';

type AuthStep = 'phone' | 'otp';

export default function LoginPage() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();
  const { sendOtp, verifyOtp } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // Basic phone validation, should be improved for production
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        setError(t('invalidPhoneNumber'));
        setIsLoading(false);
        return;
    }

    const appVerifier = (window as any).recaptchaVerifier;
    const sendError = await sendOtp(phoneNumber, appVerifier);

    if (sendError) {
      setError(sendError);
    } else {
      setStep('otp');
      setError(null); // Clear previous errors
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const verifyError = await verifyOtp(otp);
    if (verifyError) {
      setError(verifyError);
    }
    // On success, the onAuthStateChanged listener will redirect.
    setIsLoading(false);
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setError(null);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div id="recaptcha-container"></div>
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          {step === 'phone' ? t('phoneLoginTitle') : t('otpVerification')}
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {step === 'phone' ? t('phoneLoginSubtitle') : t('otpSubtitle')}
        </p>
        
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center mb-4 text-sm">{error}</p>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                {t('phoneNumber')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+11234567890"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:bg-blue-400"
            >
              {isLoading ? <Spinner /> : t('sendOtp')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="otp">
                {t('otp')}
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
                required
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:bg-blue-400"
            >
              {isLoading ? <Spinner /> : t('verifyOtp')}
            </button>
            <button
              type="button"
              onClick={handleBackToPhone}
              className="w-full text-center mt-4 text-sm text-blue-600 hover:underline focus:outline-none"
            >
              {t('backToPhone')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}