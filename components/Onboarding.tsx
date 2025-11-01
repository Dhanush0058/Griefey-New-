import React, { useState } from 'react';
import useLocalization from '../hooks/useLocalization';
import Spinner from './Spinner';
import useAuth from '../hooks/useAuth';

type OnboardingStep = 'login' | 'signup';

export default function Onboarding() {
  const { signIn, signUp, loading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const signInError = await signIn(email, password);
    if (signInError) {
      setError(signInError);
    }
    // On success, the main App component will see the userProfile and render MainApp.
    setIsLoading(false);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim() && password.trim()) {
      setIsLoading(true);
      setError(null);
      const signUpError = await signUp(name, email, password);
      if (signUpError) {
        setError(signUpError);
      }
      // On success, the main App component will see the userProfile and render MainApp.
      setIsLoading(false);
    }
  };

  const toggleStep = () => {
    setStep(prev => prev === 'login' ? 'signup' : 'login');
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  }

  const renderContent = () => {
    if (step === 'login') {
        return (
           <>
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">{t('loginTitle')}</h1>
            <p className="text-center text-gray-500 mb-8">{t('welcomeSubtitle')}</p>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">{t('email')}</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">{t('password')}</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:bg-blue-400">
                {isLoading ? <Spinner /> : t('login')}
              </button>
               <p className="text-center mt-4 text-sm">
                {t('noAccount')} <button type="button" onClick={toggleStep} className="font-medium text-blue-600 hover:underline">{t('signup')}</button>
              </p>
            </form>
           </>
        )
    }

    return ( // signup step
       <>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">{t('createAccount')}</h1>
        <p className="text-center text-gray-500 mb-8">{t('createProfileSubtitle')}</p>
        <form onSubmit={handleSignUp}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fullname">{t('fullName')}</label>
            <input id="fullname" type="text" value={name} onChange={(e) => setName(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-email">{t('email')}</label>
            <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
           <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-password">{t('password')}</label>
            <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-900 bg-white leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <button type="submit" disabled={isLoading || !name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 flex items-center justify-center disabled:bg-blue-400">
            {isLoading ? <Spinner /> : t('signup')}
          </button>
           <p className="text-center mt-4 text-sm">
            {t('hasAccount')} <button type="button" onClick={toggleStep} className="font-medium text-blue-600 hover:underline">{t('login')}</button>
          </p>
        </form>
       </>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center mb-4 text-sm">{error}</p>}
        {authLoading ? <div className="text-center"><p>{t('loadingApp')}</p></div> : renderContent()}
      </div>
    </div>
  );
}