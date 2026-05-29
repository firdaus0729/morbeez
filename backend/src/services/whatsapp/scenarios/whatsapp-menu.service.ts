import type { AdvisoryLanguage } from '../../ai/types.js';

export type MenuRow = { id: string; title: string; description?: string };

/** Primary farmer menu — Crop Assessment, Track Order, Call Back, More. */
export function mainMenuCopy(
  language: AdvisoryLanguage,
  options?: { includeTrackOrder?: boolean; welcomeOverride?: string; returningQuickActionsOnly?: boolean }
): {
  welcome: string;
  buttonText: string;
  rows: MenuRow[];
} {
  const welcomeByLang: Record<AdvisoryLanguage, string> = {
    en: 'Welcome to Morbeez Agriculture Assistant 🌱\n\nHow can we help you today?',
    ml: 'മോർബീസ് അഗ്രികൾച്ചർ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം 🌱\n\nഇന്ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
    ta: 'Morbeez Agriculture Assistant-க்கு வரவேற்கிறோம் 🌱\n\nஇன்று எப்படி உதவலாம்?',
    kn: 'Morbeez Agriculture Assistantಗೆ ಸ್ವಾಗತ 🌱\n\nಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
    hi: 'Morbeez Agriculture Assistant में आपका स्वागत है 🌱\n\nआज हम कैसे मदद कर सकते हैं?',
  };

  const primaryRows: Record<AdvisoryLanguage, MenuRow[]> = {
    en: [
      { id: 'menu.crop_assessment', title: 'Crop Assessment', description: 'Photo / symptoms / crop health' },
      { id: 'menu.roi_tracker', title: 'ROI Tracker', description: 'Farm income & expense entries' },
      { id: 'menu.expert', title: 'Call Back', description: 'Advisor calls you within 4 hours' },
      { id: 'menu.more', title: 'More', description: 'Weather, prices, ledger, soil' },
    ],
    ml: [
      { id: 'menu.crop_assessment', title: 'Crop Assessment', description: 'ഫോട്ടോ / ലക്ഷണങ്ങൾ' },
      { id: 'menu.roi_tracker', title: 'ROI Tracker', description: 'വരുമാനം / ചെലവ്' },
      { id: 'menu.expert', title: 'Call Back', description: '4 മണിക്കൂറിനുള്ളിൽ കോൾ' },
      { id: 'menu.more', title: 'More', description: 'കാലാവസ്ഥ, ലെഡ്ജർ' },
    ],
    ta: [
      { id: 'menu.crop_assessment', title: 'Crop Assessment', description: 'படம் / அறிகுறிகள்' },
      { id: 'menu.roi_tracker', title: 'ROI Tracker', description: 'வருமானம் / செலவு' },
      { id: 'menu.expert', title: 'Call Back', description: '4 மணி நேரத்தில் அழைப்பு' },
      { id: 'menu.more', title: 'More', description: 'வானிலை, லெட்ஜர்' },
    ],
    kn: [
      { id: 'menu.crop_assessment', title: 'Crop Assessment', description: 'ಫೋಟೋ / ಲಕ್ಷಣಗಳು' },
      { id: 'menu.roi_tracker', title: 'ROI Tracker', description: 'ಆದಾಯ / ಖರ್ಚು' },
      { id: 'menu.expert', title: 'Call Back', description: '4 ಗಂಟೆಗಳಲ್ಲಿ ಕರೆ' },
      { id: 'menu.more', title: 'More', description: 'ಹವಾಮಾನ, ಲೆಡ್ಜರ್' },
    ],
    hi: [
      { id: 'menu.crop_assessment', title: 'Crop Assessment', description: 'फोटो / लक्षण' },
      { id: 'menu.roi_tracker', title: 'ROI Tracker', description: 'आय / खर्च' },
      { id: 'menu.expert', title: 'Call Back', description: '4 घंटे में कॉल' },
      { id: 'menu.more', title: 'More', description: 'मौसम, खाता' },
    ],
  };

  const trackOrderRow: Record<AdvisoryLanguage, MenuRow> = {
    en: { id: 'menu.track_order', title: 'Track Order', description: 'Shipment and delivery status' },
    ml: { id: 'menu.track_order', title: 'Track Order', description: 'ഷിപ്പ്മെന്റ് / ഡെലിവറി' },
    ta: { id: 'menu.track_order', title: 'Track Order', description: 'ஷிப்மெண்ட் / டெலிவரி' },
    kn: { id: 'menu.track_order', title: 'Track Order', description: 'ಶಿಪ್ಮೆಂಟ್ / ಡೆಲಿವರಿ' },
    hi: { id: 'menu.track_order', title: 'Track Order', description: 'शिपमेंट / डिलीवरी' },
  };

  const lang = language in primaryRows ? language : 'en';
  const rows = [...primaryRows[lang]];
  if (options?.includeTrackOrder) {
    rows.splice(1, 0, trackOrderRow[lang]);
  }

  if (options?.returningQuickActionsOnly) {
    return {
      welcome: options.welcomeOverride ?? welcomeByLang[lang],
      buttonText: lang === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : lang === 'hi' ? 'चुनें' : 'Choose',
      rows,
    };
  }

  return {
    welcome: options?.welcomeOverride ?? welcomeByLang[lang],
    buttonText: lang === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : lang === 'hi' ? 'चुनें' : 'Choose',
    rows,
  };
}

