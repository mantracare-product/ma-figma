import type { WeeklyAvailability } from "./Settings";

// Common inline styles extracted as constants
export const TEXT_STYLES = {
  heading: { color: '#020817', fontFamily: 'DM Sans, sans-serif' },
  subtext: { color: '#64748B', fontFamily: 'Outfit, sans-serif' },
  label: { color: '#64748B', fontFamily: 'Outfit, sans-serif' },
  primary: { color: '#2563EB', fontFamily: 'DM Sans, sans-serif' },
} as const;

// Default availability helper
export const createDefaultAvailability = (): WeeklyAvailability => ({
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "09:00", end: "17:00" },
  sunday: { enabled: false, start: "09:00", end: "17:00" },
});

import type { ActionScope, Action, ModulePermissions, ItemPermissions } from "../../types/permissions";

export type { ActionScope, Action, ModulePermissions, ItemPermissions };

export const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  read: "deny",
  add: "deny",
  edit: "deny",
  delete: "deny",
  export: "deny",
  import: "deny",
};

// Default permissions helper
export const createDefaultPermissions = (): ItemPermissions => ({
  clients: { ...DEFAULT_MODULE_PERMISSIONS },
  processes: { ...DEFAULT_MODULE_PERMISSIONS },
  calls: { ...DEFAULT_MODULE_PERMISSIONS },
  chats: { ...DEFAULT_MODULE_PERMISSIONS },
  knowledgeBase: { ...DEFAULT_MODULE_PERMISSIONS },
  settings: { ...DEFAULT_MODULE_PERMISSIONS },
  processSettings: { ...DEFAULT_MODULE_PERMISSIONS },
  webForms: { ...DEFAULT_MODULE_PERMISSIONS },
  appointments: { ...DEFAULT_MODULE_PERMISSIONS },
  services: { ...DEFAULT_MODULE_PERMISSIONS },
  processInstances: {},
});


