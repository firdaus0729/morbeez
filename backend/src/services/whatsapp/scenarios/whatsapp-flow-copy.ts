import type { AdvisoryLanguage } from '../../ai/types.js';

type CopyKey =
  | 'imageReceived'
  | 'sendMorePhotos'
  | 'waterVolumePrompt'
  | 'quantityResult'
  | 'technicalOnly'
  | 'productUnavailable'
  | 'welcomeBack'
  | 'noSoilReport'
  | 'soilAddress'
  | 'soilReportReceived'
  | 'rootPhotosNeeded'
  | 'lowConfidence'
  | 'callbackReceived'
  | 'weatherIntro'
  | 'pricesIntro'
  | 'soilMenu'
  | 'diagnosisPrompt'
  | 'chimbQuestion'
  | 'chimbAdvice'
  | 'terminologyClarify'
  | 'duplicateImage'
  | 'mainMenuHint';

const COPY: Record<CopyKey, Record<AdvisoryLanguage, string>> = {
  imageReceived: {
    en: 'Image received.\n\nPlease send:\n• close leaf image\n• full plant image\n\nfor better diagnosis.',
    ml: 'ചിത്രം ലഭിച്ചു.\n\nമികച്ച രോഗനിർണയത്തിന്:\n• ഇലയുടെ അടുത്ത ചിത്രം\n• മുഴുവൻ ചെടിയുടെ ചിത്രം\n\nഅയയ്ക്കുക.',
    ta: 'படம் பெறப்பட்டது.\n\nசிறந்த கண்டறிதலுக்கு:\n• இலை அருகிலுள்ள படம்\n• முழு செடி படம்\n\nஅனுப்பவும்.',
    kn: 'ಚಿತ್ರ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.\n\nಉತ್ತಮ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ:\n• ಎಲೆಯ ಹತ್ತಿರದ ಫೋಟೋ\n• ಸಂಪೂರ್ಣ ಸಸ್ಯದ ಫೋಟೋ\n\nಕಳುಹಿಸಿ.',
    hi: 'फोटो मिला।\n\nबेहतर जांच के लिए:\n• पत्ती का करीबी फोटो\n• पूरे पौधे का फोटो\n\nभेजें।',
  },
  sendMorePhotos: {
    en: 'Thank you. Analyzing your crop images…',
    ml: 'നന്ദി. നിങ്ങളുടെ വിള ചിത്രങ്ങൾ വിശകലനം ചെയ്യുന്നു…',
    ta: 'நன்றி. உங்கள் பயிர் படங்களை பகுப்பாய்வு செய்கிறோம்…',
    kn: 'ಧನ್ಯವಾದ. ನಿಮ್ಮ ಬೆಳೆ ಚಿತ್ರಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ…',
    hi: 'धन्यवाद। आपकी फसल की तस्वीरों का विश्लेषण हो रहा है…',
  },
  waterVolumePrompt: {
    en: 'How much spray water will you use?',
    ml: 'എത്ര ലിറ്റർ സ്പ്രേ വെള്ളം ഉപയോഗിക്കും?',
    ta: 'எத்தனை லிட்டர் தெளிப்பு நீர் பயன்படுத்துவீர்கள்?',
    kn: 'ಎಷ್ಟು ಲೀಟರ್ ಸ್ಪ್ರೇ ನೀರು ಬಳಸುತ್ತೀರಿ?',
    hi: 'कितना लीटर स्प्रे पानी इस्तेमाल करेंगे?',
  },
  quantityResult: {
    en: 'Required quantity:',
    ml: 'ആവശ്യമായ അളവ്:',
    ta: 'தேவையான அளவு:',
    kn: 'ಅಗತ್ಯವಿರುವ ಪ್ರಮಾಣ:',
    hi: 'आवश्यक मात्रा:',
  },
  technicalOnly: {
    en: 'Recommended technical only (external purchase possible):',
    ml: 'ശുപാർശ ചെയ്യുന്ന ടെക്നിക്കൽ (ബാഹ്യമായി വാങ്ങാം):',
    ta: 'பரிந்துரைக்கப்பட்ட டெக்னிக்கல் (வெளியில் வாங்கலாம்):',
    kn: 'ಶಿಫಾರಸು ಮಾಡಿದ ಟೆಕ್ನಿಕಲ್ (ಹೊರಗೆ ಖರೀದಿ ಸಾಧ್ಯ):',
    hi: 'सुझाया गया टेक्निकल (बाहर से खरीद सकते हैं):',
  },
  productUnavailable: {
    en: 'Morbeez equivalent not available for this technical. External purchase possible.\n\nWe have noted your demand.',
    ml: 'ഈ ടെക്നിക്കലിന് മോർബീസിൽ ലഭ്യമല്ല. ബാഹ്യമായി വാങ്ങാം.\n\nനിങ്ങളുടെ ആവശ്യം രേഖപ്പെടുത്തി.',
    ta: 'இந்த டெக்னிக்கலுக்கு Morbeez-ல் இல்லை. வெளியில் வாங்கலாம்.\n\nஉங்கள் தேவை பதிவு செய்யப்பட்டது.',
    kn: 'ಈ ಟೆಕ್ನಿಕಲ್‌ಗೆ Morbeez ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. ಹೊರಗೆ ಖರೀದಿ ಸಾಧ್ಯ.\n\nನಿಮ್ಮ ಬೇಡಿಕೆಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.',
    hi: 'इस टेक्निकल के लिए Morbeez पर उपलब्ध नहीं। बाहर से खरीद सकते हैं।\n\nआपकी मांग दर्ज की गई।',
  },
  welcomeBack: {
    en: 'Welcome back.',
    ml: 'വീണ്ടും സ്വാഗതം.',
    ta: 'மீண்டும் வரவேற்கிறோம்.',
    kn: 'ಮತ್ತೆ ಸ್ವಾಗತ.',
    hi: 'वापसी पर स्वागत है।',
  },
  noSoilReport: {
    en: 'Soil report not available.\n\nExact nutrient issue may be difficult to identify.',
    ml: 'മണ്ണ് റിപ്പോർട്ട് ലഭ്യമല്ല.\n\nകൃത്യമായ പോഷക കുറവ് കണ്ടെത്താൻ ബുദ്ധിമുട്ടായിരിക്കും.',
    ta: 'மண் அறிக்கை இல்லை.\n\nசரியான ஊட்டச்சத்து குறைபாட்டை கண்டறிவது கடினம்.',
    kn: 'ಮಣ್ಣಿನ ವರದಿ ಲಭ್ಯವಿಲ್ಲ.\n\nನಿಖರ ಪೋಷಕಾಂಶ ಕೊರತೆಯನ್ನು ಗುರುತಿಸುವುದು ಕಷ್ಟ.',
    hi: 'मिट्टी रिपोर्ट उपलब्ध नहीं।\n\nसटीक पोषक समस्या पहचानना मुश्किल हो सकता है।',
  },
  soilAddress: {
    en: 'Soil Sample Collection Address:\n\nMorbeez Ventures\nSulthan Bathery, Wayanad\n\n500g sample is enough.',
    ml: 'മണ്ണ് സാമ്പിൾ ശേഖരണ വിലാസം:\n\nMorbeez Ventures\nസുൽത്താൻ ബത്തേരി, വയനാട്\n\n500g മതി.',
    ta: 'மண் மாதிரி சேகரிப்பு முகவரி:\n\nMorbeez Ventures\nசுல்தான் பத்தேரி, வயநாடு\n\n500g போதும்.',
    kn: 'ಮಣ್ಣಿನ ಮಾದರಿ ಸಂಗ್ರಹ ವಿಳಾಸ:\n\nMorbeez Ventures\nಸುಲ್ತಾನ್ ಬത്തೇರಿ, ವಯನಾಡು\n\n500g ಸಾಕು.',
    hi: 'मिट्टी नमूना संग्रह पता:\n\nMorbeez Ventures\nसुल्तान बथेरी, वायनाड\n\n500g पर्याप्त है।',
  },
  soilReportReceived: {
    en: 'Soil report received. We are preparing your recommendation.',
    ml: 'മണ്ണ് റിപ്പോർട്ട് ലഭിച്ചു. ശുപാർശ തയ്യാറാക്കുന്നു.',
    ta: 'மண் அறிக்கை பெறப்பட்டது. பரிந்துரை தயாராகிறது.',
    kn: 'ಮಣ್ಣಿನ ವರದಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಶಿಫಾರಸು ತಯಾರಾಗುತ್ತಿದೆ.',
    hi: 'मिट्टी रिपोर्ट मिली। सिफारिश तैयार हो रही है।',
  },
  rootPhotosNeeded: {
    en: 'Possible root-side issue detected.\n\nPlease send:\n• root photo\n• rhizome photo\n• affected plant photo',
    ml: 'വേരിന് സംബന്ധിച്ച പ്രശ്നം സാധ്യത.\n\nഅയയ്ക്കുക:\n• വേരിന്റെ ഫോട്ടോ\n• റൈസോം ഫോട്ടോ\n• പ്രശ്നമുള്ള ചെടി',
    ta: 'வேர் பிரச்சனை சாத்தியம்.\n\nஅனுப்பவும்:\n• வேர் படம்\n• ரைசோம் படம்\n• பாதிக்கப்பட்ட செடி',
    kn: 'ಬೇರು ಸಮಸ್ಯೆ ಸಾಧ್ಯತೆ.\n\nಕಳುಹಿಸಿ:\n• ಬೇರು ಫೋಟೋ\n• ರೈಸೋಮ್ ಫೋಟೋ\n• ಬಾಧಿತ ಸಸ್ಯ',
    hi: 'जड़ की समस्या संभव है।\n\nभेजें:\n• जड़ की फोटो\n• राइजोम फोटो\n• प्रभावित पौधा',
  },
  lowConfidence: {
    en: 'Exact diagnosis unclear.\n\nPlease send close images and root photos if possible.',
    ml: 'കൃത്യമായ രോഗനിർണയം അസ്പഷ്ടം.\n\nഅടുത്ത ചിത്രങ്ങളും വേരിന്റെ ഫോട്ടോയും അയയ്ക്കുക.',
    ta: 'துல்லியமான கண்டறிதல் தெளிவாக இல்லை.\n\nஅருகிலுள்ள படங்கள் மற்றும் வேர் படம் அனுப்பவும்.',
    kn: 'ನಿಖರ ರೋಗನಿರ್ಣಯ ಸ್ಪಷ್ಟವಿಲ್ಲ.\n\nಹತ್ತಿರದ ಚಿತ್ರಗಳು ಮತ್ತು ಬೇರು ಫೋಟೋ ಕಳುಹಿಸಿ.',
    hi: 'सटीक जांच स्पष्ट नहीं।\n\nकरीबी फोटो और जड़ की फोटो भेजें।',
  },
  callbackReceived: {
    en: 'Callback request received.\n\nOur team will contact you shortly.',
    ml: 'കോൾബാക്ക് അഭ്യർത്ഥന ലഭിച്ചു.\n\nടീം ഉടൻ ബന്ധപ്പെടും.',
    ta: 'கால்பேக் கோரிக்கை பெறப்பட்டது.\n\nஎங்கள் குழு விரைவில் தொடர்பு கொள்ளும்.',
    kn: 'ಕಾಲ್‌ಬ್ಯಾಕ್ ವಿನಂತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.\n\nನಮ್ಮ ತಂಡ ಶೀಘ್ರದಲ್ಲೇ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    hi: 'कॉलबैक अनुरोध मिला।\n\nहमारी टीम जल्द संपर्क करेगी।',
  },
  weatherIntro: {
    en: 'Weather update for your area:',
    ml: 'നിങ്ങളുടെ പ്രദേശത്തിന്റെ കാലാവസ്ഥ:',
    ta: 'உங்கள் பகுதியின் வானிலை:',
    kn: 'ನಿಮ್ಮ ಪ್ರದೇಶದ ಹವಾಮಾನ:',
    hi: 'आपके क्षेत्र का मौसम:',
  },
  pricesIntro: {
    en: "Today's prices:",
    ml: 'ഇന്നത്തെ വില:',
    ta: 'இன்றைய விலை:',
    kn: 'ಇಂದಿನ ಬೆಲೆ:',
    hi: 'आज के दाम:',
  },
  soilMenu: {
    en: 'Soil testing — choose an option:',
    ml: 'മണ്ണ് പരിശോധന — ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക:',
    ta: 'மண் பரிசோதனை — ஒரு விருப்பம் தேர்ந்தெடுக்கவும்:',
    kn: 'ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ — ಒಂದು ಆಯ್ಕೆ ಮಾಡಿ:',
    hi: 'मिट्टी जांच — एक विकल्प चुनें:',
  },
  diagnosisPrompt: {
    en: 'Please send a crop photo or describe symptoms (crop name + problem).',
    ml: 'വിളയുടെ ഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ ലക്ഷണങ്ങൾ വിവരിക്കുക.',
    ta: 'பயிர் புகைப்படம் அனுப்பவும் அல்லது அறிகுறிகளை விவரிக்கவும்.',
    kn: 'ಬೆಳೆಯ ಫೋಟೋ ಕಳುಹಿಸಿ ಅಥವಾ ಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ.',
    hi: 'फसल की फोटो भेजें या लक्षण बताएं।',
  },
  chimbQuestion: {
    en: 'New chimb (shoot) growth is low?\n\nAny drainage issue after rain?',
    ml: 'പുതിയ ചിമ്പ് വളർച്ച കുറവാണോ?\n\nമഴയ്ക്ക് ശേഷം നീർനിറയ്ക്കൽ പ്രശ്നമുണ്ടോ?',
    ta: 'புதிய சிம்ப் வளர்ச்சி குறைவா?\n\nமழைக்குப் பிறகு வடிகால் பிரச்சனை?',
    kn: 'ಹೊಸ ಚಿಂಬ್ ಬೆಳವಣಿಗೆ ಕಡಿಮೆಯೇ?\n\nಮಳೆಯ ನಂತರ ನೀರು ನಿಲ್ಲುವ ಸಮಸ್ಯೆ?',
    hi: 'नई चिम्ब (shoot) वृद्धि कम है?\n\nबारिश के बाद जल निकासी की समस्या?',
  },
  chimbAdvice: {
    en: 'For this stage:\n• nitrogen split dose\n• neem cake\n• drainage cleaning\n\nwill help. Please send a photo.',
    ml: 'ഈ ഘട്ടത്തിൽ:\n• നൈട്രജൻ split dose\n• neem cake\n• drainage cleaning\n\nസഹായിക്കും. ഒരു ഫോട്ടോ അയയ്ക്കുക.',
    ta: 'இந்த நிலையில்:\n• நைட்ரஜன் split dose\n• neem cake\n• வடிகால் சுத்தம்\n\nஉதவும். படம் அனுப்பவும்.',
    kn: 'ಈ ಹಂತದಲ್ಲಿ:\n• ನೈಟ್ರೋಜನ್ split dose\n• neem cake\n• drainage cleaning\n\nಸಹಾಯ ಮಾಡುತ್ತದೆ. ಫೋಟೋ ಕಳುಹಿಸಿ.',
    hi: 'इस चरण में:\n• nitrogen split dose\n• neem cake\n• drainage cleaning\n\nमदद करेगा। फोटो भेजें।',
  },
  terminologyClarify: {
    en: 'Please explain a little more.\n\nYou can send a photo or voice note.',
    ml: 'കുറച്ച് കൂടി വിശദീകരിക്കുക.\n\nഫോട്ടോ അല്ലെങ്കിൽ വോയ്സ് നോട്ട് അയയ്ക്കാം.',
    ta: 'கொஞ்சம் விளக்கவும்.\n\nபடம் அல்லது குரல் செய்தி அனுப்பலாம்.',
    kn: 'ಸ್ವಲ್ಪ ವಿವರಿಸಿ.\n\nಫೋಟೋ ಅಥವಾ ವಾಯ್ಸ್ ನೋಟ್ ಕಳುಹಿಸಬಹುದು.',
    hi: 'थोड़ा और समझाएं।\n\nफोटो या वॉइस नोट भेज सकते हैं।',
  },
  duplicateImage: {
    en: 'Same image as before. Previous recommendation still applies.\n\nSend an updated photo if the condition changed.',
    ml: 'മുമ്പത്തെ ചിത്രം തന്നെ. മുൻ ശുപാർശ തുടരുന്നു.\n\nഅവസ്ഥ മാറിയെങ്കിൽ പുതിയ ഫോട്ടോ അയയ്ക്കുക.',
    ta: 'முந்தைய படம் போலவே. முந்தைய பரிந்துரை தொடரும்.\n\nநிலை மாறினால் புதிய படம் அனுப்பவும்.',
    kn: 'ಹಿಂದಿನ ಚಿತ್ರದಂತೆಯೇ. ಹಿಂದಿನ ಶಿಫಾರಸು ಮುಂದುವರಿಯುತ್ತದೆ.\n\nಸ್ಥಿತಿ ಬದಲಾದರೆ ಹೊಸ ಫೋಟೋ ಕಳುಹಿಸಿ.',
    hi: 'पहले जैसी तस्वीर। पुरानी सिफारिश लागू है।\n\nहालत बदली हो तो नई फोटो भेजें।',
  },
  mainMenuHint: {
    en: 'Type *menu* anytime to see options again.',
    ml: 'ഓപ്ഷനുകൾ വീണ്ടും കാണാൻ *menu* ടൈപ്പ് ചെയ്യുക.',
    ta: 'விருப்பங்களுக்கு *menu* என தட்டச்சு செய்யவும்.',
    kn: 'ಆಯ್ಕೆಗಳಿಗಾಗಿ *menu* ಎಂದು ಟೈಪ್ ಮಾಡಿ.',
    hi: 'विकल्पों के लिए *menu* टाइप करें।',
  },
};

export function t(key: CopyKey, lang: AdvisoryLanguage): string {
  return COPY[key][lang] ?? COPY[key].en;
}
