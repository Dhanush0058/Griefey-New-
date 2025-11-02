import React, { useState, useMemo, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Header from './components/Header';
import SubmitGrievance from './components/SubmitGrievance';
import Dashboard from './components/Dashboard';
import Drafts from './components/Drafts';
import useAuth from './hooks/useAuth';
import useOnlineStatus from './hooks/useOnlineStatus';
import { LocalizationProvider } from './context/LocalizationContext';
import { translations } from './lib/i18n';
import type { Language, Draft } from './types';
import useLocalization from './hooks/useLocalization';
import Chatbot from './components/Chatbot';
import NearbyTickets from './components/NearbyTickets';

type View = 'submit' | 'dashboard' | 'drafts' | 'nearby';

function MainApp() {
  const { userProfile, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [view, setView] = useState<View>('dashboard');
  const [draftToEdit, setDraftToEdit] = useState<Draft | null>(null);
  const { t } = useLocalization();
  
  if (!userProfile) return null;

  const handleEditDraft = (draft: Draft) => {
    setDraftToEdit(draft);
    setView('submit');
  };

  const clearDraftToEdit = () => {
    setDraftToEdit(null);
  };

  const handleBack = () => {
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      {!isOnline && (
        <div className="bg-yellow-500 text-center text-white p-2 text-sm font-semibold">
          {t('offlineMessage')}
        </div>
      )}
      <Header user={userProfile} onLogout={logout} view={view} onBack={handleBack} />
      <main className="flex-grow p-4 pb-20">
        {view === 'submit' && <SubmitGrievance setActiveView={setView} draftToEdit={draftToEdit} clearDraftToEdit={clearDraftToEdit} />}
        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'drafts' && <Drafts setView={setView} onEditDraft={handleEditDraft} />}
        {view === 'nearby' && <NearbyTickets />}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 p-3 text-center transition-colors duration-200 ${view === 'dashboard' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-current={view === 'dashboard'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-xs font-medium">{t('dashboard')}</span>
          </button>
          <button
            onClick={() => setView('nearby')}
            className={`flex-1 p-3 text-center transition-colors duration-200 ${view === 'nearby' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-current={view === 'nearby'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">{t('nearby')}</span>
          </button>
          <button
            onClick={() => setView('drafts')}
            className={`flex-1 p-3 text-center transition-colors duration-200 ${view === 'drafts' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-current={view === 'drafts'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs font-medium">{t('drafts')}</span>
          </button>
          <button
            onClick={() => setView('submit')}
            className={`flex-1 p-3 text-center transition-colors duration-200 ${view === 'submit' ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            aria-current={view === 'submit'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium">{t('newGrievance')}</span>
          </button>
        </div>
      </nav>
      <Chatbot />
    </div>
  );
}

function AppContent() {
  const { user, userProfile, loading } = useAuth();
  const { t } = useLocalization();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">{t('loadingApp')}</p>
      </div>
    );
  }

  // If user is not logged in OR has not created a profile, show the onboarding flow.
  if (!user || !userProfile) {
    return <Onboarding />;
  }
  
  // Once authenticated with a profile, show the main application.
  return <MainApp />;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const storedLang = localStorage.getItem('app-lang');
    return (storedLang as Language) || 'en';
  });

  const localizationContextValue = useMemo(() => {
    const setLanguageAndStore = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('app-lang', lang);
    };

    const t = (key: string) => {
      const keys = key.split('.');
      let result: any = translations[language];
      for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
          return key;
        }
      }
      return result;
    };

    return { language, setLanguage: setLanguageAndStore, t };
  }, [language]);

  return (
    <LocalizationProvider value={localizationContextValue}>
      <AppContent />
    </LocalizationProvider>
  );
}