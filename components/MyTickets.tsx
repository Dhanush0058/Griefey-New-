import React from 'react';
import useTickets from '../hooks/useTickets';
import TicketCard from './TicketCard';
import useLocalization from '../hooks/useLocalization';
import Notification from './Notification';
import { Complaint, ComplaintStatus } from '../types';
import useDepartments from '../hooks/useDepartments';

interface MyTicketsProps {
  setView: (view: 'submit' | 'tickets' | 'drafts' | 'nearby') => void;
}

export default function MyTickets({ setView }: MyTicketsProps) {
  const { tickets, notifications } = useTickets();
  const { departments } = useDepartments();
  const { t } = useLocalization();

  const sortedTickets = [...tickets]
    .filter(ticket => ticket.status !== ComplaintStatus.Duplicate)
    .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

  return (
    <div className="max-w-4xl mx-auto">
       <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map((msg, index) => (
          <Notification key={index} message={msg} />
        ))}
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('myTickets')}</h2>
      {sortedTickets.length > 0 ? (
        <div className="space-y-4">
          {sortedTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket as Complaint} departments={departments} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('myTickets')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('noTickets')}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setView('submit')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {t('fileFirstGrievance')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
