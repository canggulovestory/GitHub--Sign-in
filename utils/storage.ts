
import { Trip, DocumentFile, UserPreferences, Traveler, ChatMessage, ChecklistItem, UserProfile } from '../types';

export interface AppData {
    trips: Trip[];
    documents: DocumentFile[];
    preferences: UserPreferences;
    travelers: Traveler[];
    chatHistory: ChatMessage[];
    checklist: ChecklistItem[];
}

const SESSION_KEY = 'gaide_session_user';
const STORAGE_PREFIX = 'gaide_data_';

export const saveSession = (user: UserProfile) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): UserProfile | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
};

export const saveUserData = (email: string, data: AppData) => {
    if (!email) return;
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${email}`, JSON.stringify(data));
        console.log(`[Storage] Saved data for ${email}`);
    } catch (e) {
        console.error("[Storage] Failed to save data", e);
    }
};

export const loadUserData = (email: string): AppData | null => {
    if (!email) return null;
    try {
        const data = localStorage.getItem(`${STORAGE_PREFIX}${email}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("[Storage] Failed to load data", e);
        return null;
    }
};