/** Secondary menu under More. */
export function moreMenuCopy(language: AdvisoryLanguage): {
  body: string;
  buttonText: string;
  rows: MenuRow[];
} {
  const body: Record<AdvisoryLanguage, string> = {
    en: 'More options:',
    ml: 'കൂടുതൽ ഓപ്ഷനുകൾ:',
    ta: 'மேலும் விருப்பங்கள்:',
    kn: 'ಹೆಚ್ಚಿನ ಆಯ್ಕೆಗಳು:',
    hi: 'और विकल्प:',
  };

  const rows: Record<AdvisoryLanguage, MenuRow[]> = {
    en: [
      { id: 'menu.weather', title: 'Weather', description: 'Rain / humidity / spray suitability' },
      { id: 'menu.prices', title: 'Market Price', description: "Today's prices (informational)" },
      { id: 'menu.soil', title: 'Soil Test', description: 'Sample and report help' },
      { id: 'menu.prev_recommendations', title: 'Previous Advice', description: 'Last recommendations' },
      { id: 'menu.ledger', title: 'Farm Ledger', description: 'Monthly income & expense summary' },
    ],
    ml: [
      { id: 'menu.weather', title: 'Weather', description: 'മഴ / ഈർപ്പം / സ്പ്രേ' },
      { id: 'menu.prices', title: 'Market Price', description: 'ഇന്നത്തെ വില' },
      { id: 'menu.soil', title: 'Soil Test', description: 'മണ്ണ് പരിശോധന' },
      { id: 'menu.prev_recommendations', title: 'Previous Advice', description: 'മുൻ ശുപാർശകൾ' },
      { id: 'menu.ledger', title: 'Farm Ledger', description: 'മാസിക ലെഡ്ജർ' },
    ],
    ta: [
      { id: 'menu.weather', title: 'Weather', description: 'மழை / ஈரப்பதம்' },
      { id: 'menu.prices', title: 'Market Price', description: 'இன்றைய விலை' },
      { id: 'menu.soil', title: 'Soil Test', description: 'மண் பரிசோதனை' },
      { id: 'menu.prev_recommendations', title: 'Previous Advice', description: 'முந்தைய பரிந்துரை' },
      { id: 'menu.ledger', title: 'Farm Ledger', description: 'மாதாந்திர கணக்கு' },
    ],
    kn: [
      { id: 'menu.weather', title: 'Weather', description: 'ಮಳೆ / ತೇವಾಂಶ' },
      { id: 'menu.prices', title: 'Market Price', description: 'ಇಂದಿನ ಬೆಲೆ' },
      { id: 'menu.soil', title: 'Soil Test', description: 'ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ' },
      { id: 'menu.prev_recommendations', title: 'Previous Advice', description: 'ಹಿಂದಿನ ಶಿಫಾರಸು' },
      { id: 'menu.ledger', title: 'Farm Ledger', description: 'ಮಾಸಿಕ ಲೆಡ್ಜರ್' },
    ],
    hi: [
      { id: 'menu.weather', title: 'Weather', description: 'बारिश / नमी' },
      { id: 'menu.prices', title: 'Market Price', description: 'आज के दाम' },
      { id: 'menu.soil', title: 'Soil Test', description: 'मिट्टी जांच' },
      { id: 'menu.prev_recommendations', title: 'Previous Advice', description: 'पिछली सिफारिश' },
      { id: 'menu.ledger', title: 'Farm Ledger', description: 'मासिक खाता' },
    ],
  };

  const lang = language in rows ? language : 'en';
  return {
    body: body[lang],
    buttonText: lang === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
    rows: rows[lang],
  };
}

/** Backward-compatible id for crop assessment flows. */
export function normalizeMenuId(menuId: string): string {
  if (menuId === 'menu.diagnosis' || menuId === 'menu.crop_assessment') {
    return 'menu.crop_assessment';
  }
  return menuId;
}
