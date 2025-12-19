
import { GoogleGenAI, Content, Part } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants';
import { DayPlan, UserPreferences, Traveler, ChecklistItem, ChatMessage } from '../types';

export const sendMessageToGemini = async (
  currentMessage: string,
  history: ChatMessage[],
  currentContext: {
    itinerary: DayPlan[],
    preferences: UserPreferences,
    travelers: Traveler[],
    checklist: ChecklistItem[],
    userLocation?: { lat: number; lng: number } | null
  }
): Promise<string> => {
  try {
    // ID 001/045: Strict Environment Variable Usage for Vite
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("VITE_GEMINI_API_KEY is missing from environment variables.");
      return "System Error: Configuration missing (API Key). Please add VITE_GEMINI_API_KEY to your .env.local file.";
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct the dynamic system instruction with real-time app state
    const dynamicContext = `
${SYSTEM_PROMPT}

*** LIVE SYSTEM DATA ***
[REAL-TIME USER LOCATION]
${currentContext.userLocation
        ? `Status: ACTIVE. Coordinates: Lat ${currentContext.userLocation.lat}, Lng ${currentContext.userLocation.lng}. Use this for "near me" recommendations.`
        : 'Status: UNKNOWN. If user asks for nearby recommendations, ask them to enable location sharing.'}

[CURRENT ITINERARY]
Location: ${currentContext.itinerary[0]?.location || 'Unknown'}
Date: ${currentContext.itinerary[0]?.date}
Full Plan: ${JSON.stringify(currentContext.itinerary.map(d => ({ day: d.day, date: d.date, location: d.location, items: d.items })))}

[TRAVEL PARTY]
${currentContext.travelers.map(t => `- ${t.name} (${t.nationality})`).join('\n')}

[USER PREFERENCES (Travel DNA)]
Dietary: ${currentContext.preferences.dietary.join(', ')}
Avoid: ${currentContext.preferences.customAvoidances.join(', ')}
Style: ${currentContext.preferences.nightlife}

[CHECKLIST STATUS]
${currentContext.checklist.map(c => `- ${c.item}: ${c.isConfirmed ? 'CONFIRMED' : 'PENDING'}`).join('\n')}
    `;

    // Convert app history to Gemini Content format
    // Filter out messages that shouldn't be part of context if needed
    const historyContents: Content[] = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }] as Part[]
    }));

    // Add the current user message
    const currentContent: Content = {
      role: 'user',
      parts: [{ text: currentMessage }] as Part[]
    };

    const contents = [...historyContents, currentContent];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        systemInstruction: dynamicContext,
        temperature: 0.7,
      }
    });

    const text = (response as any).text ? (response as any).text() : (response as any).response?.text();
    return text || "I processed the request but received no output.";

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `I'm having trouble connecting to GAIDE servers. Please try again. (Error: ${error.message || 'Unknown'})`;
  }
};

