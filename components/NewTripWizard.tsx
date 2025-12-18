
import React, { useState } from 'react';
import { DayPlan } from '../types';
import { Calendar, MapPin, Users, Check, ChevronRight, Sparkles } from 'lucide-react';
import { generateTripProposal } from '../services/geminiService';
import { INITIAL_PREFERENCES } from '../constants';

interface NewTripWizardProps {
   onComplete: (itinerary: DayPlan[], currency?: string) => void;
   onCancel: () => void;
}

export const NewTripWizard: React.FC<NewTripWizardProps> = ({ onComplete, onCancel }) => {
   const MOCK_LOCATIONS = [
      "Japan (All Country)", "Tokyo, Japan", "Kyoto, Japan", "Osaka, Japan",
      "France (All Country)", "Paris, France", "Nice, France", "Lyon, France",
      "Italy (All Country)", "Rome, Italy", "Milan, Italy", "Venice, Italy",
      "Indonesia (All Country)", "Bali, Indonesia", "Jakarta, Indonesia",
      "Spain (All Country)", "Barcelona, Spain", "Madrid, Spain",
      "UK (All Country)", "London, UK", "Manchester, UK",
      "USA (All Country)", "New York, USA", "Los Angeles, USA", "San Francisco, USA",
      "Netherlands (All Country)", "Amsterdam, Netherlands", "Rotterdam, Netherlands",
      "Germany (All Country)", "Berlin, Germany", "Munich, Germany"
   ];

   const [step, setStep] = useState(1);
   const [isGenerating, setIsGenerating] = useState(false);
   const [draftItinerary, setDraftItinerary] = useState<DayPlan[] | null>(null);
   const [generatedCurrency, setGeneratedCurrency] = useState<string>("USD");
   const [formData, setFormData] = useState({
      destination: '',
      startDate: '',
      endDate: '',
      duration: 3,
      adults: 1,
      infants: 0,
      aiGen: false
   });

   // Location Autocomplete State
   const [suggestions, setSuggestions] = useState<string[]>([]);
   const [showSuggestions, setShowSuggestions] = useState(false);

   const handleLocationChange = (val: string) => {
      setFormData({ ...formData, destination: val });
      if (val.length > 1) {
         const matches = MOCK_LOCATIONS.filter(loc => loc.toLowerCase().includes(val.toLowerCase()));
         setSuggestions(matches);
         setShowSuggestions(true);
      } else {
         setSuggestions([]);
         setShowSuggestions(false);
      }
   };

   const selectLocation = (loc: string) => {
      setFormData({ ...formData, destination: loc });
      setShowSuggestions(false);
   };

   // Date Logic
   const handleStartDateChange = (val: string) => {
      // If start date changes, keep duration constant and update end date
      const data = { ...formData, startDate: val };
      if (val && data.duration) {
         const start = new Date(val);
         const end = new Date(start);
         end.setDate(start.getDate() + data.duration);
         data.endDate = end.toISOString().split('T')[0];
      }
      setFormData(data);
   };

   const handleDurationChange = (val: number) => {
      // If duration changes, update end date based on start date
      const days = Math.max(1, val);
      const data = { ...formData, duration: days };
      if (data.startDate) {
         const start = new Date(data.startDate);
         const end = new Date(start);
         end.setDate(start.getDate() + days);
         data.endDate = end.toISOString().split('T')[0];
      }
      setFormData(data);
   };

   const handleEndDateChange = (val: string) => {
      // If end date changes, calculate new duration
      if (!formData.startDate) {
         setFormData({ ...formData, endDate: val });
         return;
      }
      const start = new Date(formData.startDate);
      const end = new Date(val);

      // Difference in ms
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setFormData({
         ...formData,
         endDate: val,
         duration: diffDays
      });
   };

   const generateTrip = () => {
      // Generate mock itinerary based on inputs
      const newItinerary: DayPlan[] = [];
      const start = new Date(formData.startDate || new Date());

      // AI Mock Logic
      const viralPlaces = ['Viral Café', 'Hidden Gem Spot', 'Trending Museum'];

      for (let i = 0; i < formData.duration; i++) {
         const currentDate = new Date(start);
         currentDate.setDate(start.getDate() + i);

         const year = currentDate.getFullYear();
         const month = String(currentDate.getMonth() + 1).padStart(2, '0');
         const day = String(currentDate.getDate()).padStart(2, '0');
         const dateStr = `${year}-${month}-${day}`;

         const isViralDay = formData.aiGen && i % 2 === 0;

         newItinerary.push({
            day: i + 1,
            date: dateStr,
            location: formData.destination,
            language: 'English',
            items: isViralDay ? [{
               id: `ai-${i}`,
               time: '14:00',
               activity: `Visit ${viralPlaces[i % 3]} (AI Pick)`,
               location: formData.destination,
               type: 'activity',
               notes: 'Top rated by social trends'
            }] : [],
            weather: { tempMax: '22°C', tempMin: '15°C', condition: 'Sunny', precipChance: '10%', uvIndex: 'Moderate' }
         });
      }
      return newItinerary;
   };



   const generateEmptyItinerary = (startDate: string, duration: number): DayPlan[] => {
      return Array.from({ length: duration }).map((_, i) => ({
         day: i + 1,
         date: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + i)).toISOString().split('T')[0],
         location: formData.destination,
         items: [],
         weather: { tempMax: "20°C", tempMin: "15°C", condition: "Sunny", precipChance: "0%", uvIndex: "High" },
         outfit: 'Casual',
         language: 'English',
         activeAlerts: []
      }));
   };

   const handleNext = async () => {
      if (step < 4) {
         setStep(step + 1);
      } else if (step === 4) {
         setIsGenerating(true);
         try {
            if (formData.aiGen) {
               // Real AI Generation
               const { itinerary: draft, currency } = await generateTripProposal(
                  formData.destination,
                  formData.duration,
                  `${formData.adults} Adults, ${formData.infants} Children`,
                  INITIAL_PREFERENCES
               );
               setDraftItinerary(draft);
               // Store currency in a temp way or pass it directly later. 
               // Since we don't have a state for it, let's attach it to the first item for now or just trust we have it?
               // Better: Add a state for generatedCurrency
               setGeneratedCurrency(currency);
            } else {
               // Mock Generation
               const draft = generateTrip();
               setDraftItinerary(draft);
               setGeneratedCurrency("USD"); // Default for manual
            }
            setStep(5);
         } catch (error) {
            console.error(error);
            alert("Failed to generate trip. Please try again.");
         } finally {
            setIsGenerating(false);
         }
      } else {
         if (step === 5) {
            if (draftItinerary) {
               onComplete(draftItinerary, generatedCurrency);
            }
            return;
         }
      }
   };

   return (
      <div className="h-full flex flex-col bg-warm-gradient page-transition">
         <div className="p-6 border-b border-dynac-sand/30">
            <h2 className="text-2xl font-bold text-dynac-darkChoc">Plan New Trip</h2>
            <div className="flex gap-2 mt-4">
               {[1, 2, 3, 4, 5].map(s => (
                  <div
                     key={s}
                     className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= s
                           ? 'bg-dynac-lightBrown shadow-sm'
                           : 'bg-dynac-sand'
                        } ${step === s ? 'scale-y-125' : ''}`}
                  />
               ))}
            </div>
         </div>

         <div className="flex-1 p-6 overflow-y-auto">
            {step === 1 && (
               <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <h3 className="text-lg font-bold text-dynac-darkChoc flex items-center gap-2">
                     <MapPin size={20} className="text-dynac-lightBrown" /> Where to?
                  </h3>
                  <div className="relative">
                     <input
                        type="text"
                        placeholder="City or Country (e.g. Japan)"
                        className="w-full p-4 text-lg border-2 border-dynac-sand rounded-xl bg-white focus:border-dynac-lightBrown outline-none"
                        value={formData.destination}
                        onChange={e => handleLocationChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                        autoFocus
                     />
                     {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-xl border border-dynac-sand z-10 max-h-48 overflow-y-auto">
                           {suggestions.map(loc => (
                              <button
                                 key={loc}
                                 onClick={() => selectLocation(loc)}
                                 className="w-full text-left px-4 py-3 hover:bg-dynac-sand/30 border-b border-dynac-sand/20 last:border-0 font-medium text-dynac-darkChoc transition-colors"
                              >
                                 {loc}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                     <p className="font-bold mb-1">GAIDE Insight:</p>
                     Entering a destination will automatically configure language settings and visa requirements.
                  </div>
               </div>
            )}

            {step === 2 && (
               <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <h3 className="text-lg font-bold text-dynac-darkChoc flex items-center gap-2">
                     <Calendar size={20} className="text-dynac-lightBrown" /> When?
                  </h3>
                  <div className="space-y-4">
                     <div className="bg-white p-4 rounded-xl border border-dynac-sand">
                        <label className="text-xs font-bold uppercase text-dynac-nutBrown mb-2 block">Start Date</label>
                        <input
                           type="date"
                           className="w-full text-lg outline-none font-bold text-dynac-darkChoc"
                           value={formData.startDate}
                           onChange={e => handleStartDateChange(e.target.value)}
                        />
                     </div>
                     <div className="flex gap-4">
                        <div className="flex-1 bg-white p-4 rounded-xl border border-dynac-sand">
                           <label className="text-xs font-bold uppercase text-dynac-nutBrown mb-2 block">Duration</label>
                           <input
                              type="number"
                              min="1"
                              className="w-full text-lg outline-none font-bold text-dynac-darkChoc"
                              value={formData.duration}
                              onChange={e => handleDurationChange(parseInt(e.target.value))}
                           />
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-xl border border-dynac-sand">
                           <label className="text-xs font-bold uppercase text-dynac-nutBrown mb-2 block">End Date</label>
                           <input
                              type="date"
                              className="w-full text-lg outline-none font-bold text-dynac-darkChoc"
                              value={formData.endDate}
                              onChange={e => handleEndDateChange(e.target.value)}
                           />
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {step === 3 && (
               <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <h3 className="text-lg font-bold text-dynac-darkChoc flex items-center gap-2">
                     <Users size={20} className="text-dynac-lightBrown" /> Who is traveling?
                  </h3>

                  {/* Adults Counter */}
                  <div className="p-4 border-2 border-dynac-sand rounded-xl bg-white flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="font-bold text-dynac-darkChoc">Adults</span>
                        <span className="text-xs text-dynac-nutBrown">Age 13+</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <button
                           onClick={() => setFormData(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))}
                           className="w-8 h-8 rounded-full bg-dynac-sand flex items-center justify-center font-bold hover:bg-dynac-lightBrown/20"
                        >
                           -
                        </button>
                        <span className="text-xl font-bold w-4 text-center">{formData.adults}</span>
                        <button
                           onClick={() => setFormData(p => ({ ...p, adults: p.adults + 1 }))}
                           className="w-8 h-8 rounded-full bg-dynac-sand flex items-center justify-center font-bold hover:bg-dynac-lightBrown/20"
                        >
                           +
                        </button>
                     </div>
                  </div>

                  {/* Infants Counter */}
                  <div className="p-4 border-2 border-dynac-sand rounded-xl bg-white flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="font-bold text-dynac-darkChoc">Infants & Children</span>
                        <span className="text-xs text-dynac-nutBrown">Age 0-12</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <button
                           onClick={() => setFormData(p => ({ ...p, infants: Math.max(0, p.infants - 1) }))}
                           className="w-8 h-8 rounded-full bg-dynac-sand flex items-center justify-center font-bold hover:bg-dynac-lightBrown/20"
                        >
                           -
                        </button>
                        <span className="text-xl font-bold w-4 text-center">{formData.infants}</span>
                        <button
                           onClick={() => setFormData(p => ({ ...p, infants: p.infants + 1 }))}
                           className="w-8 h-8 rounded-full bg-dynac-sand flex items-center justify-center font-bold hover:bg-dynac-lightBrown/20"
                        >
                           +
                        </button>
                     </div>
                  </div>

                  <div className="text-sm text-dynac-nutBrown italic">
                     Note: We will apply your existing "Travel DNA" preferences to this trip automatically.
                  </div>
               </div>
            )}

            {step === 4 && (
               <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <h3 className="text-lg font-bold text-dynac-darkChoc flex items-center gap-2">
                     <Check size={20} className="text-dynac-lightBrown" /> How should we plan?
                  </h3>

                  <button
                     onClick={() => setFormData({ ...formData, aiGen: true })}
                     className={`w-full p-6 rounded-2xl border-2 transition-all text-left group flex items-start gap-4 ${formData.aiGen
                        ? 'border-dynac-lightBrown bg-dynac-lightBrown/10'
                        : 'border-dynac-sand bg-white hover:border-dynac-lightBrown/50'
                        }`}
                  >
                     <div className={`p-3 rounded-full ${formData.aiGen ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-purple-100 text-purple-600'}`}>
                        <Check size={24} />
                        {/* Actually Sparkles would be better but I only have Check imported in current context or maybe not even that, let's reuse what we have or generic */}
                        {/* Ah, I see Check is imported. I'll stick to simple icons or no icon if missing */}
                     </div>
                     <div>
                        <h4 className="font-bold text-lg text-dynac-darkChoc group-hover:text-dynac-lightBrown transition-colors">AI Viral Proposal</h4>
                        <p className="text-sm text-dynac-nutBrown mt-1">
                           Generate a proposal based on viral trends, top reviews, and hidden gems.
                           <span className="block mt-1 text-xs text-purple-600 font-bold">✨ Recommended for discovery</span>
                        </p>
                     </div>
                  </button>

                  <button
                     onClick={() => setFormData({ ...formData, aiGen: false })}
                     className={`w-full p-6 rounded-2xl border-2 transition-all text-left group flex items-start gap-4 ${!formData.aiGen
                        ? 'border-dynac-lightBrown bg-dynac-lightBrown/10'
                        : 'border-dynac-sand bg-white hover:border-dynac-lightBrown/50'
                        }`}
                  >
                     <div className={`p-3 rounded-full ${!formData.aiGen ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-gray-100 text-gray-600'}`}>
                        <div className="w-6 h-6 rounded-full border-2 border-current" />
                     </div>
                     <div>
                        <h4 className="font-bold text-lg text-dynac-darkChoc group-hover:text-dynac-lightBrown transition-colors">Standard Plan</h4>
                        <p className="text-sm text-dynac-nutBrown mt-1">
                           I'll build the itinerary myself. Just set up the basics.
                        </p>
                     </div>
                  </button>
               </div>
            )}

            {step === 5 && draftItinerary && ( // Review Step
               <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="text-center mb-6">
                     <h3 className="text-2xl font-bold text-dynac-darkChoc">Trip Summary</h3>
                     <p className="text-dynac-nutBrown">Review your AI-generated draft before finalizing.</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-2 border-dynac-sand shadow-sm">
                     <div className="flex justify-between items-start mb-4 pb-4 border-b border-dynac-sand">
                        <div>
                           <h4 className="text-xl font-bold text-dynac-darkChoc">{formData.destination}</h4>
                           <p className="text-sm text-dynac-nutBrown">{formData.duration} Days • {formData.adults + formData.infants} Travelers</p>
                        </div>
                        {formData.aiGen && (
                           <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">Viral AI</span>
                        )}
                     </div>

                     <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                        {draftItinerary.map((day, idx) => (
                           <div key={idx} className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-dynac-sand flex flex-col items-center justify-center shrink-0">
                                 <span className="text-xs font-bold text-dynac-nutBrown">DAY</span>
                                 <span className="text-lg font-bold text-dynac-darkChoc">{day.day}</span>
                              </div>
                              <div>
                                 <h5 className="font-bold text-dynac-darkChoc text-sm">{day.date}</h5>
                                 {day.items.length > 0 ? (
                                    day.items.map((item, i) => (
                                       <p key={i} className="text-xs text-dynac-nutBrown mt-1 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                          {item.activity}
                                       </p>
                                    ))
                                 ) : (
                                    <p className="text-xs text-dynac-nutBrown italic mt-1">Free day</p>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>

         <div className="p-6 border-t border-dynac-lightBrown/10 flex gap-4">
            <button
               onClick={onCancel}
               className="flex-1 py-3 bg-dynac-sand text-dynac-darkChoc rounded-xl font-bold hover:bg-dynac-sand/80"
            >
               Cancel
            </button>
            <button
               onClick={handleNext}
               disabled={!formData.destination || (step === 2 && !formData.startDate)}
               className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${!formData.destination ? 'bg-dynac-lightBrown/50 cursor-not-allowed text-dynac-cream' : 'bg-dynac-lightBrown text-dynac-cream hover:opacity-90'
                  }`}
            >
               {step === 5 ? 'Confirm & Go' : 'Next'}
               {step === 5 ? <Check size={18} /> : <ChevronRight size={18} />}
            </button>
         </div>
      </div>
   );
};

