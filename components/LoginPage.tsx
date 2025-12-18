
import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, User, Loader2, ScanFace, Mail, Lock as LockIcon, ChevronLeft, AlertCircle } from 'lucide-react';
import { BiometricLayer } from './BiometricLayer';
import { UserProfile } from '../types';
import { jwtDecode } from "jwt-decode";

interface LoginPageProps {
  onLogin: (profile: UserProfile) => void;
}

// Google Client ID from environment variables
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || "";

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'landing' | 'form' | 'processing' | 'biometric'>('landing');

  // Registration Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  // --- GOOGLE SCRIPT LOADER ---
  useEffect(() => {
    // Check if script is already loaded from index.html
    const checkGsi = setInterval(() => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.google && window.google.accounts) {
        setIsGsiLoaded(true);
        clearInterval(checkGsi);
      }
    }, 200);

    // Timeout to stop checking after 10 seconds to avoid infinite loop if script fails
    const timeout = setTimeout(() => {
      clearInterval(checkGsi);
    }, 10000);

    return () => {
      clearInterval(checkGsi);
      clearTimeout(timeout);
    };
  }, []);

  // --- REAL GOOGLE AUTH HANDLER ---
  const handleGoogleCredentialResponse = (response: any) => {
    try {
      setStep('processing');
      console.log("[Google Auth] Received Credential");

      // Decode the JWT Token returned by Google
      const decoded: any = jwtDecode(response.credential);

      // Map Google Profile to App Profile
      const userProfile: UserProfile = {
        id: `GOOGLE-${decoded.sub}`,
        name: decoded.name || (decoded.given_name ? `${decoded.given_name} ${decoded.family_name}` : 'Google User'),
        email: decoded.email,
        avatarUrl: decoded.picture,
        subscriptionTier: 'Free', // Default tier
        biometricEnabled: true,   // Trust Google auth for biometric readiness
        isAuthenticated: true
      };

      // Complete Login
      onLogin(userProfile);

    } catch (error) {
      console.error("Google Auth Error:", error);
      alert("Failed to process Google Sign-In.");
      setStep('form');
    }
  };

  // --- RENDER GOOGLE BUTTON ---
  useEffect(() => {
    // Only render if script loaded and we are in the form step
    if (isGsiLoaded && step === 'form') {
      if (!GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID is missing. Google Sign-In disabled.");
        return;
      }

      try {
        // @ts-ignore
        const google = window.google;

        // Initialize the library
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnContainer = document.getElementById("googleBtnContainer");
        if (btnContainer) {
          btnContainer.innerHTML = ''; // Clear previous

          // Render the button
          google.accounts.id.renderButton(
            btnContainer,
            {
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: "100%" // Adapts to container width
            }
          );
        }
      } catch (e) {
        console.error("GSI Render Error", e);
      }
    }
  }, [step, authMode, isGsiLoaded]);

  // --- MANUAL AUTH (FALLBACK) ---
  const mockBackendAuth = async (data: any): Promise<UserProfile> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `USER-${Date.now()}`,
          email: data.email,
          name: data.firstName ? `${data.firstName} ${data.lastName}` : 'Traveler',
          subscriptionTier: 'Free',
          biometricEnabled: false,
          isAuthenticated: true,
          avatarUrl: `https://ui-avatars.com/api/?name=${data.email}&background=random`
        });
      }, 1500);
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    const userProfile = await mockBackendAuth(formData);
    onLogin(userProfile);
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

            {/* --- GOOGLE SIGN IN SECTION --- */}
            <div className="mb-6">
              <div className="space-y-3 w-full">
                {/* The Google Button Container */}
                {GOOGLE_CLIENT_ID ? (
                  <div id="googleBtnContainer" className="w-full flex justify-center"></div>
                ) : (
                  <div className="text-xs text-red-400 text-center bg-red-500/10 p-3 rounded border border-red-500/20">
                    Google Login Config Missing<br />
                    <span className="opacity-70 text-[10px]">Add VITE_GOOGLE_CLIENT_ID to .env</span>
                  </div>
                )}
              </div>
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
