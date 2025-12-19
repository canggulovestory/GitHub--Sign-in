
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, DayPlan, UserPreferences, Traveler, ChecklistItem } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { Send, Mic, Sparkles, MapPin, Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  context: {
    itinerary: DayPlan[];
    preferences: UserPreferences;
    travelers: Traveler[];
    checklist: ChecklistItem[];
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, setHistory, context }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Location State
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isProcessing]);

  // --- LOCATION HANDLER ---
  const toggleLocation = () => {
    if (location) {
      setLocation(null); // Toggle off
      return;
    }

    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert("Unable to retrieve location. Please check permissions.");
        setIsLocating(false);
      }
    );
  };

  // --- AUTO-RESPONSE LOGIC ---
  useEffect(() => {
    const processLastMessage = async () => {
      const lastMsg = history[history.length - 1];

      if (lastMsg && lastMsg.role === 'user' && lastMsg.pendingResponse && !isProcessing) {
        setIsProcessing(true);

        try {
          const previousHistory = history.slice(0, -1);

          // Inject Location into Context with null safety
          const enhancedContext = {
            itinerary: context?.itinerary || [],
            preferences: context?.preferences || { dietary: [], customAvoidances: [], nightlife: '', familyFriendly: false },
            travelers: context?.travelers || [],
            checklist: context?.checklist || [],
            userLocation: location
          };

          const responseText = await sendMessageToGemini(lastMsg.text, previousHistory, enhancedContext);

          const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
          };

          setHistory(prev => {
            const newHistory = [...prev];
            const lastIndex = newHistory.length - 1;
            if (lastIndex >= 0) {
              newHistory[lastIndex] = { ...newHistory[lastIndex], pendingResponse: false };
            }
            return [...newHistory, botMsg];
          });

        } catch (e: any) {
          console.error("Auto-response error:", e);
          const errorMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: `I encountered an issue: ${e?.message || 'Unknown error'}. Please try again.`,
            timestamp: new Date(),
            isSystemAlert: true
          };
          setHistory(prev => {
            const newHistory = [...prev];
            const lastIndex = newHistory.length - 1;
            if (lastIndex >= 0) {
              newHistory[lastIndex] = { ...newHistory[lastIndex], pendingResponse: false };
            }
            return [...newHistory, errorMsg];
          });
        } finally {
          setIsProcessing(false);
        }
      }
    };

    processLastMessage();
  }, [history]);

  // --- USER INPUT HANDLER ---
  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
      pendingResponse: true
    };

    setHistory(prev => [...prev, userMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dynac-cream rounded-xl overflow-hidden border border-dynac-nutBrown/10 shadow-sm relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scroll-smooth">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-dynac-nutBrown text-center opacity-60">
            <Sparkles size={48} className="mb-4 text-dynac-lightBrown" />
            <p className="font-bold">I am GAIDE.</p>
            <p className="text-sm">Your proactive travel OS.</p>
          </div>
        )}

        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                  ? 'bg-dynac-lightBrown text-dynac-cream rounded-br-none' // Rule 3: Primary Action Color
                  : 'bg-dynac-sand text-dynac-darkChoc rounded-bl-none border border-dynac-sand' // Rule 4b: Info
                }`}
            >
              {msg.isSystemAlert && (
                <div className="text-xs font-bold text-dynac-alert mb-1 flex items-center gap-1">
                  GAIDE SYSTEM ALERT
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-dynac-cream/70' : 'text-dynac-darkChoc/60'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-dynac-sand p-3 rounded-2xl rounded-bl-none border border-dynac-sand flex items-center gap-2">
              <div className="w-2 h-2 bg-dynac-darkChoc rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-dynac-darkChoc rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-dynac-darkChoc rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-dynac-cream border-t border-dynac-sand w-full z-10">

        {/* Location Indicator if active */}
        {location && (
          <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold mb-2 ml-2 animate-in fade-in slide-in-from-bottom-1">
            <MapPin size={10} />
            Location Attached: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}

        <div className="flex items-center gap-2 bg-white p-2 rounded-full border border-dynac-sand focus-within:border-dynac-lightBrown transition-colors shadow-sm">
          {/* Location Toggle Button */}
          <button
            onClick={toggleLocation}
            className={`p-2 rounded-full transition-colors relative ${location ? 'text-blue-600 bg-blue-50' : 'text-dynac-nutBrown hover:text-dynac-lightBrown'}`}
            title="Share Location"
          >
            {isLocating ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
            {location && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
          </button>

          <button className="p-2 text-dynac-nutBrown hover:text-dynac-lightBrown transition-colors">
            <Mic size={20} />
          </button>

          <input
            type="text"
            className="flex-1 bg-transparent text-dynac-darkChoc placeholder-dynac-nutBrown/50 focus:outline-none text-sm"
            placeholder="Ask GAIDE..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`p-2 rounded-full transition-all ${input.trim()
                ? 'bg-dynac-lightBrown text-dynac-cream shadow-md'
                : 'bg-dynac-sand text-dynac-darkChoc/50'
              }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
