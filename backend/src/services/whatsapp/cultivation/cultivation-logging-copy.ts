import type { AdvisoryLanguage } from '../../ai/types.js';

export function applicationPrompt(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Have you applied the recommendation we shared?\n\nPlease let us know so we can track results.',
    ml: 'ഞങ്ങൾ പങ്കിട്ട ശുപാർശ പ്രയോഗിച്ചോ?\n\nഫലം ട്രാക്ക് ചെയ്യാൻ അറിയിക്കുക.',
    ta: 'பரிந்துரைத்ததை பயன்படுத்தினீர்களா?\n\nமுடிவை கண்காணிக்க தெரிவிக்கவும்.',
    kn: 'ನಾವು ಹಂಚಿದ ಶಿಫಾರಸನ್ನು ಅನ್ವಯಿಸಿದ್ದೀರಾ?\n\nಫಲಿತಾಂಶ ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ತಿಳಿಸಿ.',
    hi: 'क्या आपने हमारी सिफारिश लागू की?\n\nपरिणाम ट्रैक करने के लिए बताएं।',
  };
  return map[lang] ?? map.en;
}

export function appliedThanks(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Thank you! We recorded your spray/application.\n\nWe will check back in about 10 days on crop condition.',
    ml: 'നന്ദി! സ്പ്രേ/പ്രയോഗം രേഖപ്പെടുത്തി.\n\nഏകദേശം 10 ദിവസത്തിന് ശേഷം വിള നില പരിശോധിക്കും.',
    ta: 'நன்றி! தெளிப்பு/பயன்பாடு பதிவு செய்யப்பட்டது.\n\nசுமார் 10 நாட்களில் பயிர் நிலையை பார்ப்போம்.',
    kn: 'ಧನ್ಯವಾದ! ಸ್ಪ್ರೇ/ಅನ್ವಯ ದಾಖಲಾಯಿತು.\n\nಸುಮಾರು 10 ದಿನಗಳಲ್ಲಿ ಬೆಳೆ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸುತ್ತೇವೆ.',
    hi: 'धन्यवाद! स्प्रे/उपयोग दर्ज किया गया।\n\nलगभग 10 दिनों में फसल की स्थिति देखेंगे।',
  };
  return map[lang] ?? map.en;
}

export function notYetReminder(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'No problem. Apply when ready and reply *Applied* when done.\n\nReply *Help* if you need guidance.',
    ml: 'കുഴപ്പമില്ല. തയ്യാറാകുമ്പോൾ പ്രയോഗിക്കുക. ചെയ്താൽ *Applied* അയയ്ക്കുക.\n\n*Help* ടൈപ്പ് ചെയ്യാം.',
    ta: 'பரவாயில்லை. தயாரானால் பயன்படுத்துங்கள். முடிந்தால் *Applied* அனுப்புங்கள்.',
    kn: 'ಸರಿ. ಸಿದ್ಧರಾದಾಗ ಅನ್ವಯಿಸಿ. ಮುಗಿದ ನಂತರ *Applied* ಕಳುಹಿಸಿ.',
    hi: 'कोई बात नहीं। तैयार होने पर लगाएं। हो जाए तो *Applied* भेजें।',
  };
  return map[lang] ?? map.en;
}

export function resultValidationPrompt(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'How is the crop now after the application?',
    ml: 'പ്രയോഗത്തിന് ശേഷം വിളയുടെ നില എങ്ങനെയാണ്?',
    ta: 'பயன்படுத்திய பிறகு பயிர் எப்படி இருக்கிறது?',
    kn: 'ಅನ್ವಯಿಸಿದ ನಂತರ ಬೆಳೆ ಹೇಗಿದೆ?',
    hi: 'उपयोग के बाद फसल कैसी है?',
  };
  return map[lang] ?? map.en;
}

