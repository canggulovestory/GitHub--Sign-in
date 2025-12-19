import { createClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Cloud sync will be disabled.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            autoRefreshToken: true, // Auto refresh token
            persistSession: true, // Persist session in local storage
            detectSessionInUrl: false,  // Disable auto-detection to prevent race conditions with manual handling
            flowType: 'implicit'       // Use implicit flow for SPA
        }
    }
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// --- AUTH HELPER FUNCTIONS ---

/**
 * Sign in with Google OAuth via Supabase
 */
export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin  // Redirect back to app after auth
        }
    });
    if (error) throw error;
    return data;
};

/**
 * Sign out from Supabase
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * Get current session
 */
export const getSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * Listen for auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase Auth] Event:', event, 'User:', session?.user?.email);
        callback(session?.user || null);
    });
};

/**
 * Handle OAuth callback manually - bypasses the 120s stale token check
 * Call this on app load to recover session from URL hash
 */
export const handleOAuthCallback = async (): Promise<Session | null> => {
    // Check if we have OAuth tokens in the URL hash
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
        console.log('[Supabase Auth] No OAuth tokens in URL');
        return null;
    }

    console.log('[Supabase Auth] Found OAuth tokens in URL hash, attempting manual recovery...');

    try {
        // Parse hash parameters
        const hashParams = new URLSearchParams(hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (!access_token || !refresh_token) {
            console.log('[Supabase Auth] Missing tokens in hash');
            return null;
        }

        // Manually set the session (bypasses stale token check)
        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        if (error) {
            console.error('[Supabase Auth] Manual session set failed:', error.message);
            return null;
        }

        // Clear the hash from URL to prevent re-processing
        window.history.replaceState(null, '', window.location.pathname);

        console.log('[Supabase Auth] Manual session recovery successful:', data.session?.user?.email);
        return data.session;
    } catch (e) {
        console.error('[Supabase Auth] OAuth callback error:', e);
        return null;
    }
};
