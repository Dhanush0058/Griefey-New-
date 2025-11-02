import React, { useState, useEffect } from 'react';
import useLocalization from '../hooks/useLocalization';
import { Draft } from '../types';

interface DraftsProps {
  // Fix: Aligned the view types with the main App's View type.
  setView: (view: 'submit' | 'dashboard' | 'drafts' | 'nearby') => void;
  onEditDraft: (draft: Draft) => void;
}

export default function Drafts({ setView, onEditDraft }: DraftsProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const { t } = useLocalization();

  useEffect(() => {
    const savedDrafts = JSON.parse(localStorage.getItem('grievance-drafts') || '[]') as Draft[];
    setDrafts(savedDrafts.sort((a, b) => parseInt(b.draftId) - parseInt(a.draftId)));
  }, []);

  const handleDeleteDraft = (draftId: string) => {
    const newDrafts = drafts.filter(d => d.draftId !== draftId);
    setDrafts(newDrafts);
    localStorage.setItem('grievance-drafts', JSON.stringify(newDrafts));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('drafts')}</h2>
      {drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map(draft => (
            <div key={draft.draftId} className="bg-white rounded-lg shadow-md p-4 transition-shadow hover:shadow-lg">
              <p className="font-bold text-gray-800">{draft.title || '(No title)'}</p>
              <p className="text-sm text-gray-600 truncate mt-1">{draft.description || '(No description)'}</p>
              <div className="mt-4 flex justify-end space-x-4">
                <button onClick={() => onEditDraft(draft)} className="text-sm font-medium text-blue-600 hover:underline">{t('editDraft')}</button>
                <button onClick={() => handleDeleteDraft(draft.draftId)} className="text-sm font-medium text-red-600 hover:underline">{t('deleteDraft')}</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noDrafts')}</h3>
          <p className="mt-1 text-sm text-gray-500">You can save a complaint as a draft to finish it later.</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setView('submit')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {t('fileNewGrievance')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}