export function outcomeBetter(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Great to hear the crop is improving! Continue the schedule we shared.',
    ml: 'വിള മെച്ചപ്പെടുന്നത് കേൾക്കാന സന്തോഷം! ശുപാർശിച്ച ഷെഡ്യൂൾ തുടരുക.',
    ta: 'பயிர் மேம்படுவது நல்ல செய்தி! பரிந்துரைத்த அட்டவணை தொடருங்கள்.',
    kn: 'ಬೆಳೆ ಚೆನ್ನಾಗುತ್ತಿದೆ ಎಂದು ಕೇಳಲು ಸಂತೋಷ! ಶಿಫಾರಸು ಮಾಡಿದ ವೇಳಾಪಟ್ಟಿ ಮುಂದುವರಿಸಿ.',
    hi: 'फसल सुधर रही है — अच्छी खबर! सुझाई गई योजना जारी रखें।',
  };
  return map[lang] ?? map.en;
}

export function outcomePartial(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Thanks for the update. Send an updated crop photo if possible.',
    ml: 'അപ്ഡേറ്റിന് നന്ദി. സാധ്യമെങ്കിൽ പുതിയ വിള ഫോട്ടോ അയയ്ക്കുക.',
    ta: 'புதுப்பிப்புக்கு நன்றி. முடிந்தால் புதிய பயிர் படம் அனுப்பவும்.',
    kn: 'ಅಪ್‌ಡೇಟ್‌ಗೆ ಧನ್ಯವಾದ. ಸಾಧ್ಯವಾದರೆ ಹೊಸ ಬೆಳೆ ಫೋಟೋ ಕಳುಹಿಸಿ.',
    hi: 'अपडेट के लिए धन्यवाद। संभव हो तो नई फसल की फोटो भेजें।',
  };
  return map[lang] ?? map.en;
}

export function outcomeNoImprovement(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Agronomist detailed review required.\n\nPlease send updated photos. Our team will contact you.',
    ml: 'വിശദമായ അഗ്രോണമിസ്റ്റ് പരിശോധന ആവശ്യം.\n\nപുതിയ ഫോട്ടോകൾ അയയ്ക്കുക. ടീം ബന്ധപ്പെടും.',
    ta: 'விரிவான ஆலோசகர் மதிப்பீடு தேவை.\n\nபுதிய படங்கள் அனுப்பவும். எங்கள் குழு தொடர்பு கொள்ளும்.',
    kn: 'ವಿವರವಾದ ಕೃಷಿ ತಜ್ಞರ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.\n\nಹೊಸ ಫೋಟೋಗಳನ್ನು ಕಳುಹಿಸಿ. ನಮ್ಮ ತಂಡ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    hi: 'विस्तृत कृषि विशेषज्ञ समीक्षा जरूरी।\n\nनई फोटो भेजें। हमारी टीम संपर्क करेगी।',
  };
  return map[lang] ?? map.en;
}

export function sprayLogged(lang: AdvisoryLanguage, crop?: string): string {
  const cropLine = crop ? ` (${crop})` : '';
  const map: Record<AdvisoryLanguage, string> = {
    en: `✅ Spray / application recorded${cropLine}.\n\nWe will follow up on results in ~10 days.`,
    ml: `✅ സ്പ്രേ / പ്രയോഗം രേഖപ്പെടുത്തി${cropLine}.\n\n~10 ദിവസത്തിൽ ഫലം പരിശോധിക്കും.`,
    ta: `✅ தெளிப்பு / பயன்பாடு பதிவு${cropLine}.\n\n~10 நாட்களில் முடிவு பார்ப்போம்.`,
    kn: `✅ ಸ್ಪ್ರೇ / ಅನ್ವಯ ದಾಖಲಾಯಿತು${cropLine}.\n\n~10 ದಿನಗಳಲ್ಲಿ ಫಲಿತಾಂಶ ಪರಿಶೀಲನೆ.`,
    hi: `✅ स्प्रे / उपयोग दर्ज${cropLine}.\n\n~10 दिनों में परिणाम देखेंगे।`,
  };
  return map[lang] ?? map.en;
}
