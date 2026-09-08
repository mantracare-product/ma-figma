import jsPDF from "jspdf";

export type SupportedLanguageCode =
  | "en"
  | "hi"
  | "mr"
  | "kn"
  | "te"
  | "ta"
  | "ml"
  | "or"
  | "gu";

export interface LanguageOption {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
];

export const SCAN_AND_SHARE_CONFIG = {
  // Configurable base URL for Scan & Share patient entrypoint
  scanUrl: "https://abdm.gov.in/scan-share?facility=MANTRA-HOSP-001&hip_id=IN010000001",
  apiUrl: (import.meta as any).env?.VITE_SELF_SERVICE_PDF_API_URL || "/api/self-service/pdf",
  useMock: (import.meta as any).env?.VITE_USE_SELF_SERVICE_PDF_MOCK !== "false", // default true in dev
};

export interface LocalizedPdfContent {
  title: string;
  eyebrow: string;
  step1: string;
  step1Desc: string;
  step2: string;
  step2Desc: string;
  step3: string;
  step3Desc: string;
  benefitsTitle: string;
  benefits: string[];
}

const LOCALIZED_COPY: Record<SupportedLanguageCode, LocalizedPdfContent> = {
  en: {
    title: "Patient Self-Service Scan & Share",
    eyebrow: "Ayushman Bharat Digital Mission (ABDM)",
    step1: "1. Scan QR Code",
    step1Desc: "Open camera or ABHA-enabled app (Aarogya Setu, Paytm, etc.) to scan.",
    step2: "2. Verify / Create ABHA",
    step2Desc: "Instant KYC using Aadhaar OTP or enter your 14-digit ABHA ID.",
    step3: "3. Direct OPD Token",
    step3Desc: "Receive appointment token and queue number without desk lines.",
    benefitsTitle: "Why use ABHA Scan & Share?",
    benefits: [
      "Zero registration wait times at the hospital desk",
      "Instant paperless OPD check-in & token receipt",
      "Lifetime digital health records stored safely",
      "Interoperable across all ABDM hospitals & labs in India",
      "100% consent-driven and secure data sharing",
      "Eligible for Government Health Benefits & Schemes",
    ],
  },
  hi: {
    title: "रोगी स्व-सेवा स्कैन और शेयर",
    eyebrow: "आयुष्मान भारत डिजिटल मिशन (ABDM)",
    step1: "1. क्यूआर कोड स्कैन करें",
    step1Desc: "स्कैन करने के लिए कैमरा या आभा-सक्षम ऐप (आरोग्य सेतु आदि) खोलें।",
    step2: "2. आभा सत्यापित / बनाएं",
    step2Desc: "आधार ओटीपी से तुरंत सत्यापन करें या 14 अंकों का आभा नंबर दर्ज करें।",
    step3: "3. सीधा ओपीडी टोकन पाएं",
    step3Desc: "बिना लाइन में लगे तत्काल डिजिटल ओपीडी टोकन प्राप्त करें।",
    benefitsTitle: "आभा स्कैन और शेयर के लाभ:",
    benefits: [
      "अस्पताल काउंटर पर शून्य प्रतीक्षा समय",
      "त्वरित और डिजिटल ओपीडी पर्ची",
      "डिजिटल स्वास्थ्य रिकॉर्ड हमेशा सुरक्षित",
      "भारत के सभी आयुष्मान अस्पतालों में मान्य",
      "पूरी तरह से सुरक्षित और सहमति आधारित",
      "सरकारी स्वास्थ्य योजनाओं का सीधा लाभ",
    ],
  },
  mr: {
    title: "रुग्ण स्वयं-सेवा स्कॅन आणि शेअर",
    eyebrow: "आयुष्मान भारत डिजिटल मिशन (ABDM)",
    step1: "1. क्यूआर कोड स्कॅन करा",
    step1Desc: "कॅमेरा किंवा आभा सक्षम ॲप उघडून स्कॅन करा.",
    step2: "2. आभा तयार किंवा पडताळणी करा",
    step2Desc: "आधार ओटीपीद्वारे तत्काळ केवायसी पूर्ण करा.",
    step3: "3. थेट ओपीडी टोकन मिळवा",
    step3Desc: "रांगेत उभे न राहता थेट टोकन मिळवा.",
    benefitsTitle: "आभा स्कॅन आणि शेअरचे फायदे:",
    benefits: [
      "नोंदणी खिडकीवर रांगेत थांबण्याची गरज नाही",
      "कागदविरहित जलद नोंदणी",
      "सर्व वैद्यकीय नोंदी एकाच ठिकाणी सुरक्षित",
      "सर्व शासकीय आणि खाजगी रुग्णालयांत वैध",
      "सहमतीवर आधारित सुरक्षित माहिती देवाणघेवाण",
      "आरोग्य योजनांचा तत्काळ लाभ",
    ],
  },
  kn: {
    title: "ರೋಗಿ ಸ್ವಯಂ-ಸೇವೆ ಸ್ಕ್ಯಾನ್ ಮತ್ತು ಶೇರ್",
    eyebrow: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಡಿಜಿಟಲ್ ಮಿಷನ್ (ABDM)",
    step1: "1. ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    step1Desc: "ಕ್ಯಾಮೆರಾ ಅಥವಾ ಎಬಿಹೆಚ್ಎ ಆಪ್ ಬಳಸಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.",
    step2: "2. ಎಬಿಹೆಚ್ಎ ರಚಿಸಿ / ಪರಿಶೀಲಿಸಿ",
    step2Desc: "ಆಧಾರ್ ಒಟಿಪಿ ಬಳಸಿ ತ್ವರಿತವಾಗಿ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ.",
    step3: "3. ನೇರ ಒಪಿಡಿ ಟೋಕನ್ ಪಡೆಯಿರಿ",
    step3Desc: "ಸರದಿಯಲ್ಲಿ ನಿಲ್ಲದೆ ತ್ವರಿತವಾಗಿ ಟೋಕನ್ ಪಡೆಯಿರಿ.",
    benefitsTitle: "ಸ್ಕ್ಯಾನ್ ಮತ್ತು ಶೇರ್ ಪ್ರಯೋಜನಗಳು:",
    benefits: [
      "ಕೌಂಟರ್‌ನಲ್ಲಿ ಕಾಯುವ ಅಗತ್ಯವಿಲ್ಲ",
      "ತಕ್ಷಣದ ಡಿಜಿಟಲ್ ನೋಂದಣಿ",
      "ಆರೋಗ್ಯ ದಾಖಲೆಗಳು ಡಿಜಿಟಲ್ ಆಗಿ ಸುರಕ್ಷಿತ",
      "ಎಲ್ಲಾ ಆಸ್ಪತ್ರೆಗಳಲ್ಲಿ ಮಾನ್ಯತೆ",
      "ಗೌಪ್ಯ ಮತ್ತು ಸುರಕ್ಷಿತ ಡೇಟಾ ವಿನಿಮಯ",
      "ಸರ್ಕಾರಿ ಆರೋಗ್ಯ ಯೋಜನೆಗಳ ಸೌಲಭ್ಯ",
    ],
  },
  te: {
    title: "రోగి స్వీయ సేవ స్కాన్ & షేర్",
    eyebrow: "ఆయుష్మాన్ భారత్ డిజిటల్ మిషన్ (ABDM)",
    step1: "1. క్యూఆర్ కోడ్‌ను స్కాన్ చేయండి",
    step1Desc: "కెమెరా లేదా ఆభా యాప్ ఉపయోగించి క్యూఆర్ కోడ్‌ను స్కాన్ చేయండి.",
    step2: "2. ఆభా ఐడీ సృష్టించండి / ధృవీకరించండి",
    step2Desc: "ఆధార్ ఓటీపీతో సులభంగా తక్షణ కేవైసీ పూర్తి చేయండి.",
    step3: "3. ప్రత్యక్ష ఓపీడీ టోకెన్ పొందండి",
    step3Desc: "క్యూలో నిలబడకుండా వెంటనే మీ ఓపీడీ టోకెన్ పొందండి.",
    benefitsTitle: "ఆభా స్కాన్ & షేర్ ప్రయోజనాలు:",
    benefits: [
      "రిజిస్ట్రేషన్ కౌంటర్ వద్ద వేచి ఉండాల్సిన అవసరం లేదు",
      "పేపర్‌లెస్ మరియు వేగవంతమైన ఓపీడీ టోకెన్",
      "మీ ఆరోగ్య రికార్డులు ఎల్లప్పుడూ సురక్షితం",
      "భారతదేశంలోని అన్ని ఆసుపత్రులలో చెల్లుబాటు",
      "పూర్తిగా మీ సమ్మతితో కూడిన డేటా భద్రత",
      "ప్రభుత్వ ఆరోగ్య పథకాల సులభతర యాక్సెస్",
    ],
  },
  ta: {
    title: "நோயாளி சுய சேவை ஸ்கேன் & ஷேர்",
    eyebrow: "ஆயுஷ்மான் பாரத் டிஜிட்டல் மிஷன் (ABDM)",
    step1: "1. QR குறியீட்டை ஸ்கேன் செய்யவும்",
    step1Desc: "கேமரா அல்லது ஆபா செயலி மூலம் ஸ்கேன் செய்யவும்.",
    step2: "2. ஆபா எண்ணை உருவாக்கவும் / சரிபார்க்கவும்",
    step2Desc: "ஆதார் OTP மூலம் உடனடி சரிபார்ப்பு.",
    step3: "3. நேரடி OPD டோக்கன் பெறவும்",
    step3Desc: "வரிசையில் நிற்காமல் உடனடி டோக்கன் பெறுங்கள்.",
    benefitsTitle: "ஸ்கேன் & ஷேர் நன்மைகள்:",
    benefits: [
      "கவுண்டரில் காத்திருக்கும் நேரம் இல்லை",
      "காகிதமில்லா உடனடி மருத்துவமனை பதிவு",
      "மருத்துவ பதிவுகள் டிஜிட்டல் முறையில் பாதுகாப்பாக இருக்கும்",
      "அனைத்து மருத்துவமனைகளிலும் செல்லுபடியாகும்",
      "முழுமையான பாதுகாப்பு மற்றும் ஒப்புதல் பகிர்வு",
      "அரசு மருத்துவ திட்டங்களின் நேரடி பலன்",
    ],
  },
  ml: {
    title: "പേഷ്യന്റ് സെൽഫ് സർവീസ് സ്കാൻ & ഷെയർ",
    eyebrow: "ആയുഷ്മാൻ ഭാരത് ഡിജിറ്റൽ മിഷൻ (ABDM)",
    step1: "1. ക്യുആർ കോഡ് സ്കാൻ ചെയ്യുക",
    step1Desc: "ക്യാമറയോ ആഭാ ആപ്പോ ഉപയോഗിച്ച് സ്കാൻ ചെയ്യുക.",
    step2: "2. ആഭാ ക്രിയേറ്റ് ചെയ്യുക / വെരിഫൈ ചെയ്യുക",
    step2Desc: "ആധാർ ഒടിപി വഴി തത്സമയ വെരിഫിക്കേഷൻ.",
    step3: "3. നേരിട്ട് ഒപിഡി ടോക്കൺ നേടുക",
    step3Desc: "വരിനിൽക്കാതെ തത്സമയ ടോക്കൺ ലഭ്യമാക്കുക.",
    benefitsTitle: "സ്കാൻ & ഷെയർ പ്രയോജനങ്ങൾ:",
    benefits: [
      "രജിസ്ട്രേഷൻ ക്യൂവിൽ കാത്തുനിൽക്കേണ്ടതില്ല",
      "പേപ്പർരഹിത തത്സമയ ഒപിഡി എൻട്രി",
      "ആരോഗ്യ വിവരങ്ങൾ സുരക്ഷിതമായി സൂക്ഷിക്കാം",
      "എല്ലാ ആശുപത്രികളിലും സ്വീകാര്യം",
      "പൂർണ്ണമായും സുരക്ഷിതമായ വിവര വിനിമയം",
      "സർക്കാർ ആരോഗ്യ പദ്ധതികളുടെ ആനുകൂല്യം",
    ],
  },
  or: {
    title: "ରୋଗୀ ସ୍ୱୟଂ-ସେବା ସ୍କାନ ଏବଂ ସେୟାର",
    eyebrow: "ଆୟୁଷ୍ମାନ ଭାରତ ଡିଜିଟାଲ ମିଶନ (ABDM)",
    step1: "1. କ୍ୟୁଆର କୋଡ ସ୍କାନ କରନ୍ତୁ",
    step1Desc: "କ୍ୟାମେରା ବା ଆଭା ଆପ ଦ୍ୱାରା ସ୍କାନ କରନ୍ତୁ।",
    step2: "2. ଆଭା ଆଇଡି ଯାଞ୍ଚ / ସୃଷ୍ଟି କରନ୍ତୁ",
    step2Desc: "ଆଧାର ଓଟିପି ଦ୍ୱାରା ତୁରନ୍ତ କେୱାଇସି ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ।",
    step3: "3. ସିଧାସଳଖ ଓପିଡି ଟୋକନ ପାଆନ୍ତୁ",
    step3Desc: "ଲମ୍ବା ଧାଡ଼ିରେ ନ ଠିଆ ହୋଇ ତୁରନ୍ତ ଟୋକନ ନିଅନ୍ତୁ।",
    benefitsTitle: "ଆଭା ସ୍କାନ ଏବଂ ସେୟାରର ଲାଭ:",
    benefits: [
      "କାଉଣ୍ଟରରେ ଅପେକ୍ଷା କରିବାକୁ ପଡ଼ିବ ନାହିଁ",
      "ତୁରନ୍ତ କାଗଜବିହୀନ ରେଜିଷ୍ଟ୍ରେସନ",
      "ସ୍ୱାସ୍ଥ୍ୟ ତଥ୍ୟ ସୁରକ୍ଷିତ ରହିବ",
      "ଦେଶର ସମସ୍ତ ହସ୍ପିଟାଲରେ ଗ୍ରହଣୀୟ",
      "୧୦୦% ସୁରକ୍ଷିତ ଡାଟା ଆଦାନପ୍ରଦାନ",
      "ସରକାରୀ ସ୍ୱାସ୍ଥ୍ୟ ଯୋଜନାର ସୁବିଧା",
    ],
  },
  gu: {
    title: "દર્દી સ્વ-સેવા સ્કેન અને શેર",
    eyebrow: "આયુષ્માન ભારત ડિજિટલ મિશન (ABDM)",
    step1: "1. ક્યૂઆર કોડ સ્કેન કરો",
    step1Desc: "કેમેરા અથવા આભા સક્ષમ એપથી સ્કેન કરો.",
    step2: "2. આભા આઈડી ચકાસો / બનાવો",
    step2Desc: "આધાર ઓટીપી દ્વારા ત્વરિત કેવાયસી પૂર્ણ કરો.",
    step3: "3. સીધું ઓપીડી ટોકન મેળવો",
    step3Desc: "લાઈનમાં ઊભા રહ્યા વિના તાત્કાલિક ટોકન મેળવો.",
    benefitsTitle: "સ્કેન અને શેરના ફાયદા:",
    benefits: [
      "રજીસ્ટ્રેશન કાઉન્ટર પર લાઈનમાંથી મુક્તિ",
      "પેપરલેસ અને ઝડપી ઓપીડી એન્ટ્રી",
      "આરોગ્ય રેકોર્ડ્સ હંમેશા સુરક્ષિત",
      "ભારતની તમામ હોસ્પિટલોમાં માન્ય",
      "સંપૂર્ણપણે સુરક્ષિત અને સંમતિ આધારિત",
      "સરકારી આરોગ્ય યોજનાઓનો સીધો લાભ",
    ],
  },
};