// --- TRAIP GENERATOR ---
export const generateTripProposal = async (
  destination: string,
  duration: number,
  travelers: string, // e.g. "Couple", "Family"
  preferences: UserPreferences
): Promise<{ itinerary: DayPlan[], currency: string }> => {
  // ID 001/045: Strict Environment Variable Usage
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 7); // Start trip in 7 days

  const prompt = `
You are an expert travel planner. Generate a detailed ${duration}-day travel itinerary for ${destination}.

TRAVELER INFO: ${travelers}
PREFERENCES: 
- Vibe/Style: ${preferences.nightlife || 'Balanced mix of activities'}
- Dietary Requirements: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'None specified'}
- Must Avoid: ${preferences.customAvoidances.length > 0 ? preferences.customAvoidances.join(', ') : 'None specified'}
- Family Friendly: ${preferences.familyFriendly ? 'Yes' : 'No'}

IMPORTANT RULES:
1. Each day MUST have 5-7 activities spread across Morning, Afternoon, and Evening
2. Include SPECIFIC venue names and addresses (not generic descriptions)
3. Include a mix of: iconic landmarks, hidden gems, local restaurants, cultural experiences
4. Activities should flow logically by location to minimize travel time
5. Respect all dietary and avoidance preferences strictly
6. Include estimated costs where applicable

GENERATE JSON with this EXACT structure:
{
  "currency": "XXX", // Local 3-letter ISO code (e.g., "JPY" for Japan, "EUR" for France)
  "itinerary": [
    {
      "day": 1,
      "date": "${startDate.toISOString().split('T')[0]}", // YYYY-MM-DD format, increment for each day
      "location": "${destination}",
      "language": "Local language name",
      "outfit": "Weather-appropriate clothing suggestion",
      "weather": {
        "tempMax": "25°C",
        "tempMin": "18°C", 
        "condition": "Sunny/Cloudy/Rainy",
        "precipChance": "10%",
        "uvIndex": "5"
      },
      "activeAlerts": [],
      "items": [
        {
          "id": "unique-id-1",
          "time": "09:00",
          "activity": "Name of activity or place",
          "type": "sightseeing|dining|activity|transport|leisure",
          "location": "Specific address or area",
          "notes": "Brief helpful tip or detail"
        }
      ]
    }
  ]
}

Generate the complete ${duration}-day itinerary now. Return ONLY valid JSON, no markdown or explanations.`;

  try {
    console.log("[TripGen] Starting trip proposal generation for:", destination, duration, "days");
    console.log("[TripGen] Using Gemini model: gemini-2.0-flash");

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    console.log("[TripGen] Raw API response:", result);

    const text = (result as any).text ? (result as any).text() : (result as any).response?.text();
    console.log("[TripGen] Extracted text:", text?.substring(0, 200) + "...");

    if (!text) {
      console.error("[TripGen] No text in response");
      throw new Error("No text content from AI");
    }

    const parsed = JSON.parse(text);
    console.log("[TripGen] Parsed response keys:", Object.keys(parsed));

    // Handle simplified response if AI ignores the wrapper
    if (Array.isArray(parsed)) {
      console.log("[TripGen] Response is array, using as itinerary directly");
      return { itinerary: parsed, currency: 'USD' }; // Fallback
    }

    console.log("[TripGen] Success! Days generated:", parsed.itinerary?.length || 0);
    return { itinerary: parsed.itinerary, currency: parsed.currency || 'USD' };

  } catch (e: any) {
    console.error("[TripGen] Failed:", e);
    console.error("[TripGen] Error message:", e?.message);
    console.error("[TripGen] Error status:", e?.status);
    throw new Error(`Trip generation failed: ${e?.message || 'Unknown error'}`);
  }
};

