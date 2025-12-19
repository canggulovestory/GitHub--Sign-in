
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
        console.log(`[Storage] ✅ Saved local backup for ${email}`);
    } catch (e) {
        console.error("[Storage] ❌ Failed to save local data", e);
    }

    // Cloud Sync
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    console.log(`[Storage] Cloud sync enabled: ${useCloud}, Supabase configured: ${isSupabaseConfigured}`);

    if (useCloud && isSupabaseConfigured) {
        try {
            // CRITICAL: Verify we have an authenticated session before trying to sync
            // RLS policy requires auth.email() to match, so we need a valid session
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (!session) {
                console.warn(`[Storage] ⚠️ No Supabase session - skipping cloud sync. User must log in.`);
                return;
            }

            const authEmail = session.user?.email;
            if (authEmail !== email) {
                console.warn(`[Storage] ⚠️ Session email (${authEmail}) doesn't match save email (${email}) - skipping sync`);
                return;
            }

            console.log(`[Storage] 🔄 Syncing to Supabase for ${email} (auth verified)...`);
            const { data: result, error } = await supabase
                .from('user_data')
                .upsert({
                    email,
                    data,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'email' })
                .select();

            if (error) {
                console.error("[Storage] ❌ Supabase Error Details:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }
            console.log(`[Storage] ✅ Successfully synced to Supabase for ${email}`, result);
        } catch (e: any) {
            console.error("[Storage] ❌ Failed to sync to Supabase:", e?.message || e);
        }
    } else {
        console.warn("[Storage] ⚠️ Cloud sync skipped - not enabled or Supabase not configured");
    }
};

export const loadUserData = async (email: string): Promise<AppData | null> => {
    if (!email) return null;

    // Try Cloud first if enabled
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    console.log(`[Storage] Load attempt for ${email} - Cloud enabled: ${useCloud}, Supabase configured: ${isSupabaseConfigured}`);

    if (useCloud && isSupabaseConfigured) {
        try {
            // Verify we have an authenticated session
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;

            if (!session) {
                console.warn(`[Storage] ⚠️ No Supabase session - cannot load from cloud. Will use local cache.`);
            } else {
                const authEmail = session.user?.email;
                if (authEmail !== email) {
                    console.warn(`[Storage] ⚠️ Session email (${authEmail}) doesn't match request email (${email})`);
                } else {
                    console.log(`[Storage] 🔄 Loading from Supabase (auth verified)...`);
                    const { data, error } = await supabase
                        .from('user_data')
                        .select('data')
                        .eq('email', email)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                        console.error("[Storage] ❌ Supabase load error:", {
                            message: error.message,
                            code: error.code,
                            details: error.details,
                            hint: error.hint
                        });
                    }

                    if (data?.data) {
                        console.log(`[Storage] ✅ Loaded data from Supabase for ${email}`);
                        // Update local cache
                        localStorage.setItem(`${STORAGE_PREFIX}${email}`, JSON.stringify(data.data));
                        return data.data as AppData;
                    } else {
                        console.log(`[Storage] ℹ️ No data found in Supabase for ${email}`);
                    }
                }
            }
        } catch (e: any) {
            console.error("[Storage] ❌ Failed to load from Supabase:", e?.message || e);
        }
    }

    // Fallback to Local Storage
    try {
        const data = localStorage.getItem(`${STORAGE_PREFIX}${email}`);
        if (data) {
            console.log(`[Storage] ✅ Loaded data from local cache for ${email}`);
            return JSON.parse(data);
        } else {
            console.log(`[Storage] ℹ️ No local data found for ${email}`);
        }
    } catch (e) {
        console.error("[Storage] ❌ Failed to load local data", e);
    }

    return null;
};
