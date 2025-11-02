import React, { useState } from 'react';
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

const StatusStepper = ({ currentStatus }: { currentStatus: ComplaintStatus }) => {
    const { t } = useLocalization();
    const steps: ComplaintStatus[] = [ComplaintStatus.Submitted, ComplaintStatus.InProgress, ComplaintStatus.Resolved];
    const currentStepIndex = steps.indexOf(currentStatus);

    return (
        <div className="flex items-center justify-between w-full mt-4">
            {steps.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                const isActive = currentStepIndex === index;
                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                {isCompleted ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            <p className={`mt-2 text-xs font-medium ${isCompleted ? 'text-blue-600' : 'text-gray-500'}`}>{t(step)}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


const TicketCard: React.FC<TicketCardProps> = ({ ticket, departments, showUpvote = false, onUpvote }) => {
  const { t } = useLocalization();
  const { upvoteTicket } = useTickets();
  const { userProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  
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
    <div 
        className="bg-white rounded-lg shadow-md transition-all duration-300 hover:shadow-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <div>
            <p className="font-bold text-gray-800 text-lg">{ticket.title}</p>
            <p className="text-sm text-gray-500">{t('ticketID')}: <span className="font-mono">{ticket.id}</span></p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[ticket.status]}`}>
            {getStatusTranslation(ticket.status)}
            </span>
        </div>
        {!isExpanded && <p className="text-gray-700 my-4 break-words truncate">{ticket.description_original}</p>}
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 pt-0">
            <p className="text-gray-700 my-4 break-words">{ticket.description_original}</p>
            <StatusStepper currentStatus={ticket.status} />
            {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 my-4">
                {ticket.attachments.map((url, index) => (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
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
            <div className="border-t pt-2 mt-4 text-sm text-gray-500 space-y-1">
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
            </div>

            {/* Placeholder sections for Updates and Comments */}
            <div className="mt-4 space-y-4">
                {/* Official Updates */}
                <div>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">{t('officialUpdates')}</h4>
                    <p className="text-xs text-gray-500 italic">{t('noUpdates')}</p>
                </div>
                {/* Public Comments */}
                <div>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">{t('publicComments')}</h4>
                    <p className="text-xs text-gray-500 italic mb-2">{t('noComments')}</p>
                    <div className="flex items-center space-x-2">
                        <input type="text" placeholder={t('addComment')} className="flex-grow border border-gray-300 rounded-full py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button className="bg-blue-500 text-white rounded-full p-2 text-xs hover:bg-blue-600">Submit</button>
                    </div>
                </div>
            </div>

        </div>
      </div>
      <div className="border-t p-2">
        <div className="flex justify-between items-center px-2">
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