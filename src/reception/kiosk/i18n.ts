/**
 * i18n.ts
 * Path: src/reception/kiosk/i18n.ts
 *
 * Multi-language localization dictionary for the AI Reception Kiosk.
 * Supported: English ('en'), Hindi ('hi'), Spanish ('es').
 */

export type KioskLanguage = 'en' | 'hi' | 'es';

export interface KioskTranslations {
  welcomeGreeting: string;
  welcomeSubtitle: string;
  checkinOptionTitle: string;
  checkinOptionDesc: string;
  walkinOptionTitle: string;
  walkinOptionDesc: string;
  qrOptionTitle: string;
  qrOptionDesc: string;
  voiceOptionTitle: string;
  voiceOptionDesc: string;
  phonePrompt: string;
  phoneSubtitle: string;
  enterPhone: string;
  sendOtp: string;
  otpPrompt: string;
  otpSubtitle: string;
  verifyOtp: string;
  demoOtpHint: string;
  selectPatient: string;
  selectPatientSubtitle: string;
  createNewProfile: string;
  todayAppointments: string;
  confirmCheckin: string;
  noAppointmentFound: string;
  proceedAsWalkin: string;
  selectService: string;
  selectProvider: string;
  immediateQueueTitle: string;
  immediateQueueDesc: string;
  optionalSlotTitle: string;
  joinQueueBtn: string;
  tokenSuccessTitle: string;
  tokenSuccessSubtitle: string;
  yourTokenNumber: string;
  assignedStation: string;
  estimatedWait: string;
  minutes: string;
  sendNotificationTo: string;
  whatsappSent: string;
  smsSent: string;
  doneBtn: string;
  backBtn: string;
  callStaff: string;
  staffHelpRequested: string;
  listening: string;
  speakNow: string;
  tapToSpeak: string;
  askAssistantPrompt: string;
  close: string;
  autoResetNotice: string;
}