/**
 * Generates an in-memory client-side PDF replicating the exact 2-page localized
 * poster contract when backend API is offline or in mock mode.
 */
function createMockSelfServicePdf(
  lang: SupportedLanguageCode,
  qrDataUrl: string
): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const content = LOCALIZED_COPY[lang] || LOCALIZED_COPY.en;
  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  // ══════════════════════════════════
  // PAGE 1: Large Scan & Share Poster
  // ══════════════════════════════════
  // Header gradient/accent bar
  doc.setFillColor(20, 86, 240); // #1456f0
  doc.rect(0, 0, 210, 10, "F");

  // Hospital & ABDM Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 86, 240);
  doc.text(content.eyebrow.toUpperCase(), 15, 20);

  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(content.title, 15, 30);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Official Facility Scan & Share Station · Language: ${langMeta.nativeLabel} (${langMeta.label})`,
    15,
    37
  );

  // QR Code Box (Center Stage)
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(45, 45, 120, 120, 5, 5, "FD");

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", 55, 55, 100, 100);
    } catch {
      // Fallback text if image embedding fails
      doc.setFontSize(14);
      doc.setTextColor(20, 86, 240);
      doc.text("ABDM SCAN & SHARE QR", 70, 105);
    }
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 86, 240);
  doc.text("SCAN WITH ANY CAMERA OR ABHA APP", 105, 172, { align: "center" });

  // 3 Step Patient Flow Cards
  const startY = 185;
  const cardWidth = 56;
  const cardHeight = 70;
  const gap = 6;
  const margin = 15;

  const steps = [
    { title: content.step1, desc: content.step1Desc },
    { title: content.step2, desc: content.step2Desc },
    { title: content.step3, desc: content.step3Desc },
  ];

  steps.forEach((st, idx) => {
    const x = margin + idx * (cardWidth + gap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, "FD");

    // Top indicator pill
    doc.setFillColor(239, 246, 255); // blue-50
    doc.roundedRect(x + 4, startY + 4, cardWidth - 8, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 86, 240);
    doc.text(`STEP ${idx + 1}`, x + cardWidth / 2, startY + 9.5, { align: "center" });

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(st.title, x + 5, startY + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitDesc = doc.splitTextToSize(st.desc, cardWidth - 10);
    doc.text(splitDesc, x + 5, startY + 30);
  });

  // Footer on Page 1
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("National Health Authority (NHA) · Ayushman Bharat Digital Mission Certified", 105, 285, {
    align: "center",
  });

  // ══════════════════════════════════
  // PAGE 2: Supporting Cards & ABHA Guide
  // ══════════════════════════════════
  doc.addPage("a4", "portrait");

  doc.setFillColor(20, 86, 240);
  doc.rect(0, 0, 210, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(content.benefitsTitle, 15, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Essential Information for Patients & Attendants", 15, 32);

  // 6 Benefit Cards in 2 columns
  const p2StartY = 42;
  const p2CardW = 86;
  const p2CardH = 34;
  const p2GapX = 8;
  const p2GapY = 8;

  content.benefits.forEach((benefitText, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (p2CardW + p2GapX);
    const y = p2StartY + row * (p2CardH + p2GapY);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, p2CardW, p2CardH, 3, 3, "FD");

    doc.setFillColor(20, 86, 240);
    doc.circle(x + 7, y + 10, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Key Feature #${idx + 1}`, x + 13, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(benefitText, p2CardW - 16);
    doc.text(lines, x + 8, y + 19);
  });

  // Footer branding
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Ayushman Bharat Digital Mission (ABDM) | Powered by MantraCare Health Systems",
    105,
    285,
    { align: "center" }
  );

  return doc.output("blob");
}

