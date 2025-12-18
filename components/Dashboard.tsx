
import React, { useState, useEffect, useRef } from 'react';
import { DayPlan, ItineraryItem, Alert } from '../types';
import { MapPin, Clock, Shirt, Volume2, CloudRain, AlertTriangle, Calendar, Info, Plus, X, ChevronRight, ChevronLeft, ExternalLink, PlayCircle, Plane, DollarSign } from 'lucide-react';

/* --- HELPERS --- */

// Mock conversion logic (In real app, fetch from API)
const getExchangeRateDisplay = (localCurr: string, homeCurr: string) => {
  if (!localCurr || !homeCurr || localCurr === homeCurr) return null;

  // Hardcoded mock rates relative to USD for demo
  const rates: Record<string, number> = {
    'USD': 1,
    'EUR': 0.92,
    'JPY': 150,
    'IDR': 15500,
    'GBP': 0.79
  };

  // Calculate approximate "10 units" or "1000 units" for readability
  const rateToHome = (rates[homeCurr] || 1) / (rates[localCurr] || 1);

  if (localCurr === 'JPY' || localCurr === 'IDR') {
    // High denomination currencies, show 1000 units
    const base = 1000;
    const value = (base * rateToHome).toFixed(2);
    return `${base} ${localCurr} -> ${value} ${homeCurr}`;
  } else {
    // Low denomination, show 1 or 10
    const base = 10;
    const value = (base * rateToHome).toFixed(2);
    return `${base} ${localCurr} -> ${value} ${homeCurr}`;
  }
};