export const TRANSLATIONS: Record<KioskLanguage, KioskTranslations> = {
  en: {
    welcomeGreeting: "Welcome to MantraCare Clinic",
    welcomeSubtitle: "Self-service smart check-in, token issuance & AI assistance",
    checkinOptionTitle: "I have an Appointment",
    checkinOptionDesc: "Quick check-in with phone number or appointment QR code",
    walkinOptionTitle: "Walk-in / New Visit",
    walkinOptionDesc: "Join the consultation queue immediately without prior booking",
    qrOptionTitle: "Scan QR Pass",
    qrOptionDesc: "Hold your appointment digital pass up to the scanner",
    voiceOptionTitle: "Ask AI Assistant",
    voiceOptionDesc: "Speak naturally for clinic hours, directions, or pharmacy help",
    phonePrompt: "Enter Mobile Number",
    phoneSubtitle: "We'll find your appointments or register your walk-in token",
    enterPhone: "Mobile Number",
    sendOtp: "Continue",
    otpPrompt: "Verify Mobile Number",
    otpSubtitle: "Enter the 4-digit code sent to",
    verifyOtp: "Verify & Proceed",
    demoOtpHint: "Demo OTP is 1234",
    selectPatient: "Who is visiting today?",
    selectPatientSubtitle: "Select the family member or add a new patient",
    createNewProfile: "+ Add New Patient Profile",
    todayAppointments: "Your Appointment Today",
    confirmCheckin: "Confirm Check-in & Get Token",
    noAppointmentFound: "No booked appointment found for today.",
    proceedAsWalkin: "Join Walk-in Queue Instead",
    selectService: "Select Service / Department",
    selectProvider: "Select Doctor (Optional)",
    immediateQueueTitle: "Join Queue Now (Recommended)",
    immediateQueueDesc: "Get a token right away and wait for your turn",
    optionalSlotTitle: "Or pick a specific time slot",
    joinQueueBtn: "Get Token & Join Queue",
    tokenSuccessTitle: "You're Checked In!",
    tokenSuccessSubtitle: "Please take a seat in the waiting lounge. Watch the TV display board.",
    yourTokenNumber: "YOUR TOKEN NUMBER",
    assignedStation: "Room / Counter",
    estimatedWait: "Estimated Wait Time",
    minutes: "mins",
    sendNotificationTo: "Get live updates on your phone",
    whatsappSent: "WhatsApp Sent",
    smsSent: "SMS Sent",
    doneBtn: "Done / Finished",
    backBtn: "Back",
    callStaff: "Need Help? Call Staff",
    staffHelpRequested: "A front-desk nurse has been alerted to assist you.",
    listening: "Listening...",
    speakNow: "Speak your question now",
    tapToSpeak: "Tap to Speak with AI Assistant",
    askAssistantPrompt: "Ask anything like 'Where is the pharmacy?', 'Clinic hours', or 'I want to check in'",
    close: "Close",
    autoResetNotice: "Returning to welcome screen in",
  },
  hi: {
    welcomeGreeting: "मंत्रकेयर क्लिनिक में आपका स्वागत है",
    welcomeSubtitle: "स्मार्ट चेक-इन, टोकन प्राप्ति और AI सहायता",
    checkinOptionTitle: "मेरी अपॉइंटमेंट है",
    checkinOptionDesc: "मोबाइल नंबर या QR कोड से तुरंत चेक-इन करें",
    walkinOptionTitle: "बिना अपॉइंटमेंट (वॉक-इन)",
    walkinOptionDesc: "तुरंत कतार में शामिल होकर टोकन प्राप्त करें",
    qrOptionTitle: "QR पास स्कैन करें",
    qrOptionDesc: "अपना डिजिटल अपॉइंटमेंट पास स्कैनर के सामने रखें",
    voiceOptionTitle: "AI सहायक से पूछें",
    voiceOptionDesc: "क्लिनिक समय, कमरे का पता या फार्मेसी के लिए बोलकर पूछें",
    phonePrompt: "अपना मोबाइल नंबर दर्ज करें",
    phoneSubtitle: "हम आपकी अपॉइंटमेंट ढूंढेंगे या नया टोकन जारी करेंगे",
    enterPhone: "मोबाइल नंबर",
    sendOtp: "आगे बढ़ें",
    otpPrompt: "मोबाइल नंबर सत्यापित करें",
    otpSubtitle: "इस नंबर पर भेजा गया 4-अंकों का कोड दर्ज करें:",
    verifyOtp: "सत्यापित करें",
    demoOtpHint: "डेमो OTP कोड 1234 है",
    selectPatient: "आज कौन डॉक्टर से मिल रहा है?",
    selectPatientSubtitle: "परिवार का सदस्य चुनें या नया मरीज जोड़ें",
    createNewProfile: "+ नया मरीज जोड़ें",
    todayAppointments: "आज की आपकी अपॉइंटमेंट",
    confirmCheckin: "चेक-इन करें और टोकन लें",
    noAppointmentFound: "आज के लिए कोई अपॉइंटमेंट नहीं मिली।",
    proceedAsWalkin: "वॉक-इन कतार में टोकन लें",
    selectService: "सेवा / विभाग चुनें",
    selectProvider: "डॉक्टर चुनें (वैकल्पिक)",
    immediateQueueTitle: "अभी कतार में शामिल हों",
    immediateQueueDesc: "तुरंत टोकन लें और अपनी बारी का इंतजार करें",
    optionalSlotTitle: "या बाद का समय चुनें",
    joinQueueBtn: "टोकन प्राप्त करें",
    tokenSuccessTitle: "चेक-इन सफल रहा!",
    tokenSuccessSubtitle: "कृपया प्रतीक्षा कक्ष में बैठें। टीवी डिस्प्ले बोर्ड पर अपना टोकन नंबर देखें।",
    yourTokenNumber: "आपका टोकन नंबर",
    assignedStation: "कमरा / काउंटर",
    estimatedWait: "अनुमानित प्रतीक्षा समय",
    minutes: "मिनट",
    sendNotificationTo: "मोबाइल पर अपडेट प्राप्त करें",
    whatsappSent: "व्हाट्सएप भेजा गया",
    smsSent: "SMS भेजा गया",
    doneBtn: "पूर्ण",
    backBtn: "वापस",
    callStaff: "सहायता चाहिए? कर्मचारी को बुलाएं",
    staffHelpRequested: "सहायता के लिए कर्मचारी को सूचित कर दिया गया है।",
    listening: "सुन रहे हैं...",
    speakNow: "कृपया अपना प्रश्न बोलें",
    tapToSpeak: "AI सहायक से बात करने के लिए टैप करें",
    askAssistantPrompt: "पूछें जैसे 'फार्मेसी कहां है?', 'क्लिनिक का समय', या 'मुझे चेक-इन करना है'",
    close: "बंद करें",
    autoResetNotice: "स्क्रीन रीसेट होगी:",
  },
  es: {
    welcomeGreeting: "Bienvenido a MantraCare Clinic",
    welcomeSubtitle: "Auto check-in inteligente, emisión de turnos y asistente de IA",
    checkinOptionTitle: "Tengo una Cita",
    checkinOptionDesc: "Check-in rápido con número de teléfono o código QR",
    walkinOptionTitle: "Sin Cita (Walk-in)",
    walkinOptionDesc: "Únase a la cola de consulta de inmediato",
    qrOptionTitle: "Escanear Pase QR",
    qrOptionDesc: "Coloque su pase digital frente al escáner",
    voiceOptionTitle: "Preguntar al Asistente de IA",
    voiceOptionDesc: "Hable naturalmente para horarios, direcciones o farmacia",
    phonePrompt: "Ingrese su Número de Teléfono",
    phoneSubtitle: "Encontraremos sus citas o registraremos su turno",
    enterPhone: "Teléfono Móvil",
    sendOtp: "Continuar",
    otpPrompt: "Verificar Número de Teléfono",
    otpSubtitle: "Ingrese el código de 4 dígitos enviado a",
    verifyOtp: "Verificar y Continuar",
    demoOtpHint: "El OTP de demostración es 1234",
    selectPatient: "¿Quién visita la clínica hoy?",
    selectPatientSubtitle: "Seleccione el paciente o agregue un nuevo perfil",
    createNewProfile: "+ Agregar Nuevo Paciente",
    todayAppointments: "Su Cita de Hoy",
    confirmCheckin: "Confirmar Check-in y Obtener Turno",
    noAppointmentFound: "No se encontró ninguna cita para hoy.",
    proceedAsWalkin: "Unirse a la Cola de Turnos",
    selectService: "Seleccione Servicio / Especialidad",
    selectProvider: "Seleccione Médico (Opcional)",
    immediateQueueTitle: "Unirse a la Cola Ahora",
    immediateQueueDesc: "Obtenga un turno de inmediato y espere su llamada",
    optionalSlotTitle: "O elija un horario específico",
    joinQueueBtn: "Obtener Turno",
    tokenSuccessTitle: "¡Check-in Confirmado!",
    tokenSuccessSubtitle: "Por favor tome asiento en la sala de espera y observe la pantalla.",
    yourTokenNumber: "SU NÚMERO DE TURNO",
    assignedStation: "Consultorio / Mostrador",
    estimatedWait: "Tiempo Estimado de Espera",
    minutes: "mins",
    sendNotificationTo: "Recibir avisos en su teléfono",
    whatsappSent: "WhatsApp Enviado",
    smsSent: "SMS Enviado",
    doneBtn: "Finalizar",
    backBtn: "Atrás",
    callStaff: "¿Necesita Ayuda? Llamar al Personal",
    staffHelpRequested: "Se ha notificado al personal para que le asista.",
    listening: "Escuchando...",
    speakNow: "Hable ahora",
    tapToSpeak: "Toque para hablar con el Asistente",
    askAssistantPrompt: "Pregunte '¿Dónde está la farmacia?', 'Horarios de atención', etc.",
    close: "Cerrar",
    autoResetNotice: "Volviendo a la pantalla principal en",
  },
};