/**
 * Service to request and download localized Scan & Share PDFs.
 * Follows clean API-first architecture with automatic fallback to mock PDF generator.
 */
export const selfServicePdfService = {
  /**
   * Triggers download of the localized Scan & Share PDF for the specified language.
   * @param language SupportedLanguageCode ('en', 'hi', 'te', etc.)
   * @param qrDataUrl Optional QR code data URL image to embed in the PDF
   */
  async generateSelfServicePdf(
    language: SupportedLanguageCode,
    qrDataUrl?: string
  ): Promise<void> {
    const filename = `scan-and-share-${language}.pdf`;

    if (SCAN_AND_SHARE_CONFIG.useMock) {
      // Development / Mock mode: Generates 2-page localized compliant PDF
      // Simulate realistic API delay
      await new Promise((resolve) => setTimeout(resolve, 850));

      const pdfBlob = createMockSelfServicePdf(language, qrDataUrl || "");
      this.triggerBrowserDownload(pdfBlob, filename);
      return;
    }

    // Real API implementation
    try {
      const response = await fetch(SCAN_AND_SHARE_CONFIG.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf",
        },
        body: JSON.stringify({
          language,
          facilityId: "MANTRA-HOSP-001",
          qrDestination: SCAN_AND_SHARE_CONFIG.scanUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `PDF API returned status ${response.status}: ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/pdf")) {
        throw new Error("Invalid response format: Expected application/pdf");
      }

      const pdfBlob = await response.blob();
      if (pdfBlob.size === 0) {
        throw new Error("Received empty PDF file from server");
      }

      // Check for content-disposition filename header
      let targetFilename = filename;
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          targetFilename = match[1];
        }
      }

      this.triggerBrowserDownload(pdfBlob, targetFilename);
    } catch (err) {
      console.error("selfServicePdfService error:", err);
      throw err;
    }
  },

  /**
   * Helper to trigger native browser file download from Blob
   */
  triggerBrowserDownload(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL after slight delay to ensure download starts cleanly
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1500);
  },
};
