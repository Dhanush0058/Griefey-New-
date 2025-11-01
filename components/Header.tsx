import React from 'react';
import type { User, Language } from '../types';
import useLocalization from '../hooks/useLocalization';

type View = 'submit' | 'tickets' | 'drafts' | 'nearby';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  view: View;
  onBack: () => void;
}

export default function Header({ user, onLogout, view, onBack }: HeaderProps) {
  const { language, setLanguage, t } = useLocalization();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
           {view !== 'tickets' && (
            <button onClick={onBack} aria-label="Go back" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800">{t('loginTitle')}</h1>
            <p className="text-sm text-gray-500">{t('welcome')}, {user.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={language}
            onChange={handleLanguageChange}
            className="bg-gray-100 border-gray-300 rounded-md text-sm p-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button 
            onClick={onLogout}
            className="text-sm text-blue-600 hover:underline"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
