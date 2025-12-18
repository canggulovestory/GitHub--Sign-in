
import { Trip, DocumentFile, UserPreferences, Traveler, ChatMessage, ChecklistItem, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

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

export const saveUserData = async (email: string, data: AppData) => {
    if (!email) return;

    // Always save to local storage as backup/cache
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${email}`, JSON.stringify(data));
        console.log(`[Storage] Saved local backup for ${email}`);
    } catch (e) {
        console.error("[Storage] Failed to save local data", e);
    }

    // Cloud Sync
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    if (useCloud && isSupabaseConfigured) {
        try {
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    email,
                    data,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'email' });

            if (error) throw error;
            console.log(`[Storage] Synced data to Supabase for ${email}`);
        } catch (e) {
            console.error("[Storage] Failed to sync to Supabase", e);
        }
    }
};

export const loadUserData = async (email: string): Promise<AppData | null> => {
    if (!email) return null;

    // Try Cloud first if enabled
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    if (useCloud && isSupabaseConfigured) {
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.warn("[Storage] Supabase load error:", error);
            }

            if (data?.data) {
                console.log(`[Storage] Loaded data from Supabase for ${email}`);
                // Update local cache
                localStorage.setItem(`${STORAGE_PREFIX}${email}`, JSON.stringify(data.data));
                return data.data as AppData;
            }
        } catch (e) {
            console.error("[Storage] Failed to load from Supabase", e);
        }
    }

    // Fallback to Local Storage
    try {
        const data = localStorage.getItem(`${STORAGE_PREFIX}${email}`);
        if (data) {
            console.log(`[Storage] Loaded data from local cache for ${email}`);
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("[Storage] Failed to load local data", e);
    }

    return null;
};