// --- MULTIMODAL DOCUMENT ANALYZER ---
export const analyzeDocumentImage = async (
  fileBase64: string,
  mimeType: string
): Promise<{
  type: 'ticket' | 'visa' | 'insurance' | 'booking';
  name: string;
  docId: string;
  expiry: string;
  // Ticket-specific fields
  airline?: string;
  flightNumber?: string;
  route?: string;
  departureTime?: string;
  gate?: string;
  terminal?: string;
  seat?: string;
  checkInUrl?: string;
  passengerName?: string;
}> => {
  // ID 001/045: Strict Environment Variable Usage
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
[TASK]
Analyze the uploaded travel document image and extract ALL available details.

[DOCUMENT TYPES TO DETECT]
1. **ticket** - Flight tickets, train tickets, bus tickets, boarding passes, e-tickets
2. **visa** - Travel visas, entry permits
3. **insurance** - Travel insurance documents
4. **booking** - Hotel bookings, accommodation confirmations

[OUTPUT FORMAT]
Return ONLY valid JSON with this structure:
{
  "type": "ticket" | "visa" | "insurance" | "booking",
  "name": "string", // For tickets: "[Airline] - [Passenger] - [Route]"
  "docId": "string", // PNR/Booking Reference/Confirmation Number
  "expiry": "DD-MM-YYYY", // Travel date for tickets, expiry for visas
  
  // TICKET-SPECIFIC FIELDS (only include if type is "ticket"):
  "airline": "string", // Airline or train company name
  "flightNumber": "string", // Flight/train number (e.g., "EK384")
  "route": "string", // Route format: "XXX → YYY"
  "departureTime": "string", // 24-hour format (e.g., "14:30")
  "gate": "string", // Gate number if visible
  "terminal": "string", // Terminal if visible
  "seat": "string", // Seat assignment if visible
  "checkInUrl": "string", // Online check-in URL
  "passengerName": "string" // Full passenger name
}

[CHECK-IN URL RULES]
Generate check-in URL based on airline if not visible in document:
- Emirates: "https://www.emirates.com/english/manage-booking/online-check-in/"
- KLM: "https://www.klm.com/check-in"
- Qatar Airways: "https://www.qatarairways.com/en/manage-booking.html"
- Etihad: "https://www.etihad.com/en/manage/online-check-in"
- Singapore Airlines: "https://www.singaporeair.com/en_UK/manage-booking/"
- British Airways: "https://www.britishairways.com/travel/managebooking/"
- Lufthansa: "https://www.lufthansa.com/online-check-in"
- Air France: "https://www.airfrance.com/check-in"

[RULES]
1. For TICKETS: Extract ALL visible flight details
2. For VISAS: Extract visa number, validity dates
3. For INSURANCE: Extract policy number, coverage dates
4. For BOOKINGS: Extract confirmation number, hotel name, dates
5. If any field is not visible, return empty string for that field.
  `;

  try {
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = fileBase64.split(',')[1] || fileBase64;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = '';

    // Try standard SDK helpers
    if (typeof (result as any).text === 'function') {
      text = (result as any).text();
    } else if ((result as any).response && typeof (result as any).response.text === 'function') {
      text = (result as any).response.text();
    }

    // Manual fallback for @google/genai structure
    if (!text && (result as any).response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (result as any).response.candidates[0].content.parts[0].text;
    }

    // Fallback for top-level candidates (SDK variation)
    if (!text && (result as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (result as any).candidates[0].content.parts[0].text;
    }

    if (!text) throw new Error("No analysis result text found in response");

    // Clean JSON markdown if present
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);

  } catch (e) {
    console.error("Document Analysis Failed", e);
    return {
      type: 'booking',
      name: 'Unrecognized Document',
      docId: '',
      expiry: ''
    };
  }
};

// --- LOCATION AUTOCOMPLETE (AI-POWERED) ---
export const getLocationSuggestions = async (
  query: string,
  destination: string
): Promise<string[]> => {
  if (!query || query.length < 2) return [];

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a travel location autocomplete assistant. The user is planning a trip to "${destination}".

User is typing: "${query}"

Suggest 5 real, specific locations that match. Include mix of:
- Famous landmarks and attractions
- Restaurants and cafes
- Hotels and accommodations
- Museums and cultural sites
- Parks and outdoor spaces
- Shopping areas

Return ONLY a JSON array of location strings. Each should include the specific name and area/neighborhood.
Example format: ["Eiffel Tower, Champ de Mars", "Louvre Museum, 1st Arrondissement", "Café de Flore, Saint-Germain-des-Prés"]

Return only locations in or near ${destination}. No explanations, just the JSON array.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });

    // Extract text with proper fallback handling for SDK variations
    let text = '';
    if (typeof (result as any).text === 'function') {
      text = (result as any).text();
    } else if ((result as any).response && typeof (result as any).response.text === 'function') {
      text = (result as any).response.text();
    } else if ((result as any).response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (result as any).response.candidates[0].content.parts[0].text;
    } else if ((result as any).candidates?.[0]?.content?.parts?.[0]?.text) {
      text = (result as any).candidates[0].content.parts[0].text;
    }
    
    if (!text) return [];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];

  } catch (e) {
    console.error("[LocationSuggestions] Error:", e);
    return [];
  }
};
