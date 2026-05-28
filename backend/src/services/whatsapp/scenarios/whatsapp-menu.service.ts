import type { AdvisoryLanguage } from '../../ai/types.js';

export function mainMenuCopy(
  language: AdvisoryLanguage,
  options?: { includeTrackOrder?: boolean; welcomeOverride?: string; returningQuickActionsOnly?: boolean }
): {
  welcome: string;
  buttonText: string;
  rows: Array<{ id: string; title: string; description?: string }>;
} {
  const map: Record<AdvisoryLanguage, { welcome: string; buttonText: string; rows: any[] }> = {
    en: {
      welcome: 'Welcome to Morbeez Agriculture Assistant 🌱\n\nHow can we help you today?',
      buttonText: 'Choose',
      rows: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'Send crop photo / symptoms' },
        { id: 'menu.weather', title: 'Weather', description: 'Rain / humidity / spray suitability' },
        { id: 'menu.prices', title: 'Market Price', description: "Today's crop prices" },
        { id: 'menu.soil', title: 'Soil Test', description: 'Sample + report help' },
        { id: 'menu.expert', title: 'Call Back', description: 'Callback from our team' },
      ],
    },
    ml: {
      welcome: 'മോർബീസ് അഗ്രികൾച്ചർ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം 🌱\n\nഇന്ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
      buttonText: 'തിരഞ്ഞെടുക്കുക',
      rows: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'വിളയുടെ ഫോട്ടോ / ലക്ഷണങ്ങൾ' },
        { id: 'menu.weather', title: 'Weather', description: 'മഴ / ഈർപ്പം / സ്പ്രേ' },
        { id: 'menu.prices', title: 'Market Price', description: 'ഇന്നത്തെ വില' },
        { id: 'menu.soil', title: 'Soil Test', description: 'സാമ്പിൾ / റിപ്പോർട്ട്' },
        { id: 'menu.expert', title: 'Call Back', description: 'ടീം കോൾബാക്ക്' },
      ],
    },
    ta: {
      welcome: 'Morbeez Agriculture Assistant-க்கு வரவேற்கிறோம் 🌱\n\nஇன்று எப்படி உதவலாம்?',
      buttonText: 'தேர்ந்தெடுக்கவும்',
      rows: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'பயிர் புகைப்படம் / அறிகுறிகள்' },
        { id: 'menu.weather', title: 'Weather', description: 'மழை / ஈரப்பதம் / ஸ்ப்ரே' },
        { id: 'menu.prices', title: 'Market Price', description: 'இன்றைய விலை' },
        { id: 'menu.soil', title: 'Soil Test', description: 'மண் பரிசோதனை' },
        { id: 'menu.expert', title: 'Call Back', description: 'எங்கள் குழு அழைக்கும்' },
      ],
    },
    kn: {
      welcome: 'Morbeez Agriculture Assistantಗೆ ಸ್ವಾಗತ 🌱\n\nಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
      buttonText: 'ಆಯ್ಕೆಮಾಡಿ',
      rows: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'ಬೆಳೆ ಫೋಟೋ / ಲಕ್ಷಣಗಳು' },
        { id: 'menu.weather', title: 'Weather', description: 'ಮಳೆ / ತೇವಾಂಶ / ಸ್ಪ್ರೇ' },
        { id: 'menu.prices', title: 'Market Price', description: 'ಇಂದಿನ ಬೆಲೆ' },
        { id: 'menu.soil', title: 'Soil Test', description: 'ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ' },
        { id: 'menu.expert', title: 'Call Back', description: 'ನಮ್ಮ ತಂಡ ಕರೆಮಾಡುತ್ತದೆ' },
      ],
    },
    hi: {
      welcome: 'Morbeez Agriculture Assistant में आपका स्वागत है 🌱\n\nआज हम कैसे मदद कर सकते हैं?',
      buttonText: 'चुनें',
      rows: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'फसल फोटो / लक्षण' },
        { id: 'menu.weather', title: 'Weather', description: 'बारिश / नमी / स्प्रे' },
        { id: 'menu.prices', title: 'Market Price', description: 'आज के दाम' },
        { id: 'menu.soil', title: 'Soil Test', description: 'मिट्टी जांच' },
        { id: 'menu.expert', title: 'Call Back', description: 'हमारी टीम कॉल करेगी' },
      ],
    },
  };
  const menu = map[language] ?? map.en;
  const rows = [...menu.rows];
  if (options?.returningQuickActionsOnly) {
    const localizedQuickActions: Record<
      AdvisoryLanguage,
      Array<{ id: string; title: string; description?: string }>
    > = {
      en: [
        { id: 'menu.diagnosis', title: 'Diagnosis', description: 'Send crop photo / symptoms' },
        { id: 'menu.weather', title: 'Weather', description: 'Rain / humidity / spray suitability' },
        { id: 'menu.prices', title: 'Market Price', description: "Today's crop prices" },
        { id: 'menu.expert', title: 'Call Back', description: 'Callback from our team' },
      ],
      ml: [
        { id: 'menu.diagnosis', title: 'രോഗനിർണയം', description: 'വിളയുടെ ഫോട്ടോ / ലക്ഷണങ്ങൾ' },
        { id: 'menu.weather', title: 'കാലാവസ്ഥ', description: 'മഴ / ഈർപ്പം / സ്പ്രേ മുന്നറിയിപ്പ്' },
        { id: 'menu.prices', title: 'മാർക്കറ്റ് വില', description: 'ഇന്നത്തെ വിപണി വില' },
        { id: 'menu.expert', title: 'കോൾബാക്ക്', description: 'ടീം കോൾബാക്ക് അഭ്യർത്ഥിക്കുക' },
      ],
      ta: [
        { id: 'menu.diagnosis', title: 'நோய் கண்டறிதல்', description: 'பயிர் படம் / அறிகுறிகள்' },
        { id: 'menu.weather', title: 'வானிலை', description: 'மழை / ஈரப்பதம் / தெளிப்பு எச்சரிக்கை' },
        { id: 'menu.prices', title: 'சந்தை விலை', description: 'இன்றைய சந்தை விலை' },
        { id: 'menu.expert', title: 'கால்பேக்', description: 'எங்கள் குழு மீண்டும் அழைக்கும்' },
      ],
      kn: [
        { id: 'menu.diagnosis', title: 'ರೋಗ ನಿರ್ಧಾರ', description: 'ಬೆಳೆ ಫೋಟೋ / ಲಕ್ಷಣಗಳು' },
        { id: 'menu.weather', title: 'ಹವಾಮಾನ', description: 'ಮಳೆ / ತೇವಾಂಶ / ಸ್ಪ್ರೇ ಎಚ್ಚರಿಕೆ' },
        { id: 'menu.prices', title: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆ', description: 'ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ' },
        { id: 'menu.expert', title: 'ಕಾಲ್ ಬ್ಯಾಕ್', description: 'ನಮ್ಮ ತಂಡದಿಂದ ಕರೆ' },
      ],
      hi: [
        { id: 'menu.diagnosis', title: 'रोग जांच', description: 'फसल फोटो / लक्षण' },
        { id: 'menu.weather', title: 'मौसम', description: 'बारिश / नमी / स्प्रे चेतावनी' },
        { id: 'menu.prices', title: 'बाजार भाव', description: 'आज का बाजार भाव' },
        { id: 'menu.expert', title: 'कॉलबैक', description: 'हमारी टीम से कॉलबैक' },
      ],
    };
    const base = [...(localizedQuickActions[language] ?? localizedQuickActions.en)];
    if (options.includeTrackOrder) {
      base.splice(1, 0, {
        id: 'menu.track_order',
        title:
          language === 'ml'
            ? 'ഓർഡർ ട്രാക്ക്'
            : language === 'ta'
              ? 'ஆர்டர் டிராக்'
              : language === 'kn'
                ? 'ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್'
                : language === 'hi'
                  ? 'ऑर्डर ट्रैक'
                  : 'Track Order',
        description:
          language === 'ml'
            ? 'ഷിപ്പ്മെന്റ് / ഡെലിവറി നില'
            : language === 'ta'
              ? 'ஷிப்மெண்ட் / டெலிவரி நிலை'
              : language === 'kn'
                ? 'ಶಿಪ್ಮೆಂಟ್ / ಡೆಲಿವರಿ ಸ್ಥಿತಿ'
                : language === 'hi'
                  ? 'शिपमेंट / डिलीवरी स्थिति'
                  : 'Shipment and delivery status',
      });
    }
    return {
      ...menu,
      welcome: options.welcomeOverride ?? menu.welcome,
      rows: base,
    };
  }
  if (options?.includeTrackOrder) {
    rows.splice(1, 0, { id: 'menu.track_order', title: 'Track Order', description: 'Shipment and delivery status' });
  }
  return {
    ...menu,
    welcome: options?.welcomeOverride ?? menu.welcome,
    rows,
  };
}
