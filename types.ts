
export interface ItineraryItem {
  id: string;
  time: string;
  activity: string;
  location: string;
  type: 'dining' | 'activity' | 'transport' | 'leisure';
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface WeatherInfo {
  tempMax: string;
  tempMin: string;
  condition: string;
  precipChance: string;
  uvIndex: string;
}

export interface Alert {
  id: string;
  type: 'weather' | 'event' | 'crowd';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface DayPlan {
  day: number;
  date: string;
  location: string; // e.g., "Amsterdam", "Bali"
  language: string; // e.g., "Dutch", "Indonesian"
  items: ItineraryItem[];
  outfit?: string;
  weather?: WeatherInfo;
  activeAlerts?: Alert[];
}

export interface Trip {
  id: string;
  name: string; // e.g. "Spring in Amsterdam"
  destination: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'past';
  image: string; // URL for cover image
  currency?: string; // e.g. "EUR", "JPY" - Local currency for this trip
  itinerary: DayPlan[];
}

export interface Traveler {
  id: string;
  name: string;
  nationality: string;
  passportNumber: string;
}

export interface UserPreferences {
  homeCurrency: string; // e.g. "USD", "GBP" - The user's baseline
  dietary: string[]; // e.g., "Halal", "Vegan"
  nightlife: string; // e.g., "High-end", "Quiet"
  familyFriendly: boolean;
  avoidTouristTraps: boolean;
  customAvoidances: string[]; // e.g. "No cannabis"
}

export interface DocumentFile {
  id: string;
  name: string;
  type: 'ticket' | 'visa' | 'insurance' | 'booking';
  expiry?: string;
  documentId?: string; // e.g. Booking Reference, PNR, Visa Number
  travelerId?: string;
  tripId?: string; // Links document to a specific trip. If undefined, it is a Global document.
  fileContent?: string; // Base64 encoded image data for viewing
  status: 'valid' | 'expiring' | 'missing' | 'required' | 'expired';
  // Ticket-specific fields (for flights/trains)
  airline?: string; // e.g. "Emirates", "KLM", "NS Trains"
  flightNumber?: string; // e.g. "EK384", "KL123"
  route?: string; // e.g. "DXB → AMS"
  departureTime?: string; // e.g. "14:30"
  gate?: string; // e.g. "A12" - Updated on flight day
  terminal?: string; // e.g. "Terminal 3"
  seat?: string; // e.g. "23A"
  checkInUrl?: string; // Online check-in link
  passengerName?: string; // e.g. "John Doe"
}

export interface ChecklistItem {
  id: string;
  item: string;
  category: 'Tier 1' | 'Tier 2';
  isConfirmed: boolean;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isSystemAlert?: boolean;
  pendingResponse?: boolean; // New flag to trigger AI processing
}

export type SubscriptionTier = 'Free' | 'Standard' | 'Premium';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
  subscriptionTier: SubscriptionTier;
  biometricEnabled: boolean;
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  TRIPS = 'TRIPS', // New Tab
  CHAT = 'CHAT',
  DOCUMENTS = 'DOCUMENTS',
  DNA = 'DNA',
  TRANSLATE = 'TRANSLATE',
  NEW_TRIP = 'NEW_TRIP'
}
