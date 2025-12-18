
import { Trip, DocumentFile, UserPreferences, UserProfile, Traveler, ChecklistItem } from '../types';

export const generateAIStudioExport = (
    user: UserProfile,
    trips: Trip[],
    documents: DocumentFile[],
    preferences: UserPreferences,
    travelers: Traveler[],
    checklist: ChecklistItem[]
): string => {
    const exportData = {
        meta: {
            generatedAt: new Date().toISOString(),
            app: "GAIDE AI Travel OS",
            description: "User Context for AI Studio"
        },
        userProfile: {
            name: user.name,
            tier: user.subscriptionTier,
            travelers: travelers.map(t => ({ name: t.name, nationality: t.nationality, type: t.type }))
        },
        preferences: preferences,
        activeContext: {
            upcomingTrips: trips.filter(t => t.status === 'upcoming').map(t => ({
                destination: t.destination,
                dates: `${t.startDate} to ${t.endDate}`,
                itinerarySummary: t.itinerary.map(d => `${d.date}: ${d.location} (${d.items.length} items)`),
                currency: t.currency
            }))
        },
        documents: documents.map(d => ({
            type: d.type,
            name: d.name,
            status: d.status,
            expiry: d.expiry,
            scope: d.scope
        })),
        checklist: checklist
    };

    return JSON.stringify(exportData, null, 2);
};
