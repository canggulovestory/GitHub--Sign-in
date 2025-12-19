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
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true  // Re-enable to let Supabase handle the code/token
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
}

console.log('[Supabase Auth] Found OAuth parameters, waiting for Supabase to process...');

try {
    // If it's a code (PKCE), Supabase's internal auth listener usually handles it,
    // but we can try to get the session explicitly to be sure.
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('[Supabase Auth] Session retrieval error:', error.message);
        // If it's the "flow_state_not_found" or similar, it might be due to dual processing
        return null;
    }

    if (session) {
        console.log('[Supabase Auth] Manual session check successful:', session.user?.email);
        // Clear URL params/hash if Supabase didn't
        if (code) {
            url.searchParams.delete('code');
            window.history.replaceState(null, '', url.pathname);
        } else if (hash) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        return session;
    }

    return null;
} catch (e) {
    console.error('[Supabase Auth] OAuth callback processing error:', e);
    return null;
}
};
