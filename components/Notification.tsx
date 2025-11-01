import React, { useState, useEffect } from 'react';

interface NotificationProps {
  message: string;
}

// Fix: Explicitly type component as React.FC to resolve issue with 'key' prop.
const Notification: React.FC<NotificationProps> = ({ message }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000); // Notification stays for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } bg-green-500 text-white font-bold rounded-lg shadow-lg p-4 max-w-sm`}
    >
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default Notification;
