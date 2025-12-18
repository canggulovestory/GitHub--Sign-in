import React, { useState, useEffect } from 'react';
import {
  MOCK_TRIPS,
  MOCK_DOCUMENTS,
  MOCK_TRAVELERS,
  INITIAL_PREFERENCES,
  MOCK_CHECKLIST
} from './constants';
import { saveSession, getSession, saveUserData, loadUserData, clearSession } from './utils/storage';
import { AppTab, ChatMessage, DayPlan, ChecklistItem, DocumentFile, UserPreferences, ItineraryItem, UserProfile, Trip, Traveler } from './types';
import { Dashboard } from './components/Dashboard';
import { DocumentHub } from './components/DocumentHub';
import { ChatInterface } from './components/ChatInterface';
import { TravelDNA } from './components/TravelDNA';
import { TranslationPage } from './components/TranslationPage';
import { LoginPage } from './components/LoginPage';
import { NewTripWizard } from './components/NewTripWizard';
import { TripList } from './components/TripList';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Dna,
  Menu,
  Languages,
  X,
  User,
  CalendarDays,
  History,
  Plane,
  PlusCircle,
  LogOut,
  Map,
  Download
} from 'lucide-react';
import { generateAIStudioExport } from './utils/exportUtils';

const App: React.FC = () => {
  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState<UserProfile | null>(null);

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TRIPS); // Default to Trip List
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>("");

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Computed Data based on Active Trip
  const activeTrip = trips.find(t => t.id === activeTripId);
  const itinerary = activeTrip ? activeTrip.itinerary : [];

  // --- HANDLERS ---
  // --- HANDLERS ---

  const handleLogin = (userProfile: UserProfile) => {
    setUser(userProfile);
    saveSession(userProfile); // Persist session
    loadDataForUser(userProfile);
    setActiveTab(AppTab.TRIPS);
  };

  const handleLogout = () => {
    setUser(null);
    clearSession(); // Clear session
    setIsMenuOpen(false);
    // Optional: Clear state to avoid flash on next login? 
    // Actually React state will be essentially hidden/unused until next login overwrites it.
  };

  const handleExportData = () => {
    if (!user) return;
    const json = generateAIStudioExport(user, trips, documents, preferences, travelers, checklist);

    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {
      alert("Project Data copied to clipboard! Paste it into Google AI Studio.");
    }).catch(err => {
      console.error('Failed to copy: ', err);
      // Fallback: Download file
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gaide_data_${Date.now()}.json`;
      a.click();
    });
  };

  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    setActiveTab(AppTab.DASHBOARD);
    setIsMenuOpen(false);
  };

  const handleOpenTripDocs = (tripId: string) => {
    setActiveTripId(tripId);
    setActiveTab(AppTab.DOCUMENTS);
    setIsMenuOpen(false);
  };

  const handleSwapRequest = (dayIndex: number, itemId: string) => {
    setActiveTab(AppTab.CHAT);
    const item = itinerary[dayIndex].items.find(i => i.id === itemId);

    const systemTriggerMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: `GAIDE, I want to reschedule "${item?.activity}" in ${activeTrip?.destination}. What are my options ? `,
      timestamp: new Date(),
      pendingResponse: true // Trigger AI processing immediately
    };
    setChatHistory(prev => [...prev, systemTriggerMsg]);
  };

  const handleAddActivity = (newItem: ItineraryItem) => {
    if (!activeTrip) return;

    const updatedTrips = trips.map(t => {
      if (t.id === activeTripId) {
        const newItinerary = [...t.itinerary];
        if (newItinerary.length > 0) {
          newItinerary[0].items.push(newItem);
          newItinerary[0].items.sort((a, b) => a.time.localeCompare(b.time));
        }
        return { ...t, itinerary: newItinerary };
      }
      return t;
    });
    setTrips(updatedTrips);
  };

  const handleAddDocument = (newDoc: DocumentFile) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const handleNewTripComplete = (newItinerary: DayPlan[], currency?: string) => {
    // Create new trip object
    const newTrip: Trip = {
      id: `trip_${Date.now()} `,
      name: `New Trip to ${newItinerary[0].location} `,
      destination: newItinerary[0].location,
      startDate: newItinerary[0].date,
      endDate: newItinerary[newItinerary.length - 1].date,
      status: 'upcoming',
      image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop', // Generic Travel Image
      currency: currency || 'USD',
      itinerary: newItinerary
    };

    setTrips(prev => [newTrip, ...prev]);
    setActiveTripId(newTrip.id);

    // Reset context
    setChatHistory([]);
    setActiveTab(AppTab.DASHBOARD);
    setIsMenuOpen(false);
  };



  // Determine current language based on today's date vs active trip itinerary
  const getCurrentLanguage = () => {
    if (!itinerary.length) return 'English';
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year} -${month} -${day} `;

    const currentDayPlan = itinerary.find(d => d.date === todayStr);
    return currentDayPlan ? currentDayPlan.language : itinerary[0].language;
  };

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    if (user && user.email) {
      const dataToSave = {
        trips,
        documents,
        preferences,
        travelers,
        chatHistory,
        checklist
      };

      // Debounce save to avoid hammering LocalStorage and Supabase
      const timeoutId = setTimeout(async () => {
        await saveUserData(user.email, dataToSave);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [trips, documents, preferences, travelers, chatHistory, checklist, user]);

  // Unified Load Data
  const loadDataForUser = async (userProfile: UserProfile) => {
    const savedData = await loadUserData(userProfile.email);

    if (savedData) {
      console.log(`[App] Loading data for ${userProfile.email}`);
      setTrips(savedData.trips || []);
      setDocuments(savedData.documents || []);
      setPreferences(savedData.preferences || INITIAL_PREFERENCES);
      setTravelers(savedData.travelers || []);
      setChatHistory(savedData.chatHistory || []);
      setChecklist(savedData.checklist || []);
    } else {
      console.log(`[App] No saved data for ${userProfile.email}, initializing defaults.`);
      setTrips([]);
      setDocuments([]);
      setPreferences(INITIAL_PREFERENCES);
      setTravelers([{
        id: 't-me',
        name: userProfile.name,
        nationality: 'United States',
        passportNumber: ''
      }]);
      setChatHistory([]);
      setChecklist(MOCK_CHECKLIST);
    }
  };

  // --- SESSION INIT EFFECT ---
  useEffect(() => {
    const sessionUser = getSession();
    if (sessionUser) {
      console.log(`[App] Restoring session for ${sessionUser.email}`);
      setUser(sessionUser);
      loadDataForUser(sessionUser);
    }
  }, []);

  // --- RENDER GUARD ---
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-dynac-cream text-dynac-darkChoc font-sans overflow-hidden">

      {/* Header */}
      <header className="flex-none p-4 bg-premium-gradient border-b border-white/5 flex justify-between items-center z-30 relative shadow-premium">
        <div className="flex items-center gap-2" onClick={() => setActiveTab(AppTab.TRIPS)}>
          <div className="w-8 h-8 rounded bg-dynac-cream flex items-center justify-center font-bold text-dynac-deepBrown shadow-sm cursor-pointer">
            G
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-normal tracking-tight text-dynac-cream leading-none">
              G<span className="font-bold">AI</span>DE
            </h1>
            {activeTrip && activeTab !== AppTab.TRIPS && (
              <span className="text-[10px] text-dynac-sand opacity-80">{activeTrip.destination}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-dynac-cream hover:opacity-80 transition-opacity"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Desktop Sidebar */}
        <nav className="hidden md:flex flex-col w-64 bg-warm-gradient border-r border-dynac-sand/30 p-4 space-y-2 shadow-soft">
          <NavButton
            active={activeTab === AppTab.TRIPS}
            onClick={() => handleTabChange(AppTab.TRIPS)}
            icon={<Map size={20} />}
            label="My Trips"
          />
          <div className="h-px bg-dynac-sand/50 my-2" />
          <p className="text-[10px] font-bold uppercase text-dynac-nutBrown px-3 mb-1">
            {activeTrip ? activeTrip.destination : 'Select Trip'}
          </p>
          <NavButton
            active={activeTab === AppTab.DASHBOARD}
            onClick={() => handleTabChange(AppTab.DASHBOARD)}
            icon={<LayoutDashboard size={20} />}
            label="Timeline"
          />
          <NavButton
            active={activeTab === AppTab.CHAT}
            onClick={() => handleTabChange(AppTab.CHAT)}
            icon={<MessageSquare size={20} />}
            label="Assistant"
          />
          <NavButton
            active={activeTab === AppTab.TRANSLATE}
            onClick={() => handleTabChange(AppTab.TRANSLATE)}
            icon={<Languages size={20} />}
            label="Tools"
          />
          <NavButton
            active={activeTab === AppTab.DOCUMENTS}
            onClick={() => handleTabChange(AppTab.DOCUMENTS)}
            icon={<FileText size={20} />}
            label="Doc Hub"
          />
          <NavButton
            active={activeTab === AppTab.DNA}
            onClick={() => handleTabChange(AppTab.DNA)}
            icon={<Dna size={20} />}
            label="Travel DNA"
          />

          <div className="mt-2 text-xs">
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-2 p-2 rounded-lg text-dynac-nutBrown hover:bg-dynac-sand/30 transition-colors"
            >
              <Download size={16} />
              <span>Export for AI Studio</span>
            </button>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-3 p-2 mb-2 bg-dynac-sand/30 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-dynac-lightBrown text-dynac-cream flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-xs text-dynac-nutBrown truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 p-2 w-full">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute inset-0 z-20 bg-dynac-deepBrown/95 backdrop-blur-sm md:hidden flex flex-col p-6 animate-in slide-in-from-top-10 duration-200 overflow-y-auto pb-24">
            <h2 className="text-dynac-sand text-xs font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex-shrink-0">Navigation</h2>

            <button
              onClick={() => { handleTabChange(AppTab.TRIPS); }}
              className="flex items-center gap-4 w-full p-4 rounded-xl transition-all bg-dynac-lightBrown text-dynac-cream mb-6 shadow-lg border border-white/10 flex-shrink-0"
            >
              <Map size={24} />
              <div className="text-left font-bold text-lg">My Trips</div>
            </button>

            <h2 className="text-dynac-sand text-xs font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex-shrink-0">Current Context: {activeTrip?.destination || 'None'}</h2>
            <div className="space-y-4 flex-shrink-0">
              <NavButtonMobile onClick={() => handleTabChange(AppTab.DASHBOARD)} icon={<LayoutDashboard size={20} />} label="Timeline" />
              <NavButtonMobile onClick={() => handleTabChange(AppTab.DOCUMENTS)} icon={<FileText size={20} />} label="Documents" />
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex-shrink-0">
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 p-3 mb-4 rounded-xl bg-white/5 text-dynac-sand border border-white/10 hover:bg-white/10"
              >
                <Download size={16} />
                <span>Export Data for Google AI Studio</span>
              </button>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-dynac-sand flex items-center justify-center text-dynac-deepBrown font-bold text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-dynac-cream font-bold">{user.name}</div>
                    <div className="text-dynac-sand/60 text-xs">{user.email}</div>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full mt-2 text-xs bg-red-500/20 text-red-300 py-2 rounded font-bold">
                  Log Out
                </button>
              </div>
            </div>

            <div className="mt-auto text-center text-dynac-sand/40 text-xs py-4 flex-shrink-0">
              GAIDE AI Travel OS • v1.0
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative w-full bg-dynac-cream">
          <div className="h-full w-full max-w-3xl mx-auto md:p-6 p-4">

            {activeTab === AppTab.TRIPS && (
              <TripList
                trips={trips}
                activeTripId={activeTripId}
                onSelectTrip={handleSelectTrip}
                onOpenDocuments={handleOpenTripDocs}
                onAddNew={() => setActiveTab(AppTab.NEW_TRIP)}
              />
            )}

            {activeTab === AppTab.DASHBOARD && activeTrip && (
              <Dashboard
                itinerary={itinerary}
                onSwapRequest={handleSwapRequest}
                onAddActivity={handleAddActivity}
                activeTrip={activeTrip}
                userPreferences={preferences}
              />
            )}

            {activeTab === AppTab.CHAT && (
              <ChatInterface
                history={chatHistory}
                setHistory={setChatHistory}
                context={{
                  itinerary,
                  preferences: preferences,
                  travelers: travelers,
                  checklist
                }}
              />
            )}

            {activeTab === AppTab.TRANSLATE && (
              <TranslationPage
                currentLanguage={getCurrentLanguage()}
                context={{
                  itinerary,
                  preferences: preferences,
                  travelers: travelers,
                  checklist
                }}
              />
            )}

            {activeTab === AppTab.DOCUMENTS && (
              <DocumentHub
                documents={documents}
                travelers={travelers}
                itinerary={itinerary}
                activeTrip={activeTrip}
                user={user}
                onAddDocument={handleAddDocument}
                onDeleteDocument={handleDeleteDocument}
              />
            )}

            {activeTab === AppTab.DNA && (
              <TravelDNA
                preferences={preferences}
                travelers={travelers}
                onUpdatePreferences={handleUpdatePreferences}
              />
            )}

            {activeTab === AppTab.NEW_TRIP && (
              <NewTripWizard
                onComplete={handleNewTripComplete}
                onCancel={() => handleTabChange(AppTab.TRIPS)}
              />
            )}
          </div>
        </main>

      </div>

      {/* Mobile Bottom Navigation - Shows ONLY when inside a specific trip (not in Trip List) */}
      {activeTab !== AppTab.TRIPS && activeTab !== AppTab.NEW_TRIP && (
        <nav className="md:hidden bg-dynac-deepBrown border-t border-white/10 px-2 py-3 flex justify-between items-center z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <MobileBottomNavButton
            active={activeTab === AppTab.DASHBOARD}
            onClick={() => handleTabChange(AppTab.DASHBOARD)}
            icon={<LayoutDashboard size={20} />}
            label="Timeline"
          />
          <MobileBottomNavButton
            active={activeTab === AppTab.CHAT}
            onClick={() => handleTabChange(AppTab.CHAT)}
            icon={<MessageSquare size={20} />}
            label="Assistant"
          />
          <MobileBottomNavButton
            active={activeTab === AppTab.TRANSLATE}
            onClick={() => handleTabChange(AppTab.TRANSLATE)}
            icon={<Languages size={20} />}
            label="Tools"
          />
          <MobileBottomNavButton
            active={activeTab === AppTab.DOCUMENTS}
            onClick={() => handleTabChange(AppTab.DOCUMENTS)}
            icon={<FileText size={20} />}
            label="Docs"
          />
          <MobileBottomNavButton
            active={activeTab === AppTab.DNA}
            onClick={() => handleTabChange(AppTab.DNA)}
            icon={<Dna size={20} />}
            label="DNA"
          />
        </nav>
      )}

      {/* Mobile Bottom Nav when in Trip List - Simplified */}
      {activeTab === AppTab.TRIPS && (
        <nav className="md:hidden bg-dynac-deepBrown border-t border-white/10 px-6 py-3 flex justify-center items-center z-30 pb-safe">
          <div className="text-dynac-sand/50 text-xs flex items-center gap-2">
            <Map size={14} /> Global Overview
          </div>
        </nav>
      )}

    </div>
  );
};

// Sub-components for styling
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 ${active
      ? 'bg-dynac-lightBrown text-dynac-cream font-medium shadow-soft'
      : 'text-dynac-lightBrown/80 hover:bg-dynac-sand/50 hover:shadow-sm'
      }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
      {icon}
    </div>
    <span>{label}</span>
  </button>
);

const MobileBottomNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full gap-1 p-1 transition-all duration-200 ${active ? 'text-dynac-cream' : 'text-dynac-sand/40 hover:text-dynac-sand/60'
      }`}
  >
    <div className={`p-1.5 rounded-full transition-all duration-200 ${active ? 'bg-white/15 shadow-glow scale-110' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const NavButtonMobile: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 w-full p-4 rounded-xl transition-all border bg-transparent text-dynac-cream border-white/10 hover:bg-white/5"
  >
    <div className="p-2 rounded-lg bg-white/10 text-dynac-sand">
      {icon}
    </div>
    <div className="text-left font-bold text-lg leading-tight">
      {label}
    </div>
  </button>
);

export default App;