// Static country pricing data
export const COUNTRY_PRICING = [
  { country: "United States", code: "US", price: "$0.015", inbound: "$0.0085", outbound: "$0.015" },
  { country: "Canada", code: "CA", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "United Kingdom", code: "GB", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Australia", code: "AU", price: "$0.025", inbound: "$0.012", outbound: "$0.025" },
  { country: "Germany", code: "DE", price: "$0.022", inbound: "$0.011", outbound: "$0.022" },
  { country: "France", code: "FR", price: "$0.022", inbound: "$0.011", outbound: "$0.022" },
  { country: "Spain", code: "ES", price: "$0.021", inbound: "$0.0105", outbound: "$0.021" },
  { country: "Italy", code: "IT", price: "$0.021", inbound: "$0.0105", outbound: "$0.021" },
  { country: "Netherlands", code: "NL", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Belgium", code: "BE", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Sweden", code: "SE", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Norway", code: "NO", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Denmark", code: "DK", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Finland", code: "FI", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Poland", code: "PL", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Czech Republic", code: "CZ", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Austria", code: "AT", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Switzerland", code: "CH", price: "$0.023", inbound: "$0.0115", outbound: "$0.023" },
  { country: "Ireland", code: "IE", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Portugal", code: "PT", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Greece", code: "GR", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "Romania", code: "RO", price: "$0.016", inbound: "$0.008", outbound: "$0.016" },
  { country: "Hungary", code: "HU", price: "$0.016", inbound: "$0.008", outbound: "$0.016" },
  { country: "Bulgaria", code: "BG", price: "$0.015", inbound: "$0.0075", outbound: "$0.015" },
  { country: "Croatia", code: "HR", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "Slovenia", code: "SI", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "Slovakia", code: "SK", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Estonia", code: "EE", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Latvia", code: "LV", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Lithuania", code: "LT", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Luxembourg", code: "LU", price: "$0.02", inbound: "$0.01", outbound: "$0.02" },
  { country: "Malta", code: "MT", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Cyprus", code: "CY", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "Japan", code: "JP", price: "$0.027", inbound: "$0.0135", outbound: "$0.027" },
  { country: "South Korea", code: "KR", price: "$0.024", inbound: "$0.012", outbound: "$0.024" },
  { country: "Singapore", code: "SG", price: "$0.021", inbound: "$0.0105", outbound: "$0.021" },
  { country: "Hong Kong", code: "HK", price: "$0.022", inbound: "$0.011", outbound: "$0.022" },
  { country: "India", code: "IN", price: "$0.014", inbound: "$0.007", outbound: "$0.014" },
  { country: "Brazil", code: "BR", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "Mexico", code: "MX", price: "$0.016", inbound: "$0.008", outbound: "$0.016" },
  { country: "Argentina", code: "AR", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "Chile", code: "CL", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
  { country: "Colombia", code: "CO", price: "$0.016", inbound: "$0.008", outbound: "$0.016" },
  { country: "Peru", code: "PE", price: "$0.017", inbound: "$0.0085", outbound: "$0.017" },
  { country: "South Africa", code: "ZA", price: "$0.018", inbound: "$0.009", outbound: "$0.018" },
  { country: "New Zealand", code: "NZ", price: "$0.024", inbound: "$0.012", outbound: "$0.024" },
  { country: "Israel", code: "IL", price: "$0.021", inbound: "$0.0105", outbound: "$0.021" },
  { country: "United Arab Emirates", code: "AE", price: "$0.023", inbound: "$0.0115", outbound: "$0.023" },
  { country: "Saudi Arabia", code: "SA", price: "$0.022", inbound: "$0.011", outbound: "$0.022" },
  { country: "Turkey", code: "TR", price: "$0.019", inbound: "$0.0095", outbound: "$0.019" },
];

// Voice models configuration
export const VOICE_MODELS = [
  { id: "alloy", provider: "openai", name: "Alloy", gender: "Neutral", accent: "American" },
  { id: "echo", provider: "openai", name: "Echo", gender: "Male", accent: "American" },
  { id: "fable", provider: "openai", name: "Fable", gender: "Male", accent: "British" },
  { id: "onyx", provider: "openai", name: "Onyx", gender: "Male", accent: "American" },
  { id: "nova", provider: "openai", name: "Nova", gender: "Female", accent: "American" },
  { id: "shimmer", provider: "openai", name: "Shimmer", gender: "Female", accent: "American" },
  { id: "alpha", provider: "elevenlabs", name: "Alpha", gender: "Female", accent: "British" },
  { id: "bella", provider: "elevenlabs", name: "Bella", gender: "Female", accent: "American" },
  { id: "charlie", provider: "elevenlabs", name: "Charlie", gender: "Male", accent: "Australian" },
  { id: "daniel", provider: "elevenlabs", name: "Daniel", gender: "Male", accent: "British" },
  { id: "emily", provider: "elevenlabs", name: "Emily", gender: "Female", accent: "American" },
  { id: "finn", provider: "elevenlabs", name: "Finn", gender: "Male", accent: "Irish" },
  { id: "grace", provider: "elevenlabs", name: "Grace", gender: "Female", accent: "Canadian" },
  { id: "asteria", provider: "deepgram", name: "Asteria", gender: "Female", accent: "American" },
  { id: "luna", provider: "deepgram", name: "Luna", gender: "Female", accent: "American" },
  { id: "stella", provider: "deepgram", name: "Stella", gender: "Female", accent: "American" },
  { id: "athena", provider: "deepgram", name: "Athena", gender: "Female", accent: "British" },
  { id: "hera", provider: "deepgram", name: "Hera", gender: "Female", accent: "American" },
  { id: "orion", provider: "deepgram", name: "Orion", gender: "Male", accent: "American" },
  { id: "arcas", provider: "deepgram", name: "Arcas", gender: "Male", accent: "American" },
  { id: "perseus", provider: "deepgram", name: "Perseus", gender: "Male", accent: "American" },
  { id: "angus", provider: "deepgram", name: "Angus", gender: "Male", accent: "Irish" },
  { id: "orpheus", provider: "deepgram", name: "Orpheus", gender: "Male", accent: "American" },
  { id: "helios", provider: "deepgram", name: "Helios", gender: "Male", accent: "British" },
  { id: "zeus", provider: "deepgram", name: "Zeus", gender: "Male", accent: "American" },
];

// Countries list
export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Djibouti", "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji",
  "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Timezones list
export const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam",
  "Europe/Brussels", "Europe/Vienna", "Europe/Stockholm", "Europe/Oslo",
  "Europe/Copenhagen", "Europe/Helsinki", "Europe/Warsaw", "Europe/Prague",
  "Europe/Budapest", "Europe/Bucharest", "Europe/Athens", "Europe/Istanbul",
  "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok",
  "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo",
  "Asia/Seoul", "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane",
  "Pacific/Auckland", "America/Sao_Paulo", "America/Mexico_City",
  "America/Argentina/Buenos_Aires", "Africa/Cairo", "Africa/Johannesburg"
];

// Industries list
export const INDUSTRIES = [
  "Healthcare", "Technology", "Finance", "Education", "Retail",
  "Manufacturing", "Real Estate", "Hospitality", "Transportation",
  "Entertainment", "Legal", "Consulting", "Non-Profit", "Government", "Other"
];
