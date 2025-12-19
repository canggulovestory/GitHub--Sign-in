
import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, User, Loader2, ScanFace, Mail, Lock as LockIcon, ChevronLeft, AlertCircle } from 'lucide-react';
import { BiometricLayer } from './BiometricLayer';
import { UserProfile } from '../types';
import { signInWithGoogle, supabase } from '../services/supabase';

interface LoginPageProps {
  onLogin: (profile: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'landing' | 'form' | 'processing' | 'biometric'>('landing');
  const [error, setError] = useState<string | null>(null);

  // Registration Form State (for email/password backup)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  // --- SUPABASE AUTH: Handle Google Sign-In ---
  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setStep('processing');
      console.log("[Supabase Auth] Starting Google OAuth...");

      // This redirects to Google, then back to our app
      await signInWithGoogle();

      // Note: The page will redirect, so we won't reach here immediately
      // The auth state listener in App.tsx will handle the session
    } catch (err: any) {
      console.error("[Supabase Auth] Error:", err);
      setError(err.message || "Failed to sign in with Google");
      setStep('form');
    }
  };

  // --- MANUAL AUTH (Email/Password via Supabase) ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('processing');

    try {
      if (authMode === 'signup') {
        // Sign up with email/password
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: `${formData.firstName} ${formData.lastName}`
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          // Email confirmation required
          setError("Check your email to confirm your account!");
          setStep('form');
          return;
        }

      } else {
        // Sign in with email/password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;
      }

      // Auth state listener in App.tsx will handle the session
    } catch (err: any) {
      console.error("[Supabase Auth] Error:", err);
      setError(err.message || "Authentication failed");
      setStep('form');
    }
  };

  if (step === 'biometric') {
    return (
      <BiometricLayer
        onSuccess={() => { /* Re-auth logic would go here */ }}
        reason="Quick Re-Entry (Face ID)"
      />
    );
  }

  return (
    <div className="min-h-screen bg-dynac-deepBrown flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-dynac-lightBrown/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-dynac-sand/10 rounded-full blur-[80px]" />

      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-dynac-cream rounded-xl flex items-center justify-center text-dynac-deepBrown mb-4 shadow-lg">
            <span className="font-bold text-3xl">G</span>
          </div>
          <h1 className="text-3xl font-normal text-dynac-cream tracking-tight">
            G<span className="font-bold">AI</span>DE
          </h1>
          <p className="text-dynac-sand/60 text-sm mt-1">AI Travel Operating System</p>
        </div>

        {step === 'processing' && (
          <div className="py-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <Loader2 size={48} className="text-dynac-sand animate-spin mb-4" />
            <p className="text-dynac-sand text-sm font-medium">Verifying Credentials...</p>
            <div className="text-[10px] text-dynac-sand/40 mt-2 font-mono">Connecting to Identity Provider</div>
          </div>
        )}

        {step === 'landing' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">

            {isReturningUser && (
              <button
                onClick={() => setStep('biometric')}
                className="w-full bg-dynac-lightBrown text-dynac-cream border border-dynac-sand/20 font-bold py-4 px-4 rounded-xl flex items-center justify-between hover:bg-dynac-lightBrown/80 transition-all shadow-lg group relative overflow-hidden"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg"><ScanFace size={24} /></div>
                  <div className="text-left">
                    <div className="text-sm text-dynac-sand">Welcome back</div>
                    <div className="text-lg leading-none">Unlock with Face ID</div>
                  </div>
                </div>
                <ArrowRight size={20} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-dynac-sand/40">{isReturningUser ? 'Or' : 'Get Started'}</span></div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setAuthMode('login'); setStep('form'); }}
                className="w-full bg-white text-dynac-darkChoc font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-md"
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setStep('form'); }}
                className="w-full bg-transparent border border-dynac-sand/30 text-dynac-cream font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
              >
                Create New Account
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="animate-in slide-in-from-right duration-300">
            <button onClick={() => setStep('landing')} className="flex items-center text-dynac-sand/60 hover:text-dynac-sand text-xs mb-4">
              <ChevronLeft size={14} /> Back
            </button>

            <h2 className="text-xl font-bold text-dynac-cream mb-6">
              {authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </h2>

            {/* --- GOOGLE SIGN IN VIA SUPABASE --- */}
            <div className="mb-6">
              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {error && (
                <div className="mt-3 text-xs text-red-400 text-center bg-red-500/10 p-3 rounded border border-red-500/20 flex items-center gap-2 justify-center">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
            {/* ------------------------------- */}

            <div className="relative py-2 mb-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-dynac-deepBrown px-2 text-dynac-sand/40">Or continue with email</span></div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="flex gap-3">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs text-dynac-sand/60 ml-1">First Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dynac-sand/40" />
                      <input
                        type="text" required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-dynac-cream text-sm focus:border-dynac-sand/50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-xs text-dynac-sand/60 ml-1">Last Name</label>
                    <input
                      type="text" required
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-dynac-cream text-sm focus:border-dynac-sand/50 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-dynac-sand/60 ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dynac-sand/40" />
                  <input
                    type="email" required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-dynac-cream text-sm focus:border-dynac-sand/50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-dynac-sand/60 ml-1">Password</label>
                <div className="relative">
                  <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dynac-sand/40" />
                  <input
                    type="password" required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-dynac-cream text-sm focus:border-dynac-sand/50 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-dynac-lightBrown text-dynac-cream font-bold py-3 rounded-xl mt-4 hover:bg-dynac-lightBrown/80 transition-colors shadow-lg border border-dynac-sand/10"
              >
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

          </div>
        )}

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-dynac-sand/40 text-xs">
            <Sparkles size={12} />
            <span>Secure Identity Management ID 001</span>
          </div>
        </div>
      </div>
    </div>
  );
};
