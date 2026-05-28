import type { AdvisoryLanguage } from '../ai/types.js';

type Copy = {
  applicationCheck: string;
  notYetReminder: string;
  outcomeCheck: string;
  appliedThanks: string;
  improvedThanks: string;
  noImprovementReply: string;
  worsenedReply: string;
  clarificationAck: string;
};

const MAP: Record<AdvisoryLanguage, Copy> = {
  en: {
    applicationCheck:
      'Have you applied the recommendation for the issue we shared?\n\nTap a button below:',
    notYetReminder:
      'Please apply the recommendation when possible and update us here.',
    outcomeCheck:
      'Did the crop condition improve after applying the recommendation?\n\nPlease send updated photos if possible.',
    appliedThanks:
      'Thank you! We recorded that you applied the recommendation. We will check back in a few days.',
    improvedThanks: 'Glad to hear there is improvement. Keep monitoring the crop.',
    noImprovementReply:
      'Thank you for the update. Our team will review your case and contact you soon.',
    worsenedReply: 'Our agronomist team will call you within 4 hours.',
    clarificationAck:
      'Thank you. A Morbeez team member will call you to clarify the recommendation.',
  },
  ml: {
    applicationCheck:
      'ഞങ്ങൾ നൽകിയ ശുപാർശ പ്രയോഗിച്ചോ?\n\nതാഴെ ബട്ടൺ തിരഞ്ഞെടുക്കുക:',
    notYetReminder: 'സാധ്യമാകുമ്പോൾ ശുപാർശ പ്രയോഗിച്ച് ഇവിടെ അറിയിക്കുക.',
    outcomeCheck:
      'ശുപാർശ പ്രയോഗിച്ചതിന് ശേഷം വിളയുടെ നില മെച്ചപ്പെട്ടോ?\n\nസാധ്യമെങ്കിൽ പുതിയ ഫോട്ടോ അയയ്ക്കുക.',
    appliedThanks:
      'നന്ദി! ശുപാർശ പ്രയോഗിച്ചതായി രേഖപ്പെടുത്തി. കുറച്ച് ദിവസത്തിന് ശേഷം വീണ്ടും ചോദിക്കും.',
    improvedThanks: 'മെച്ചപ്പെട്ടതായി കേൾക്കുന്നതിൽ സന്തോഷം.',
    noImprovementReply: 'അപ്ഡേറ്റിന് നന്ദി. ഞങ്ങളുടെ ടീം പരിശോധിച്ച് ബന്ധപ്പെടും.',
    worsenedReply: 'ഞങ്ങളുടെ അഗ്രോണമിസ്റ്റ് ടീം 4 മണിക്കൂറിനുള്ളിൽ വിളിക്കും.',
    clarificationAck: 'നന്ദി. വ്യക്തതയ്ക്കായി ടീം വിളിക്കും.',
  },
  ta: {
    applicationCheck:
      'நாங்கள் கொடுத்த பரிந்துரையைப் பயன்படுத்தினீர்களா?\n\nகீழே பொத்தானைத் தேர்ந்தெடுக்கவும்:',
    notYetReminder: 'முடிந்தால் பரிந்துரையைப் பயன்படுத்தி இங்கே தெரிவிக்கவும்.',
    outcomeCheck:
      'பரிந்துரை பயன்படுத்திய பிறகு பயிர் நிலை மேம்பட்டதா?\n\nபுதிய புகைப்படம் அனுப்பலாம்.',
    appliedThanks: 'நன்றி! பயன்பாடு பதிவு செய்யப்பட்டது. சில நாட்களில் மீண்டும் கேட்போம்.',
    improvedThanks: 'மேம்பாடு கேட்பதில் மகிழ்ச்சி.',
    noImprovementReply: 'புதுப்பிப்புக்கு நன்றி. எங்கள் குழு விரைவில் தொடர்பு கொள்ளும்.',
    worsenedReply: 'எங்கள் அக்ரோனமிஸ்ட் குழு 4 மணி நேரத்தில் அழைக்கும்.',
    clarificationAck: 'நன்றி. விளக்கத்திற்காக குழு அழைக்கும்.',
  },
  kn: {
    applicationCheck:
      'ನಾವು ಹಂಚಿದ ಶಿಫಾರಸನ್ನು ಅನ್ವಯಿಸಿದ್ದೀರಾ?\n\nಕೆಳಗಿನ ಬಟನ್ ಆಯ್ಕೆಮಾಡಿ:',
    notYetReminder: 'ಸಾಧ್ಯವಾದಾಗ ಶಿಫಾರಸನ್ನು ಅನ್ವಯಿಸಿ ಇಲ್ಲಿ ತಿಳಿಸಿ.',
    outcomeCheck:
      'ಶಿಫಾರಸು ಅನ್ವಯಿಸಿದ ನಂತರ ಬೆಳೆಯ ಸ್ಥಿತಿ ಉತ್ತಮವಾಯಿತೇ?\n\nಹೊಸ ಫೋಟೋ ಕಳುಹಿಸಬಹುದು.',
    appliedThanks: 'ಧನ್ಯವಾದ! ಅನ್ವಯ ದಾಖಲಾಯಿತು. ಕೆಲವು ದಿನಗಳಲ್ಲಿ ಮತ್ತೆ ಕೇಳುತ್ತೇವೆ.',
    improvedThanks: 'ಸುಧಾರಣೆ ಕೇಳಲು ಸಂತೋಷ.',
    noImprovementReply: 'ಅಪ್‌ಡೇಟ್‌ಗೆ ಧನ್ಯವಾದ. ನಮ್ಮ ತಂಡ ಶೀಘ್ರದಲ್ಲೇ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    worsenedReply: 'ನಮ್ಮ ಅಗ್ರೋನಮಿಸ್ಟ್ ತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಕರೆ ಮಾಡುತ್ತದೆ.',
    clarificationAck: 'ಧನ್ಯವಾದ. ಸ್ಪಷ್ಟೀಕರಣಕ್ಕಾಗಿ ತಂಡ ಕರೆ ಮಾಡುತ್ತದೆ.',
  },
  hi: {
    applicationCheck:
      'क्या आपने हमारी सलाह लागू की है?\n\nनीचे बटन चुनें:',
    notYetReminder: 'जब संभव हो सलाह लागू करें और यहाँ बताएं।',
    outcomeCheck:
      'सलाह लागू करने के बाद फसल में सुधार हुआ?\n\nनई फोटो भेज सकते हैं।',
    appliedThanks: 'धन्यवाद! लागू करना दर्ज किया। कुछ दिनों में फिर पूछेंगे।',
    improvedThanks: 'सुधार सुनकर खुशी हुई।',
    noImprovementReply: 'अपडेट के लिए धन्यवाद। हमारी टीम जल्द संपर्क करेगी।',
    worsenedReply: 'हमारी टीम 4 घंटे में कॉल करेगी।',
    clarificationAck: 'धन्यवाद। स्पष्टीकरण के लिए टीम कॉल करेगी।',
  },
};

export function followUpCopy(lang: string): Copy {
  const key = (lang in MAP ? lang : 'en') as AdvisoryLanguage;
  return MAP[key] ?? MAP.en;
}
