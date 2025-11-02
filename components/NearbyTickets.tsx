import React, { useState, useEffect } from 'react';
import useTickets from '../hooks/useTickets';
import useLocalization from '../hooks/useLocalization';
import type { Complaint } from '../types';
import TicketCard from './TicketCard';
import useDepartments from '../hooks/useDepartments';
import Spinner from './Spinner';
import useAuth from '../hooks/useAuth';

const NearbyTickets = () => {
    const [nearbyTickets, setNearbyTickets] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const { getNearbyTickets } = useTickets();
    const { departments } = useDepartments();
    const { t } = useLocalization();
    const { userProfile } = useAuth();
    const [mapSrc, setMapSrc] = useState('');


    useEffect(() => {
        let isMounted = true;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    
                    const latDelta = 0.01;
                    const lngDelta = 0.01;
                    const bbox = `${location.lng - lngDelta},${location.lat - latDelta},${location.lng + lngDelta},${location.lat + latDelta}`;
                    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lng}`;
                    
                    if (isMounted) {
                        setMapSrc(mapUrl);
                    }

                    const tickets = await getNearbyTickets(location);
                    if (isMounted) {
                        setNearbyTickets(tickets);
                        setIsLoading(false);
                    }
                },
                () => {
                    if (isMounted) {
                        setLocationError(t('locationError'));
                        setIsLoading(false);
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
             if (isMounted) {
                setLocationError('Geolocation is not supported by this browser.');
                setIsLoading(false);
             }
        }
        return () => { isMounted = false; };
    }, [getNearbyTickets, t]);

    const handleUpvoteInNearby = (ticketId: string, newUpvotedStatus: boolean) => {
      if (!userProfile) return;
    
      setNearbyTickets(prevTickets =>
        prevTickets.map(ticket => {
          if (ticket.id === ticketId) {
            const newUpvoteCount = newUpvotedStatus
              ? ticket.upvote_count + 1
              : ticket.upvote_count - 1;
            
            const newUpvotedBy = newUpvotedStatus
              ? [...(ticket.upvotedBy || []), userProfile.uid]
              : (ticket.upvotedBy || []).filter(uid => uid !== userProfile.uid);
              
            return {
              ...ticket,
              upvote_count: newUpvoteCount < 0 ? 0 : newUpvoteCount, // Ensure count doesn't go below 0
              upvotedBy: newUpvotedBy,
            };
          }
          return ticket;
        })
      );
    };

    if (isLoading) {
        return (
            <div className="text-center p-8 flex flex-col items-center justify-center text-gray-500">
                <Spinner />
                <p className="mt-2">{t('loading')}...</p>
            </div>
        );
    }
    
    if (locationError) {
        return <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg">{locationError}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('nearby')}</h2>

            {mapSrc && (
                <div className="mb-6 rounded-lg overflow-hidden shadow-md">
                    <iframe
                        width="100%"
                        height="300"
                        src={mapSrc}
                        style={{ border: 0 }}
                        loading="lazy"
                        aria-hidden="false"
                        tabIndex={0}
                        title="Map of nearby complaints"
                    ></iframe>
                </div>
            )}
            
            {nearbyTickets.length > 0 ? (
                <div className="space-y-4">
                    {nearbyTickets.map(ticket => (
                        <TicketCard 
                            key={ticket.id} 
                            ticket={ticket} 
                            departments={departments} 
                            showUpvote={true} 
                            onUpvote={handleUpvoteInNearby}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
                     <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noNearbyTickets')}</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no other complaints reported within a 1km radius in the last 7 days.</p>
                </div>
            )}
        </div>
    );
};

export default NearbyTickets;