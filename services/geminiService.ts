
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
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    });

    const text = (result as any).text ? (result as any).text() : (result as any).response?.text();
    if (!text) throw new Error("No text content from AI");

    const parsed = JSON.parse(text);
    // Handle simplified response if AI ignores the wrapper
    if (Array.isArray(parsed)) {
      return { itinerary: parsed, currency: 'USD' }; // Fallback
    }
    return { itinerary: parsed.itinerary, currency: parsed.currency };

  } catch (e) {
    console.error("Trip Generation Failed", e);
    throw e;
  }
};

// --- MULTIMODAL DOCUMENT ANALYZER ---
export const analyzeDocumentImage = async (
  fileBase64: string,
  mimeType: string
): Promise<{
  type: 'passport' | 'visa' | 'insurance' | 'booking';
  name: string;
  docId: string;
  expiry: string;
}> => {
  // ID 001/045: Strict Environment Variable Usage
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
[TASK]
Analyze the uploaded travel document image and extract key details.

[OUTPUT FORMAT]
Return ONLY valid JSON with this structure:
{
  "type": "passport" | "visa" | "insurance" | "booking",
  "name": "string", // A short, descriptive name (e.g., "Passport - John Doe")
  "docId": "string", // usage: Passport Number, Visa Number, Booking Ref
  "expiry": "DD-MM-YYYY" // Format strictly as DD-MM-YYYY. If not found or not applicable, returns empty string.
}

[RULES]
- If the document is a Passport, extract the Passport Number as 'docId'.
- If the document is a Visa, extract the Visa Number.
- If the document is a Hotel/Flight Booking, extract the Confirmation Number/PNR.
- For Expiry Date: Look for "Date of Expiry", "Valid Until", "Good Thru".
- Handle image artifacts gracefully. if unclear, return best guess or empty string.
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
