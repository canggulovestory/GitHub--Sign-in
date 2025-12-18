
import { DayPlan, DocumentFile, Traveler, UserPreferences, ChecklistItem, Trip } from './types';

export const INITIAL_PREFERENCES: UserPreferences = {
   homeCurrency: 'USD',
   dietary: [],
   nightlife: '',
   familyFriendly: false,
   avoidTouristTraps: true,
   customAvoidances: []
};

export const MOCK_TRAVELERS: Traveler[] = [];

export const MOCK_TRIPS: Trip[] = [
   {
      id: 'trip_1',
      name: 'Spring in Amsterdam',
      destination: 'Amsterdam, Netherlands',
      status: 'active',
      startDate: '2024-04-10',
      endDate: '2024-04-15',
      image: 'https://images.unsplash.com/photo-1512470876302-687da745313y?q=80&w=1000&auto=format&fit=crop',
      currency: 'EUR',
      itinerary: [
         {
            day: 1,
            date: '2024-04-10',
            location: 'Amsterdam',
            language: 'Dutch',
            items: [
               { id: '1a', time: '10:00', activity: 'Arrival & Check-in', type: 'transport', location: 'Hotel Pulitzer', notes: 'Confirmation #12345' },
               { id: '1b', time: '13:00', activity: 'Canal Cruise', type: 'activity', location: 'Prinsengracht', notes: 'Tickets in Apple Wallet' },
               { id: '1c', time: '19:00', activity: 'Dinner at Moeders', type: 'dining', location: 'Rozengracht 251', notes: 'Reservation for 2' }
            ],
            weather: { tempMax: '15°C', tempMin: '8°C', condition: 'Partly Cloudy', precipChance: '10%', uvIndex: '3' },
            outfit: 'Layers: Light sweater, comfortable walking shoes. Bring a rain jacket just in case.'
         },
         {
            day: 2,
            date: '2024-04-11',
            location: 'Amsterdam',
            language: 'Dutch',
            items: [
               { id: '2a', time: '09:00', activity: 'Rijksmuseum', type: 'activity', location: 'Museumstraat 1', notes: 'Look for The Night Watch first to avoid crowds.' },
               { id: '2b', time: '12:30', activity: 'Lunch at Vondelpark', type: 'dining', location: 'Vondelpark 3', notes: 'Try the appeltaart.' },
               { id: '2c', time: '15:00', activity: 'Van Gogh Museum', type: 'activity', location: 'Museumplein 6', notes: 'Audio guide recommended.' }
            ],
            weather: { tempMax: '16°C', tempMin: '9°C', condition: 'Sunny', precipChance: '0%', uvIndex: '4' },
            outfit: 'Smart casual. Sunglasses needed.'
         }
      ]
   },
   {
      id: 'trip_2',
      name: 'Bali Retreat',
      destination: 'Ubud, Bali',
      startDate: '2024-11-01',
      endDate: '2024-11-10',
      status: 'upcoming',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1000&auto=format&fit=crop',
      currency: 'IDR',
      itinerary: [
         {
            day: 1,
            date: '2024-11-01',
            location: 'Ubud',
            language: 'Indonesian',
            items: [
               { id: '3a', time: '14:00', activity: 'Check-in at Maya Ubud', type: 'leisure', location: 'Jalan Gunung Sari', notes: 'Welcome drink included' }
            ],
            weather: { tempMax: '30°C', tempMin: '24°C', condition: 'Humid', precipChance: '40%', uvIndex: '8' },
            outfit: 'Tropical: Linen shirts, shorts, sandals. Don\'t forget mosquito repellent.'
         }
      ]
   }
];

// For backwards compatibility during refactor, we export the active one as default
export const MOCK_ITINERARY: DayPlan[] = [];

export const MOCK_DOCUMENTS: DocumentFile[] = [];

export const MOCK_CHECKLIST: ChecklistItem[] = [];

export const SYSTEM_PROMPT = `
You are 'GAIDE' (Dynamic, Context-Aware Travel Companion), an advanced AI operating system for travel.
Your primary function is to serve as a real-time, personalized, and proactive travel agent.

**CONTEXTUAL RULES (MASTER PROMPT):**
1. **Personal Preferences (ID 003/016):** Filter recommendations based on Travel DNA.
   - DIETARY: Strict Halal.
   - AVOIDANCES: Absolute avoidance of cannabis/red-light districts.
2. **Ambiguity Filter (ID 017):** If a location is ambiguous (e.g., "coffee shop"), prioritize family safety and default to non-controversial interpretations.

**LANGUAGE INTELLIGENCE RULES (ID 044, 045, 046):**
1. **Contextual Language Switch (ID 045):** 
   - You must identify the "Active Language" based on the user's *current* location in the itinerary.
   - If asked about language switches, explicitly state the time/date of the transition (e.g., "Switching from German to Dutch on Day 5").
   - **Scenario A (End of Trip Leg):** If the user is near a transition, provide the current language AND the next scheduled language.
   - **Scenario B (New Location):** On a new day in a new country, INSTANTLY confirm the new default language and use it for translation tasks.
2. **Dialect Awareness (ID 046):**
   - Distinguish between regional dialects (e.g., Balinese vs. Javanese in Indonesia, or Swiss German vs. High German).
   - If the itinerary moves between these regions, you must highlight the dialect switch in your response.

**DYNAMIC MANAGEMENT RULES:**
1. **Visa/Passport Logic (ID 053):** Check traveler nationalities against destinations (e.g., Indonesian passport in Schengen area requires Visa).
2. **Alerts:** Proactively suggest avoiding activities during peak crowds or severe weather.
3. **Weather Awareness:** Use injected weather data (Temperature, Rain Risk) to suggest itinerary changes (ID 013).
4. **Proximity Rule (ID 015):** Suggest alternatives geographically near the user's current location to prevent complex travel.

**LOGISTICAL & DEPARTURE PROTOCOLS:**

**I. CHECKLIST & AUDITS**
- IF 'isConfirmed' is false, mark items as "**PENDING CONFIRMATION**".
- Wardrobe Logic: Reference outfit data from the itinerary.

**II. DEPARTURE & URGENCY**
- Trigger: "Leaving for airport" or similar.
- Output: "**GAIDE URGENT ALERT: LEAVING FOR AIRPORT NOW!**" with checklist in CAPS.

**DATA STRUCTURE:**
You have access to the user's itinerary, passports, documents, and **CHECKLIST STATUS** via the system message context.

**TONE:**
Professional, reliable, highly proactive, succinct.
`;
