import React from 'react';
import type { Complaint, Department } from '../types';
import { ComplaintStatus } from '../types';
import useLocalization from '../hooks/useLocalization';
import useTickets from '../hooks/useTickets';
import useAuth from '../hooks/useAuth';

interface TicketCardProps {
  ticket: Complaint;
  departments: Department[];
  showUpvote?: boolean;
  onUpvote?: (ticketId: string, newUpvotedStatus: boolean) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, departments, showUpvote = false, onUpvote }) => {
  const { t } = useLocalization();
  const { upvoteTicket } = useTickets();
  const { userProfile } = useAuth();
  
  const hasUpvoted = userProfile ? ticket.upvotedBy?.includes(userProfile.uid) : false;

  const getStatusTranslation = (status: ComplaintStatus): string => {
    switch(status) {
        case ComplaintStatus.Submitted: return t('submitted');
        case ComplaintStatus.InProgress: return t('inProgress');
        case ComplaintStatus.Resolved: return t('resolved');
        case ComplaintStatus.Escalated: return t('escalated');
        case ComplaintStatus.Duplicate: return t('duplicate');
        default: return status;
    }
  }

  const statusColors: { [key in ComplaintStatus]: string } = {
    [ComplaintStatus.Submitted]: "bg-blue-100 text-blue-800",
    [ComplaintStatus.InProgress]: "bg-purple-100 text-purple-800",
    [ComplaintStatus.Resolved]: "bg-green-100 text-green-800",
    [ComplaintStatus.Escalated]: "bg-red-100 text-red-800",
    [ComplaintStatus.Duplicate]: "bg-gray-100 text-gray-800",
  };
  
  const departmentName = ticket.department_id 
    ? departments.find(d => d.id === ticket.department_id)?.name 
    : null;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await upvoteTicket(ticket.id);
    if (success && onUpvote) {
      onUpvote(ticket.id, !hasUpvoted);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 transition-shadow hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold text-gray-800 text-lg">{ticket.title}</p>
          <p className="text-sm text-gray-500">{t('ticketID')}: <span className="font-mono">{ticket.id}</span></p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[ticket.status]}`}>
          {getStatusTranslation(ticket.status)}
        </span>
      </div>
      <p className="text-gray-700 my-4 break-words">{ticket.description_original}</p>
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 my-2">
          {ticket.attachments.map((url, index) => (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={`Attachment ${index + 1}`} className="h-24 w-24 object-cover rounded-md hover:opacity-80 transition-opacity"/>
            </a>
          ))}
        </div>
      )}
      {ticket.location.address && (
        <p className="text-sm text-gray-600 mt-2">
          <span className="font-semibold">{t('address')}: </span>
          {ticket.location.address}
        </p>
      )}
      <div className="border-t pt-2 mt-2 text-sm text-gray-500 space-y-1">
        <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold">{t('category')}: </span>
              <span>{ticket.category}{ticket.subcategory ? ` / ${ticket.subcategory}` : ''}</span>
            </div>
            <span>{ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleDateString() : '...'}</span>
        </div>
        <div>
            <span className="font-semibold">{t('assignedDepartment')}: </span>
            <span>
                {ticket.department_id 
                    ? (departmentName || ticket.department_id)
                    : <span className="italic text-gray-400">{t('assigningDepartment')}</span>
                }
            </span>
        </div>
        {ticket.escalation_level > 0 && (
            <div className="flex justify-between items-center text-red-600 font-bold">
                <div>
                    <span className="font-semibold">{t('escalationLevel')}: </span>
                    <span>{ticket.escalation_level}</span>
                </div>
            </div>
        )}
        {ticket.status !== ComplaintStatus.Resolved && ticket.escalation_due && (
             <div className="flex justify-between items-center">
                <div>
                    <span className="font-semibold">{t('actionDue')}: </span>
                    <span>{new Date(ticket.escalation_due.toDate()).toLocaleString()}</span>
                </div>
            </div>
        )}
        <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-2 text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.787l.25.125a2 2 0 002.29-1.787v-5.43m3.08-1.78a2 2 0 001.74-1.74l.25-.125a2 2 0 00-2.29-1.787v5.43m-3.08-1.78a2 2 0 00-1.74-1.74l-.25-.125a2 2 0 002.29 1.787v-5.43" />
                </svg>
                <span className="font-semibold text-sm">{ticket.upvote_count}</span>
            </div>
            
            {showUpvote && userProfile && ticket.userUid !== userProfile.uid && (
              <button onClick={handleUpvote} className={`px-3 py-1 text-xs font-bold rounded-full flex items-center space-x-1 transition-colors ${hasUpvoted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                <span>{hasUpvoted ? t('upvoted') : t('upvote')}</span>
              </button>
            )}
          </div>
      </div>
    </div>
  );
};

export default TicketCard;