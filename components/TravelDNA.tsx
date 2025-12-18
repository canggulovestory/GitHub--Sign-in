
import React, { useState } from 'react';
import { UserPreferences, Traveler } from '../types';
import { User, Heart, Settings, Utensils, Moon, ShieldAlert, Edit2, Check, AlertOctagon, Plus, X } from 'lucide-react';

interface TravelDNAProps {
  preferences: UserPreferences;
  travelers: Traveler[];
  onUpdatePreferences: (prefs: UserPreferences) => void;
}

export const TravelDNA: React.FC<TravelDNAProps> = ({ preferences, travelers, onUpdatePreferences }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPrefs, setTempPrefs] = useState<UserPreferences>(preferences);
  const [newAvoidance, setNewAvoidance] = useState('');

  const toggleEdit = () => {
    if (isEditing) {
      // Cancel
      setTempPrefs(preferences);
    }
    setIsEditing(!isEditing);
  };

  const savePrefs = () => {
    onUpdatePreferences(tempPrefs);
    setIsEditing(false);
  };

  const handleDietaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const array = val.split(',').map(s => s.trim()).filter(s => s);
    setTempPrefs({ ...tempPrefs, dietary: array });
  };

  const addAvoidance = () => {
    if (newAvoidance.trim()) {
      setTempPrefs(prev => ({
        ...prev,
        customAvoidances: [...prev.customAvoidances, newAvoidance.trim()]
      }));
      setNewAvoidance('');
    }
  };

  const removeAvoidance = (index: number) => {
    setTempPrefs(prev => ({
      ...prev,
      customAvoidances: prev.customAvoidances.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-dynac-darkChoc mb-2">Travel DNA & Profile</h2>
          <p className="text-dynac-nutBrown text-sm">ID 003/016: Contextual Filtering Active</p>
        </div>
        <button 
          onClick={isEditing ? savePrefs : toggleEdit}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
             isEditing 
               ? 'bg-dynac-lightBrown text-dynac-cream' 
               : 'bg-dynac-sand text-dynac-darkChoc hover:bg-dynac-lightBrown/10'
          }`}
        >
          {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      {/* Travelers Card */}
      <div className="bg-dynac-sand p-5 rounded-xl border border-dynac-sand shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="text-dynac-lightBrown" />
          <h3 className="text-lg font-semibold text-dynac-darkChoc">Party Profile (MPP)</h3>
        </div>
        <div className="space-y-3">
          {travelers.map(t => (
            <div key={t.id} className="flex justify-between items-center p-3 bg-dynac-cream rounded-lg">
              <div>
                <p className="text-dynac-darkChoc font-medium">{t.name}</p>
                <p className="text-dynac-nutBrown text-xs">{t.passportNumber}</p>
              </div>
              <span className="text-xs bg-dynac-lightBrown text-dynac-cream px-2 py-1 rounded-full">{t.nationality}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DNA Settings */}
      <div className="bg-dynac-sand p-5 rounded-xl border border-dynac-sand shadow-sm relative">
         <div className="flex items-center gap-2 mb-4">
          <Settings className="text-dynac-nutBrown" />
          <h3 className="text-lg font-semibold text-dynac-darkChoc">Algorithm Preferences</h3>
        </div>
        
        <div className="space-y-4">
          {/* Dietary */}
          <div className="flex gap-3 items-start">
             <Utensils size={18} className="text-dynac-darkChoc mt-1" />
             <div className="flex-1">
               <p className="text-dynac-darkChoc text-sm font-medium">Dietary Filters</p>
               {isEditing ? (
                  <input 
                    type="text"
                    className="w-full mt-2 p-2 text-sm border rounded bg-white border-dynac-lightBrown/20 focus:outline-none focus:border-dynac-lightBrown"
                    value={tempPrefs.dietary.join(', ')}
                    onChange={handleDietaryChange}
                    placeholder="Comma separated (e.g. Halal, Vegan)"
                  />
               ) : (
                 <div className="flex gap-2 mt-2 flex-wrap">
                   {preferences.dietary.map((d, i) => (
                     <span key={i} className="text-xs bg-dynac-success/20 text-dynac-darkChoc px-2 py-1 rounded border border-dynac-success/30 font-medium">{d}</span>
                   ))}
                 </div>
               )}
             </div>
          </div>

          <div className="h-px bg-dynac-nutBrown/20" />

          {/* Nightlife */}
          <div className="flex gap-3 items-start">
             <Moon size={18} className="text-dynac-darkChoc mt-1" />
             <div className="flex-1">
               <p className="text-dynac-darkChoc text-sm font-medium">Nightlife</p>
               {isEditing ? (
                 <select 
                    className="w-full mt-2 p-2 text-sm border rounded bg-white border-dynac-lightBrown/20 focus:outline-none focus:border-dynac-lightBrown"
                    value={tempPrefs.nightlife}
                    onChange={e => setTempPrefs({...tempPrefs, nightlife: e.target.value})}
                 >
                   <option value="High-end lounge, Quiet Pubs">High-end/Quiet</option>
                   <option value="Clubbing, Dance">Clubbing</option>
                   <option value="None">None</option>
                 </select>
               ) : (
                 <p className="text-dynac-nutBrown text-xs mt-1">{preferences.nightlife}</p>
               )}
             </div>
          </div>

          <div className="h-px bg-dynac-nutBrown/20" />
          
          {/* Family Friendly */}
          <div className="flex gap-3 items-start">
             <Heart size={18} className="text-dynac-darkChoc mt-1" />
             <div className="flex-1">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-dynac-darkChoc text-sm font-medium">Family Friendly</p>
                 {isEditing ? (
                   <button 
                     onClick={() => setTempPrefs({...tempPrefs, familyFriendly: !tempPrefs.familyFriendly})}
                     className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${tempPrefs.familyFriendly ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-gray-300 text-gray-600'}`}
                   >
                     {tempPrefs.familyFriendly ? 'ON' : 'OFF'}
                   </button>
                 ) : (
                   <span className={`text-xs px-2 py-0.5 rounded font-bold ${preferences.familyFriendly ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-gray-400'}`}>
                     {preferences.familyFriendly ? 'ON' : 'OFF'}
                   </span>
                 )}
               </div>
               <p className="text-dynac-nutBrown text-xs">Prioritizes safe, non-controversial locations.</p>
             </div>
          </div>

          <div className="h-px bg-dynac-nutBrown/20" />

          {/* Tourist Traps */}
          <div className="flex gap-3 items-start">
             <AlertOctagon size={18} className="text-dynac-darkChoc mt-1" />
             <div className="flex-1">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-dynac-darkChoc text-sm font-medium">Avoid Tourist Traps</p>
                 {isEditing ? (
                   <button 
                     onClick={() => setTempPrefs({...tempPrefs, avoidTouristTraps: !tempPrefs.avoidTouristTraps})}
                     className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${tempPrefs.avoidTouristTraps ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-gray-300 text-gray-600'}`}
                   >
                     {tempPrefs.avoidTouristTraps ? 'ON' : 'OFF'}
                   </button>
                 ) : (
                   <span className={`text-xs px-2 py-0.5 rounded font-bold ${preferences.avoidTouristTraps ? 'bg-dynac-lightBrown text-dynac-cream' : 'bg-gray-400'}`}>
                     {preferences.avoidTouristTraps ? 'ON' : 'OFF'}
                   </span>
                 )}
               </div>
               <p className="text-dynac-nutBrown text-xs">Filters out overcrowded, low-quality tourist hubs.</p>
             </div>
          </div>

          <div className="h-px bg-dynac-nutBrown/20" />

          {/* Avoidances */}
          <div className="flex gap-3 items-start">
             <ShieldAlert size={18} className="text-dynac-alert mt-1" />
             <div className="flex-1">
               <p className="text-dynac-darkChoc text-sm font-medium">Specific Avoidances (ID 017)</p>
               
               {isEditing && (
                 <div className="flex gap-2 mt-2">
                   <input 
                     type="text"
                     value={newAvoidance}
                     onChange={(e) => setNewAvoidance(e.target.value)}
                     className="flex-1 p-1.5 text-xs border rounded bg-white border-dynac-lightBrown/20 focus:outline-none focus:border-dynac-lightBrown"
                     placeholder="Add avoidance (e.g. Casinos)"
                     onKeyDown={(e) => e.key === 'Enter' && addAvoidance()}
                   />
                   <button onClick={addAvoidance} className="p-1.5 bg-dynac-lightBrown text-dynac-cream rounded hover:opacity-90">
                     <Plus size={14} />
                   </button>
                 </div>
               )}

               <div className="flex flex-col gap-1 mt-2">
                 {(isEditing ? tempPrefs.customAvoidances : preferences.customAvoidances).map((a, i) => (
                   <div key={i} className="flex items-center justify-between text-xs text-dynac-alert font-medium bg-red-50 p-1 rounded">
                      <span className="flex items-center gap-1">• {a}</span>
                      {isEditing && (
                        <button onClick={() => removeAvoidance(i)} className="text-red-400 hover:text-red-700">
                          <X size={12} />
                        </button>
                      )}
                   </div>
                 ))}
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