const AlertBanner: React.FC<{ alert: Alert }> = ({ alert }) => {
  let bgClass = 'bg-dynac-sand';
  let icon = <Info size={18} />;

  if (alert.severity === 'critical') {
    bgClass = 'bg-orange-200 border-orange-300';
    icon = <AlertTriangle size={18} className="text-dynac-darkChoc" />;
  } else if (alert.type === 'event') {
    bgClass = 'bg-dynac-sand border-dynac-lightBrown/20';
    icon = <Calendar size={18} className="text-dynac-lightBrown" />;
  }

  return (
    <div className={`${bgClass} p-3 rounded-lg border flex items-start gap-3 shadow-sm`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <h4 className="text-dynac-darkChoc font-bold text-sm uppercase">{alert.title}</h4>
        <p className="text-dynac-darkChoc/80 text-sm leading-tight mt-1">{alert.message}</p>
      </div>
    </div>
  );
};

const ItineraryCard: React.FC<{ item: ItineraryItem; isLast: boolean; isCurrent: boolean; onSwap: () => void }> = ({ item, isLast, isCurrent, onSwap }) => {
  const isAmbiguous = item.notes?.includes("Ambiguity");
  const cardBg = isCurrent ? 'bg-dynac-lightBrown text-dynac-cream shadow-md' : 'bg-transparent text-dynac-darkChoc border border-dynac-lightBrown/20 hover:bg-dynac-sand/30';
  const subText = isCurrent ? 'text-dynac-sand' : 'text-dynac-nutBrown';
  const iconColor = isCurrent ? 'text-dynac-sand' : 'text-dynac-lightBrown';
  const btnStyle = isCurrent
    ? 'border-dynac-sand text-dynac-sand hover:bg-dynac-sand hover:text-dynac-lightBrown'
    : 'border-dynac-lightBrown/30 text-dynac-nutBrown hover:bg-dynac-lightBrown hover:text-dynac-cream';

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-dynac-lightBrown ring-2 ring-offset-2 ring-offset-dynac-cream ring-dynac-lightBrown' : 'bg-dynac-sand'} transition-all`} />
        {!isLast && <div className="w-0.5 flex-1 bg-dynac-lightBrown/20 my-1 group-hover:bg-dynac-lightBrown/40 transition-colors" />}
      </div>

      <div className={`flex-1 p-4 rounded-lg transition-all ${cardBg}`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-bold flex items-center gap-1 ${iconColor}`}>
            <Clock size={12} /> {item.time}
          </span>
          <button onClick={onSwap} className={`text-xs px-2 py-0.5 rounded border transition-colors ${btnStyle}`}>
            Reschedule
          </button>
        </div>

        <h4 className="font-semibold text-lg">{item.activity}</h4>

        <div className="flex items-center gap-2 mt-1">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-sm hover:underline w-fit ${subText}`}
            onClick={(e) => e.stopPropagation()}
            title="View on Google Maps"
          >
            <MapPin size={14} />
            <span>{item.location}</span>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] bg-white/50 border border-dynac-sand px-1.5 py-0.5 rounded text-dynac-nutBrown hover:bg-white hover:text-dynac-lightBrown transition-colors flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} /> Maps
          </a>
        </div>

        {item.notes && (
          <div className={`mt-3 text-xs p-2 rounded ${isAmbiguous
            ? 'bg-dynac-alert/10 text-dynac-alert border border-dynac-alert/20'
            : (isCurrent ? 'bg-black/20 text-dynac-cream' : 'bg-dynac-sand/50 text-dynac-nutBrown')
            }`}>
            {isAmbiguous && <span className="font-bold mr-1">[FILTER ACTIVE]</span>}
            {item.notes}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- MAIN COMPONENT --- */

interface DashboardProps {
  itinerary: DayPlan[];
  onSwapRequest: (dayIndex: number, itemId: string) => void;
  onAddActivity: (item: ItineraryItem) => void;
  activeTrip?: any;
  userPreferences?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ itinerary, onSwapRequest, onAddActivity, activeTrip, userPreferences }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const currentDay = itinerary[selectedDayIndex];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Audio Greeting State
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Auto-detect Today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todayIndex = itinerary.findIndex(d => d.date === todayStr);
    if (todayIndex !== -1) setSelectedDayIndex(todayIndex);
  }, [itinerary]);

  // Scroll handler
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Add Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ItineraryItem>>({
    time: '12:00', type: 'activity', activity: '', location: ''
  });

  const handleSave = () => {
    if (newItem.activity && newItem.time && newItem.location) {
      onAddActivity({
        id: Date.now().toString(),
        time: newItem.time || '00:00',
        activity: newItem.activity,
        location: newItem.location,
        type: newItem.type as any,
      });
      setIsAdding(false);
      setNewItem({ time: '12:00', type: 'activity', activity: '', location: '' });
    }
  };

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const itemDate = new Date(y, m - 1, d);
    return today.toDateString() === itemDate.toDateString();
  };

  const parseDateDetails = (dateStr: string) => {
    if (!dateStr) return { weekday: '', day: '', month: '', full: '' };
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return {
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        day: d,
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      };
    } catch (e) {
      return { weekday: '', day: '', month: '', full: dateStr };
    }
  };

  const changeDay = (delta: number) => {
    const newIndex = selectedDayIndex + delta;
    if (newIndex >= 0 && newIndex < itinerary.length) {
      setSelectedDayIndex(newIndex);
    }
  };

  const handlePlayGreeting = () => {
    if (isPlayingGreeting) return;
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0 && availableVoices.length > 0) voices = availableVoices;

    const hour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour >= 18) timeOfDay = 'evening';

    const greetings: Record<string, any> = {
      'Dutch': { morning: 'Goedemorgen', afternoon: 'Goedemiddag', evening: 'Goedenavond', code: 'nl-NL' },
      'German': { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', code: 'de-DE' },
      'Indonesian': { morning: 'Selamat Pagi', afternoon: 'Selamat Siang', evening: 'Selamat Malam', code: 'id-ID' },
      'French': { morning: 'Bonjour', afternoon: 'Bonjour', evening: 'Bonsoir', code: 'fr-FR' },
      'Spanish': { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', code: 'es-ES' },
      'Arabic': { morning: 'صباح الخير', afternoon: 'مساء الخير', evening: 'مساء الخير', code: 'ar-AE' },
      'Japanese': { morning: 'おはようございます', afternoon: 'こんにちは', evening: 'こんばんは', code: 'ja-JP' },
      'Italian': { morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera', code: 'it-IT' },
      'Thai': { morning: 'สวัสดีครับ', afternoon: 'สวัสดีครับ', evening: 'สวัสดีครับ', code: 'th-TH' },
      'Hindi': { morning: 'नमस्ते', afternoon: 'नमस्ते', evening: 'नमस्ते', code: 'hi-IN' },
      'Mandarin': { morning: '早上好', afternoon: '下午好', evening: '晚上好', code: 'zh-CN' },
      'Korean': { morning: '안녕하세요', afternoon: '안녕하세요', evening: '안녕하세요', code: 'ko-KR' },
      'Portuguese': { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', code: 'pt-BR' },
      'Turkish': { morning: 'Günaydın', afternoon: 'İyi günler', evening: 'İyi akşamlar', code: 'tr-TR' },
      'English': { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening', code: 'en-US' },
    };

    // Auto-detect language based on location if not properly set
    const locationLower = currentDay.location.toLowerCase();
    let detectedLang = currentDay.language;

    // UAE locations should use Arabic
    if (locationLower.includes('abu dhabi') || locationLower.includes('dubai') ||
      locationLower.includes('sharjah') || locationLower.includes('uae') ||
      locationLower.includes('emirates')) {
      detectedLang = 'Arabic';
    } else if (locationLower.includes('bali') || locationLower.includes('jakarta') || locationLower.includes('indonesia')) {
      detectedLang = 'Indonesian';
    } else if (locationLower.includes('tokyo') || locationLower.includes('japan') || locationLower.includes('osaka')) {
      detectedLang = 'Japanese';
    } else if (locationLower.includes('paris') || locationLower.includes('france')) {
      detectedLang = 'French';
    } else if (locationLower.includes('amsterdam') || locationLower.includes('netherlands')) {
      detectedLang = 'Dutch';
    } else if (locationLower.includes('rome') || locationLower.includes('italy') || locationLower.includes('milan')) {
      detectedLang = 'Italian';
    } else if (locationLower.includes('bangkok') || locationLower.includes('thailand')) {
      detectedLang = 'Thai';
    } else if (locationLower.includes('berlin') || locationLower.includes('germany') || locationLower.includes('munich')) {
      detectedLang = 'German';
    } else if (locationLower.includes('madrid') || locationLower.includes('spain') || locationLower.includes('barcelona')) {
      detectedLang = 'Spanish';
    } else if (locationLower.includes('istanbul') || locationLower.includes('turkey')) {
      detectedLang = 'Turkish';
    }

    const targetLang = greetings[detectedLang] || greetings['English'];
    const textToSpeak = targetLang[timeOfDay];
    setGreetingText(textToSpeak);
    setIsPlayingGreeting(true);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.85;

    // Voice Selection
    const targetCode = targetLang.code.toLowerCase();
    const selectedVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(targetCode.split('-')[0]))
      || voices.find(v => v.lang.replace('_', '-').toLowerCase() === targetCode);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = targetLang.code;
    }

    utterance.onend = () => {
      setIsPlayingGreeting(false);
      setTimeout(() => setGreetingText(''), 3000);
    };
    utterance.onerror = () => { setIsPlayingGreeting(false); setGreetingText('Audio unavailable'); };
    window.speechSynthesis.speak(utterance);
  };

  if (!currentDay) {
    return <div className="p-8 text-center text-dynac-nutBrown">Loading Trip...</div>;
  }

  const dateDetails = parseDateDetails(currentDay?.date || '');

  // Currency Logic
  const currencyDisplay = activeTrip?.currency && userPreferences?.homeCurrency
    ? getExchangeRateDisplay(activeTrip.currency, userPreferences.homeCurrency)
    : null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-24 px-1">

      {/* Mobile Day Nav */}
      <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-dynac-sand shadow-sm">
        <button onClick={() => changeDay(-1)} disabled={selectedDayIndex === 0} className={`p-2 rounded-full ${selectedDayIndex === 0 ? 'text-gray-300' : 'text-dynac-lightBrown hover:bg-dynac-sand'}`}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-dynac-nutBrown">Day {currentDay.day}</span>
          <span className="font-bold text-dynac-darkChoc text-lg leading-none">{dateDetails.full}</span>
        </div>
        <button onClick={() => changeDay(1)} disabled={selectedDayIndex === itinerary.length - 1} className={`p-2 rounded-full ${selectedDayIndex === itinerary.length - 1 ? 'text-gray-300' : 'text-dynac-lightBrown hover:bg-dynac-sand'}`}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Desktop Date Strip */}
      <div className="relative w-full hidden md:block">
        <button onClick={() => scroll('left')} className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg border border-dynac-sand text-dynac-lightBrown p-2 rounded-full hover:scale-110 transition-transform flex">
          <ChevronLeft size={20} />
        </button>
        <div ref={scrollContainerRef} className="flex overflow-x-auto gap-3 py-4 px-2 no-scrollbar snap-x snap-mandatory scroll-smooth">
          {itinerary.map((day, index) => {
            const active = index === selectedDayIndex;
            const today = isToday(day.date);
            const { weekday, day: dayNum, month } = parseDateDetails(day.date);
            return (
              <button key={day.day} onClick={() => setSelectedDayIndex(index)} className={`snap-center flex-shrink-0 relative flex flex-col items-center justify-between w-24 h-28 p-3 rounded-2xl border transition-all duration-300 ${active ? 'bg-dynac-lightBrown text-dynac-cream shadow-xl scale-105 border-dynac-lightBrown z-10' : 'bg-white text-dynac-nutBrown border-dynac-sand hover:border-dynac-lightBrown/30 hover:bg-white/80'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-dynac-sand' : 'text-dynac-lightBrown/50'}`}>Day {day.day}</span>
                <div className="flex flex-col items-center -mt-1">
                  <span className={`text-3xl font-black leading-none ${active ? 'text-white' : 'text-dynac-darkChoc'}`}>{dayNum}</span>
                  <span className={`text-xs font-medium uppercase ${active ? 'text-dynac-sand' : 'text-dynac-nutBrown'}`}>{month}</span>
                </div>
                <span className={`text-sm font-bold ${active ? 'text-dynac-cream' : 'text-dynac-lightBrown'}`}>{weekday}</span>
                {today && <div className="absolute top-2 right-2"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span></div>}
              </button>
            );
          })}
        </div>
        <button onClick={() => scroll('right')} className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg border border-dynac-sand text-dynac-lightBrown p-2 rounded-full hover:scale-110 transition-transform flex">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Alerts */}
      {currentDay.activeAlerts && currentDay.activeAlerts.length > 0 && (
        <div className="space-y-3">
          {currentDay.activeAlerts.map(alert => <AlertBanner key={alert.id} alert={alert} />)}
        </div>
      )}

      {/* Weather & Location & Currency */}
      <div className="bg-gradient-to-br from-dynac-sand to-dynac-sand/80 p-5 rounded-2xl border border-dynac-lightBrown/10 shadow-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            {/* Location Title - Proper Capitalization */}
            <div className="flex items-center gap-3 mb-3">
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDay.location)}`} target="_blank" rel="noopener noreferrer" className="text-2xl font-bold text-dynac-darkChoc leading-tight hover:underline decoration-dynac-lightBrown/30 flex items-center gap-2 group capitalize">
                {currentDay.location}
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
            </div>

            {/* Date & Greeting Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-dynac-nutBrown text-sm font-medium">{dateDetails.full}</span>
              <span className="w-1 h-1 bg-dynac-nutBrown/40 rounded-full"></span>
              <button
                onClick={handlePlayGreeting}
                disabled={isPlayingGreeting}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all duration-300 ${isPlayingGreeting
                  ? 'bg-dynac-lightBrown text-dynac-cream border-dynac-lightBrown scale-105 shadow-md'
                  : 'bg-white text-dynac-darkChoc border-dynac-lightBrown/20 hover:bg-dynac-cream hover:shadow-md hover:border-dynac-lightBrown/40'}`}
              >
                <Volume2 size={14} className={isPlayingGreeting ? 'animate-pulse' : ''} />
                <span>{greetingText || "🗣️ Play Local Greeting"}</span>
              </button>
            </div>

            {/* Currency Badge */}
            {currencyDisplay && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                  <DollarSign size={14} />
                  {currencyDisplay}
                </span>
              </div>
            )}

            {/* Weather & Outfit Info */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg text-sm text-dynac-darkChoc font-medium border border-dynac-sand shadow-sm">
                <CloudRain size={14} className="text-blue-500" />
                <span>{currentDay.weather.tempMax} / {currentDay.weather.tempMin} • {currentDay.weather.condition}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg text-sm text-dynac-darkChoc font-medium border border-dynac-sand shadow-sm">
                <span className="text-orange-500 font-bold">UV</span>
                <span>{currentDay.weather.uvIndex}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg text-sm text-dynac-nutBrown border border-dynac-sand/50">
                <Shirt size={14} />
                {currentDay.outfit}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-dynac-lightBrown font-bold uppercase tracking-widest text-xs">Day {currentDay.day} Timeline</h3>
          <div className="flex gap-2">
            <div className="h-px bg-dynac-lightBrown/20 flex-1 ml-4 self-center"></div>
            <button onClick={() => setIsAdding(!isAdding)} className="text-dynac-lightBrown hover:bg-dynac-sand p-1 rounded transition-colors" title="Add Activity">
              {isAdding ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="mb-4 bg-white p-4 rounded-lg border border-dynac-lightBrown/20 shadow-md">
            <h4 className="text-sm font-bold text-dynac-darkChoc mb-3">Add New Activity</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="time" value={newItem.time} onChange={e => setNewItem({ ...newItem, time: e.target.value })} className="p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none" />
              <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value as any })} className="p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none">
                <option value="activity">Activity</option>
                <option value="dining">Dining</option>
                <option value="transport">Transport</option>
                <option value="leisure">Leisure</option>
              </select>
            </div>
            <input type="text" placeholder="Activity Name" value={newItem.activity} onChange={e => setNewItem({ ...newItem, activity: e.target.value })} className="w-full p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none mb-3" />
            <input type="text" placeholder="Location" value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} className="w-full p-2 text-sm border rounded bg-dynac-cream border-dynac-sand focus:border-dynac-lightBrown outline-none mb-3" />
            <button onClick={handleSave} className="w-full py-2 bg-dynac-lightBrown text-dynac-cream rounded font-medium text-sm hover:opacity-90 transition-opacity">Add to Timeline</button>
          </div>
        )}

        <div className="space-y-4">
          {currentDay.items.map((item, idx) => (
            <ItineraryCard key={item.id} item={item} isLast={idx === currentDay.items.length - 1} isCurrent={false} onSwap={() => onSwapRequest(selectedDayIndex, item.id)} />
          ))}
          {currentDay.items.length === 0 && <div className="text-center py-10 text-dynac-nutBrown italic text-sm">No activities planned for this day yet.</div>}
        </div>
      </div>
    </div>
  );
};
