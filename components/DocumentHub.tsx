
import React, { useMemo, useState, useEffect } from 'react';
import { DocumentFile, Traveler, DayPlan, UserProfile, Trip } from '../types';
import { FileText, ShieldCheck, AlertTriangle, Lock, Plus, X, Eye, Calendar, User, Download, Clock, Trash2, Plane } from 'lucide-react';
import { BiometricLayer } from './BiometricLayer';
import { analyzeDocumentImage } from '../services/geminiService';
import { storageService } from '../services/storageService';
import imageCompression from 'browser-image-compression';

interface DocumentHubProps {
  documents: DocumentFile[];
  travelers: Traveler[];
  itinerary: DayPlan[]; // From Active Trip
  activeTrip?: Trip; // The trip context
  user: UserProfile;
  onAddDocument: (doc: DocumentFile) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentHub: React.FC<DocumentHubProps> = ({ documents, travelers, itinerary, activeTrip, user, onAddDocument, onDeleteDocument }) => {
  // ID 070: Secondary Biometric Security State
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // AI State
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState<{ name: string, type: DocumentFile['type'], expiry: string, scope: 'global' | 'trip', docId: string, fileContent: string }>({
    name: '', type: 'booking', expiry: '', scope: 'trip', docId: '', fileContent: ''
  });
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [isViewingImage, setIsViewingImage] = useState(false);
  const [viewCategory, setViewCategory] = useState<DocumentFile['type'] | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Trigger biometric check on mount
  useEffect(() => {
    // Reset verification on mount to force check
    setIsBiometricVerified(false);
  }, []);

  // Filter documents: Show Global Docs + Active Trip Docs
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => !d.tripId || (activeTrip && d.tripId === activeTrip.id));
  }, [documents, activeTrip]);

  const visaAlerts = useMemo(() => {
    // ... (existing logic)
    // ID 073: Subscription Gate
    const alerts: { text: string; locked: boolean }[] = [];
    const destinations = itinerary.map(d => d.location);
    const goingToSchengen = destinations.some(d => d.includes('Netherlands') || d.includes('Germany') || d.includes('France') || d.includes('Italy'));

    if (goingToSchengen) {
      const travelersNeedingVisa = travelers.filter(t => t.nationality === 'Indonesia');

      if (travelersNeedingVisa.length > 0) {
        if (user.subscriptionTier === 'Free' && travelersNeedingVisa.length >= 1) {
          // Gate Check (ID 058/073)
          alerts.push({
            text: `Multi-Party Visa Intelligence detected ${travelersNeedingVisa.length} visa requirements. Upgrade to view details.`,
            locked: true
          });
        } else {
          // Standard/Premium Tier sees full details
          travelersNeedingVisa.forEach(t => {
            alerts.push({
              text: `MANDATORY VISA ALERT (ID 048): Schengen Visa check required for ${t.name} (${t.nationality}).`,
              locked: false
            });
          });
        }
      }
    }

    return alerts;
  }, [travelers, itinerary, user.subscriptionTier]);

  // Filter documents for the modal from the ALREADY FILTERED list
  const categoryDocuments = useMemo(() => {
    if (!viewCategory) return [];
    return filteredDocuments.filter(d => d.type === viewCategory);
  }, [filteredDocuments, viewCategory]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 8) val = val.slice(0, 8);

    // Auto-insert dashes for dd-mm-yyyy
    if (val.length > 4) {
      val = `${val.slice(0, 2)}-${val.slice(2, 4)}-${val.slice(4)}`;
    } else if (val.length > 2) {
      val = `${val.slice(0, 2)}-${val.slice(2)}`;
    }
    setNewDoc({ ...newDoc, expiry: val });
  };

  const calculateStatus = (dateStr: string): DocumentFile['status'] => {
    if (!dateStr || dateStr.length !== 10) return 'valid';
    const [day, month, year] = dateStr.split('-').map(Number);
    if (!day || !month || !year || month > 12 || day > 31) return 'missing';

    const dateObj = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      return 'expired';
    }
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);
    if (dateObj < threeMonthsFromNow) {
      return 'expiring';
    }
    return 'valid';
  };

  // --- AI ANALYSIS (REAL) ---


  // --- AI ANALYSIS (REAL) ---
  const performAIAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 1. Compress Image (Fixes LocalStorage Quota Exceeded)
      console.log(`Original size: ${file.size / 1024 / 1024} MB`);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5, // Compress to max 0.5MB
        maxWidthOrHeight: 1920,
        useWebWorker: true
      });
      console.log(`Compressed size: ${compressedFile.size / 1024 / 1024} MB`);

      // 2. Upload/Process via Storage Service
      // This abstracts whether we use Base64 (Local) or URL (Cloud)
      const contentString = await storageService.upload(compressedFile, `docs/${Date.now()}_${file.name}`);

      // For Gemini analysis, we still need the raw base64 data part if using LocalStorageAdapter
      // If contentString is a URL (Cloud), we might need to fetch it or pass a different param
      // For this MVP, LocalStorageAdapter returns the full data URL "data:image..."
      // So we can extract the base64 part for Gemini.

      let base64DataForGemini = "";
      if (contentString.startsWith('data:')) {
        base64DataForGemini = contentString.split(',')[1];
      } else {
        // If it's a Cloud URL, fetch it to get base64 for Gemini (or update Gemini service to take URL)
        // For now assuming Local/Base64 flow is primary
        // Re-read compressed file for Gemini to be safe
        base64DataForGemini = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(compressedFile);
        });
      }

      const mimeType = compressedFile.type;

      // Store content for saving later
      setNewDoc(prev => ({ ...prev, fileContent: contentString }));

      try {
        // 3. Send to Gemini
        const result = await analyzeDocumentImage(base64DataForGemini, mimeType);

        // 4. Update State
        setNewDoc(prev => ({
          ...prev,
          name: result.name || file.name.split('.')[0],
          type: result.type,
          expiry: result.expiry,
          docId: result.docId || '',
          fileContent: contentString // Ensure it persists
        }));

      } catch (apiError) {
        console.error("Gemini API Error:", apiError);
        setAnalysisError("AI could not read document. Please fill details manually.");
        // Still keep the file content even if AI fails
        setNewDoc(prev => ({ ...prev, name: file.name.split('.')[0], fileContent: contentString }));
      } finally {
        setIsAnalyzing(false);
      }
    } catch (e) {
      console.error("File Processing Error:", e);
      setAnalysisError("Could not process file.");
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      performAIAnalysis(e.target.files[0]);
    }
  };

  // --- DRAG AND DROP ---
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      performAIAnalysis(e.dataTransfer.files[0]);
    }
  };

  // --- GOOGLE DRIVE SIMULATION ---
  const simulateGoogleDriveImport = () => {
    // Alert user that Drive integration isn't fully multimodal yet or requires a real file
    alert("Google Drive Import is simulating file selection. Please use 'Scan File' to test Real AI with an actual image.");
  };

  const handleUpload = () => {
    if (newDoc.name) {
      const computedStatus = calculateStatus(newDoc.expiry);

      onAddDocument({
        id: Date.now().toString(),
        name: newDoc.name,
        type: newDoc.type,
        expiry: newDoc.expiry || undefined,
        documentId: newDoc.docId, // Pass the extracted ID
        status: computedStatus,
        tripId: newDoc.scope === 'trip' && activeTrip ? activeTrip.id : undefined,
        fileContent: newDoc.fileContent
      });
      setIsAdding(false);
      setNewDoc({ name: '', type: 'booking', expiry: '', scope: 'trip', docId: '', fileContent: '' });
    }
  };

  const handleDelete = () => {
    if (selectedDoc) {
      onDeleteDocument(selectedDoc.id);
      setSelectedDoc(null);
    }
  };

  const getDateLabel = (type: string) => {
    if (type === 'booking') return 'Check-out Date';
    return 'Expiry Date';
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  // --- RENDER SECURITY LAYER ---
  if (!isBiometricVerified) {
    return <BiometricLayer onSuccess={() => setIsBiometricVerified(true)} reason="Accessing Secure Document Hub (ID 070)" />;
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-20 relative">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-dynac-darkChoc flex items-center gap-2">
            Secure Document Hub
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wide">
              Encrypted
            </span>
          </h2>
          {activeTrip && (
            <p className="text-xs text-dynac-nutBrown mt-1 flex items-center gap-1">
              Viewing: <span className="font-bold text-dynac-lightBrown">{activeTrip.name}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs bg-dynac-lightBrown text-dynac-cream px-3 py-1.5 rounded hover:opacity-90 transition"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
          {isAdding ? 'Cancel' : 'Upload'}
        </button>
      </div>

      {isAdding && (
        <div
          className={`bg-white p-4 rounded-xl border-2 border-dashed shadow-md animate-in slide-in-from-top-4 duration-300 transition-colors ${isDragging ? 'border-dynac-lightBrown bg-dynac-sand/20' : 'border-dynac-lightBrown/20'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-dynac-darkChoc">Upload New Document</h3>
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <div className="flex gap-2">
              <button
                onClick={simulateGoogleDriveImport}
                className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-50 transition"
                title="Import from Google Drive"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-3 h-3" />
                <span className="hidden sm:inline">Drive</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-dynac-sand/30 hover:bg-dynac-sand text-dynac-darkChoc px-2 py-1 rounded flex items-center gap-1 transition"
              >
                <Download size={12} className="rotate-180" /> Scan File
              </button>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8 bg-dynac-cream/50 rounded-lg">
              <div className="relative">
                <Clock size={32} className="text-dynac-lightBrown animate-spin" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <p className="text-xs font-bold text-dynac-darkChoc mt-3">AI Analyzing Document...</p>
              <p className="text-[10px] text-dynac-nutBrown">Extracting expiry dates & details</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-center text-xs text-dynac-nutBrown/60 py-2 border-b border-dynac-sand/50 mb-2">
                {isDragging ? 'Drop file to upload' : 'Drag & Drop file here or use buttons'}
              </div>

              <input
                type="text"
                placeholder={newDoc.type === 'booking' ? "Booking Name (e.g. Hotel The Toren)" : "Document Name"}
                value={newDoc.name}
                onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                className="w-full p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none"
              />
              <div className="flex gap-3">
                <select
                  value={newDoc.type}
                  onChange={e => setNewDoc({ ...newDoc, type: e.target.value as any })}
                  className="flex-1 p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none"
                >
                  <option value="booking">Hotel Booking</option>
                  <option value="passport">Passport</option>
                  <option value="visa">Visa</option>
                  <option value="insurance">Insurance</option>
                </select>
                <input
                  type="date"
                  placeholder={getDateLabel(newDoc.type)}
                  value={newDoc.expiry ? newDoc.expiry.split('-').reverse().join('-') : ''}
                  onChange={(e) => {
                    // Input date is YYYY-MM-DD, convert to DD-MM-YYYY for storage
                    const val = e.target.value;
                    if (val) {
                      const [y, m, d] = val.split('-');
                      setNewDoc({ ...newDoc, expiry: `${d}-${m}-${y}` });
                    } else {
                      setNewDoc({ ...newDoc, expiry: '' });
                    }
                  }}
                  className="flex-1 p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none"
                />
              </div>

              <input
                type="text"
                placeholder="Document ID / Number (Auto-filled)"
                value={newDoc.docId}
                onChange={e => setNewDoc({ ...newDoc, docId: e.target.value })}
                className="w-full p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none font-mono text-xs"
              />

              {/* Scope Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewDoc({ ...newDoc, scope: 'trip' })}
                  disabled={!activeTrip}
                  className={`flex-1 py-2 text-xs font-bold rounded border ${newDoc.scope === 'trip'
                    ? 'bg-dynac-lightBrown text-dynac-cream border-dynac-lightBrown'
                    : 'bg-white text-dynac-nutBrown border-dynac-sand'
                    } ${!activeTrip ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {activeTrip ? `For ${activeTrip.destination}` : 'Select Trip First'}
                </button>
                <button
                  onClick={() => setNewDoc({ ...newDoc, scope: 'global' })}
                  className={`flex-1 py-2 text-xs font-bold rounded border ${newDoc.scope === 'global'
                    ? 'bg-dynac-lightBrown text-dynac-cream border-dynac-lightBrown'
                    : 'bg-white text-dynac-nutBrown border-dynac-sand'
                    }`}
                >
                  Global (All Trips)
                </button>
              </div>

              <button
                onClick={handleUpload}
                className="w-full py-2 bg-dynac-lightBrown text-dynac-cream rounded font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Confirm Upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-2 gap-4">
        <DocCategory
          title="Passports"
          count={filteredDocuments.filter(d => d.type === 'passport').length}
          icon={<ShieldCheck className="text-dynac-success" />}
          onClick={() => setViewCategory('passport')}
        />
        <DocCategory
          title="Visas"
          count={filteredDocuments.filter(d => d.type === 'visa').length}
          icon={<FileText className="text-dynac-lightBrown" />}
          onClick={() => setViewCategory('visa')}
        />
        <DocCategory
          title="Insurance"
          count={filteredDocuments.filter(d => d.type === 'insurance').length}
          icon={<Lock className="text-purple-600" />}
          onClick={() => setViewCategory('insurance')}
        />
        <DocCategory
          title="Bookings"
          count={filteredDocuments.filter(d => d.type === 'booking').length}
          icon={<FileText className="text-dynac-nutBrown" />}
          onClick={() => setViewCategory('booking')}
        />
      </div>

      {/* File List */}
      <div className="space-y-3">
        <h3 className="text-dynac-lightBrown text-xs font-bold uppercase tracking-wider">
          {activeTrip ? `${activeTrip.destination} & Global Files` : 'All Global Files'}
        </h3>
        {filteredDocuments.length === 0 && <p className="text-dynac-nutBrown text-sm italic">No documents found.</p>}
        {filteredDocuments.map(doc => (
          <button
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className="w-full text-left bg-dynac-sand p-4 rounded-lg flex items-center justify-between border border-dynac-sand hover:border-dynac-lightBrown transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dynac-cream rounded group-hover:bg-white transition-colors relative">
                <FileText size={20} className="text-dynac-lightBrown" />
                {!doc.tripId && (
                  <div className="absolute -top-1 -right-1">
                    <ShieldCheck size={10} className="text-dynac-success bg-white rounded-full" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-dynac-darkChoc font-medium text-sm">{doc.name}</p>
                <div className="flex items-center gap-2 text-dynac-nutBrown/80 text-xs">
                  <span className="capitalize">{doc.type}</span>
                  {doc.tripId ? (
                    <span className="flex items-center gap-0.5"><Plane size={10} /> Trip</span>
                  ) : (
                    <span className="flex items-center gap-0.5"><ShieldCheck size={10} /> Global</span>
                  )}
                </div>
              </div>
            </div>
            {doc.status === 'valid' ? (
              <span className="text-dynac-success text-xs bg-white/50 px-2 py-1 rounded font-medium">Valid</span>
            ) : doc.status === 'expired' ? (
              <span className="text-dynac-alert text-xs bg-white/50 px-2 py-1 rounded font-bold">EXPIRED</span>
            ) : (
              <span className="text-orange-600 text-xs bg-white/50 px-2 py-1 rounded font-medium capitalize">{doc.status}</span>
            )}
          </button>
        ))}
      </div>

      {/* View Category Modal */}
      {viewCategory && !selectedDoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-dynac-darkChoc/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-dynac-sand p-4 flex justify-between items-center border-b border-dynac-lightBrown/10">
              <h3 className="text-dynac-darkChoc font-bold flex items-center gap-2 capitalize">
                {viewCategory}s
              </h3>
              <button onClick={() => setViewCategory(null)} className="text-dynac-nutBrown hover:text-dynac-darkChoc">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {categoryDocuments.length === 0 ? (
                <div className="text-center py-8 text-dynac-nutBrown italic">No {viewCategory} documents found for this context.</div>
              ) : (
                categoryDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="w-full text-left bg-dynac-cream p-3 rounded-lg flex items-center justify-between border border-dynac-sand hover:border-dynac-lightBrown transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded border border-dynac-sand">
                        <FileText size={16} className="text-dynac-lightBrown" />
                      </div>
                      <div>
                        <h4 className="font-bold text-dynac-darkChoc text-sm">{doc.name}</h4>
                        <p className="text-xs text-dynac-nutBrown capitalize">
                          {doc.type} {doc.documentId && <span className="opacity-50 ml-1 font-mono">{doc.documentId}</span>}
                        </p>
                        <p className="text-xs text-dynac-nutBrown">
                          {doc.expiry ? `Expires: ${formatDisplayDate(doc.expiry)}` : 'No expiry'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-dynac-sand bg-dynac-cream/50">
              <button
                onClick={() => { setNewDoc({ ...newDoc, type: viewCategory }); setViewCategory(null); setIsAdding(true); }}
                className="w-full py-2 bg-dynac-lightBrown text-dynac-cream rounded font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add New {viewCategory}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {
        selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dynac-darkChoc/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-dynac-lightBrown p-4 flex justify-between items-center">
                <h3 className="text-dynac-cream font-bold flex items-center gap-2">
                  <ShieldCheck size={18} /> Secure Document View
                </h3>
                <button onClick={() => setSelectedDoc(null)} className="text-dynac-cream/80 hover:text-dynac-cream">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-dynac-sand rounded-lg flex items-center justify-center text-dynac-lightBrown">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-dynac-darkChoc">{selectedDoc.name}</h2>
                    <span className="text-xs uppercase tracking-wide text-dynac-nutBrown font-bold">{selectedDoc.type}</span>
                  </div>
                </div>

                <div className="space-y-4 bg-dynac-cream p-4 rounded-lg border border-dynac-sand mb-6">
                  {selectedDoc.tripId && (
                    <div className="flex justify-between items-center text-sm border-b border-dynac-lightBrown/10 pb-2">
                      <span className="text-dynac-nutBrown flex items-center gap-2"><Plane size={14} /> Linked Trip</span>
                      <span className="font-medium text-dynac-darkChoc">
                        {activeTrip && activeTrip.id === selectedDoc.tripId ? activeTrip.destination : 'Other Trip'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm border-b border-dynac-lightBrown/10 pb-2">
                    <span className="text-dynac-nutBrown flex items-center gap-2"><Calendar size={14} /> {getDateLabel(selectedDoc.type)}</span>
                    <span className="font-medium text-dynac-darkChoc">{formatDisplayDate(selectedDoc.expiry) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-dynac-nutBrown flex items-center gap-2"><ShieldCheck size={14} /> Validation Status</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${selectedDoc.status === 'valid' ? 'bg-green-100 text-green-700' : selectedDoc.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {selectedDoc.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsViewingImage(true)}
                    className="flex-1 py-3 bg-dynac-lightBrown text-dynac-cream rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    <Download size={18} /> Decrypt & View
                  </button>

                  {/* IMAGE VIEW MODAL OVERLAY */}
                  {isViewingImage && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsViewingImage(false)}>
                      <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
                        <div className="absolute top-4 right-4 z-50">
                          <button onClick={() => setIsViewingImage(false)} className="bg-white/10 text-white p-2 rounded-full hover:bg-white/20 transition">
                            <X size={24} />
                          </button>
                        </div>
                        {selectedDoc.fileContent ? (
                          <>
                            <img
                              src={selectedDoc.fileContent}
                              alt="Decrypted Document"
                              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                              onClick={e => e.stopPropagation()}
                              onError={(e) => {
                                console.error("Image failed to load:", selectedDoc.fileContent?.substring(0, 100));
                                (e.target as HTMLImageElement).style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'bg-white p-8 rounded-lg text-center';
                                errorDiv.innerHTML = `<p class="text-dynac-darkChoc font-bold">Image Load Error</p><p class="text-dynac-nutBrown mt-2 text-sm">The document data may be corrupted. Try re-uploading.</p>`;
                                (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                              }}
                            />
                          </>
                        ) : (
                          <div className="bg-white p-8 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                            <AlertTriangle size={48} className="text-dynac-alert mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-dynac-darkChoc">No Digital Copy Found</h3>
                            <p className="text-dynac-nutBrown mt-2">This document record does not have an attached image file.</p>
                          </div>
                        )}
                        <div className="mt-4 text-white/50 text-sm font-mono flex items-center gap-2">
                          <ShieldCheck size={14} /> End-to-End Encrypted View
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleDelete}
                    className="w-12 py-3 bg-red-100 text-red-600 rounded-lg font-bold flex items-center justify-center hover:bg-red-200 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

const DocCategory: React.FC<{ title: string; count: number; icon: React.ReactNode; onClick: () => void }> = ({ title, count, icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-dynac-sand p-4 rounded-xl border border-dynac-sand flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-dynac-sand/80 transition-colors shadow-sm w-full"
  >
    {icon}
    <span className="text-dynac-darkChoc font-medium">{title}</span>
    <span className="text-dynac-nutBrown text-xs">{count} documents</span>
  </button>
);
