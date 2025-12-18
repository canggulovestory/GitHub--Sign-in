
import React, { useEffect, useState } from 'react';
import { ScanFace, Fingerprint, Lock, CheckCircle2 } from 'lucide-react';

interface BiometricLayerProps {
  onSuccess: () => void;
  reason: string; // e.g., "Secure Login" or "Accessing Document Hub"
}

export const BiometricLayer: React.FC<BiometricLayerProps> = ({ onSuccess, reason }) => {
  const [status, setStatus] = useState<'scanning' | 'success' | 'failed'>('scanning');

  useEffect(() => {
    // Simulate biometric delay
    const timer = setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 800);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onSuccess]);

  return (
    <div className="absolute inset-0 z-50 bg-dynac-cream/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-dynac-sand flex flex-col items-center max-w-sm w-full relative overflow-hidden">
        
        {/* Scanning Animation */}
        <div className="relative mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 ${status === 'success' ? 'bg-green-100 text-green-600' : 'bg-dynac-sand/30 text-dynac-lightBrown'}`}>
             {status === 'success' ? <CheckCircle2 size={48} /> : <ScanFace size={48} />}
          </div>
          
          {status === 'scanning' && (
             <div className="absolute inset-0 border-4 border-dynac-lightBrown/20 rounded-full animate-ping" />
          )}
          {status === 'scanning' && (
             <div className="absolute inset-0 w-full h-1 bg-dynac-lightBrown/50 top-1/2 -translate-y-1/2 animate-[scan_1.5s_ease-in-out_infinite]" />
          )}
        </div>

        <h3 className="text-xl font-bold text-dynac-darkChoc mb-2">
          {status === 'success' ? 'Verified' : 'GAIDE Security'}
        </h3>
        <p className="text-dynac-nutBrown text-sm text-center mb-6">
          {status === 'success' ? 'Identity confirmed.' : reason}
        </p>

        <div className="flex items-center gap-2 text-xs text-dynac-sand/80 uppercase tracking-widest font-bold">
          <Lock size={12} />
          ID 070 Biometric Gate
        </div>
      </div>
    </div>
  );
};
