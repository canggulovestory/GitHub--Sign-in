
import React, { useState } from 'react';
import { Trip } from '../types';
import { Calendar, MapPin, ArrowRight, FileText, CheckCircle2, Clock, History, Plane } from 'lucide-react';

interface TripListProps {
    trips: Trip[];
    activeTripId: string;
    onSelectTrip: (tripId: string) => void;
    onOpenDocuments: (tripId: string) => void;
    onAddNew: () => void;
}

export const TripList: React.FC<TripListProps> = ({ trips, activeTripId, onSelectTrip, onOpenDocuments, onAddNew }) => {
    const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('all');

    const filteredTrips = trips.filter(t => {
        if (filter === 'all') return true;
        return t.status === filter;
    });

    return (
        <div className="h-full flex flex-col space-y-4 pb-20 overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-dynac-darkChoc">My Trips</h2>
                <button
                    onClick={onAddNew}
                    className="text-xs bg-dynac-lightBrown text-dynac-cream px-3 py-2 rounded-lg font-bold hover:opacity-90 transition"
                >
                    + New Trip
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-dynac-sand/30 p-1 rounded-lg">
                {['all', 'active', 'upcoming', 'past'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${filter === f ? 'bg-white text-dynac-lightBrown shadow-sm' : 'text-dynac-nutBrown hover:text-dynac-darkChoc'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredTrips.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-dynac-sand rounded-3xl bg-dynac-cream/50 mt-4">
                        <div className="w-24 h-24 bg-dynac-sand/50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Plane size={48} className="text-dynac-lightBrown opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-dynac-darkChoc mb-2">
                            {filter === 'all' ? "Ready for takeoff? ✈️" : `No ${filter} trips found`}
                        </h3>
                        <p className="text-dynac-nutBrown mb-8 max-w-xs">
                            {filter === 'all'
                                ? "Your passport looks lonely. Let's create your first adventure!"
                                : "Try changing the filter or create a new trip."}
                        </p>
                        <button
                            onClick={onAddNew}
                            className="bg-dynac-lightBrown text-dynac-cream px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-3"
                        >
                            <Calendar className="w-5 h-5" />
                            {filter === 'all' ? "Plan My First Trip" : "+ Create New Trip"}
                        </button>
                    </div>
                )}

                {filteredTrips.map(trip => (
                    <div
                        key={trip.id}
                        className={`group relative overflow-hidden rounded-2xl border transition-all ${trip.id === activeTripId
                            ? 'border-dynac-lightBrown ring-1 ring-dynac-lightBrown shadow-lg'
                            : 'border-dynac-sand hover:border-dynac-lightBrown/30'
                            }`}
                    >
                        {/* Background Image with Gradient */}
                        <div className="h-32 w-full relative">
                            <img src={trip.image} alt={trip.destination} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${trip.status === 'active' ? 'bg-green-500 text-white' :
                                    trip.status === 'upcoming' ? 'bg-blue-500 text-white' :
                                        'bg-gray-500 text-gray-200'
                                    }`}>
                                    {trip.status === 'active' && <Clock size={10} />}
                                    {trip.status === 'upcoming' && <Calendar size={10} />}
                                    {trip.status === 'past' && <History size={10} />}
                                    {trip.status}
                                </span>
                            </div>

                            {/* Trip Title overlay */}
                            <div className="absolute bottom-3 left-4 text-white">
                                <h3 className="font-bold text-lg leading-tight">{trip.name}</h3>
                                <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5">
                                    <MapPin size={12} /> {trip.destination}
                                </div>
                            </div>
                        </div>

                        {/* Content & Actions */}
                        <div className="bg-white p-4">
                            <div className="flex justify-between items-center mb-4 text-xs text-dynac-nutBrown">
                                <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                                </span>
                                {trip.id === activeTripId && (
                                    <span className="text-dynac-lightBrown font-bold flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Currently Viewing
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSelectTrip(trip.id)}
                                    className="flex-1 bg-dynac-lightBrown text-dynac-cream py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-dynac-deepBrown transition-colors"
                                >
                                    {trip.id === activeTripId ? 'View Dashboard' : 'Open Itinerary'}
                                    <ArrowRight size={14} />
                                </button>
                                <button
                                    onClick={() => onOpenDocuments(trip.id)}
                                    className="w-1/3 bg-dynac-sand/30 text-dynac-darkChoc border border-dynac-sand py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-dynac-sand transition-colors"
                                >
                                    <FileText size={14} />
                                    Docs
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
