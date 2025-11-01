import React from 'react';
import useLocalization from '../hooks/useLocalization';
import { AddTicketResult } from '../hooks/useTickets';

interface ConfirmationModalProps {
  result: AddTicketResult | null;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ result, onClose }) => {
  const { t } = useLocalization();

  if (!result) return null;
  
  const isDuplicate = result.duplicate;
  const ticketId = isDuplicate ? result.parentTicketId : result.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isDuplicate ? 'bg-blue-100' : 'bg-green-100'} mb-4`}>
          <svg className={`h-6 w-6 ${isDuplicate ? 'text-blue-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isDuplicate ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            )}
          </svg>
        </div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">{isDuplicate ? t('duplicateDetectedTitle') : t('confirmSubmissionTitle')}</h3>
        <div className="mt-2 px-7 py-3">
          <p className="text-sm text-gray-500">{isDuplicate ? t('duplicateDetectedMessage') : t('confirmSubmissionMessage')}</p>
          <p className="text-lg font-mono font-bold text-gray-800 my-2 break-all">{ticketId}</p>
        </div>
        <div className="items-center px-4 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
