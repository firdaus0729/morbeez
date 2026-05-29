import type { AdvisoryLanguage } from '../../ai/types.js';
import type { AgricultureInputCategory, ClassificationResult } from '../pipeline/input-classifier.service.js';
import { responseComposerService } from '../pipeline/response-composer.service.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';

export type PlaybookResult =
  | { action: 'continue_diagnosis' }
  | { action: 'reply'; message: string; escalate?: boolean };

type PlaybookCopy = {
  lead: string;
  question: string;
  expertEscalation: string;
};

const COPY: Record<AgricultureInputCategory, Record<AdvisoryLanguage, PlaybookCopy>> = {
  disease_stress: {
    en: { lead: '', question: '', expertEscalation: '' },
    ml: { lead: '', question: '', expertEscalation: '' },
    ta: { lead: '', question: '', expertEscalation: '' },
    kn: { lead: '', question: '', expertEscalation: '' },
    hi: { lead: '', question: '', expertEscalation: '' },
  },
  insect: {
    en: {
      lead: 'Possible insect or pest activity noticed.',
      question: 'Do you see live insects, eggs, or chewing damage on leaves?',
      expertEscalation:
        'Pest identification needs expert review.\n\nOur crop advisor team will contact you within 4 hours.',
    },
    ml: {
      lead: 'കീടാക്രമണം സാധ്യതയുണ്ട്.',
      question: 'ജീവനുള്ള കീടങ്ങൾ, മുട്ട, അല്ലെങ്കിൽ ഇല കടിച്ചിട്ടുണ്ടോ?',
      expertEscalation:
        'കീടം തിരിച്ചറിയാൻ വിദഗ്ധ പരിശോധന വേണം.\n\nക്രോപ്പ് അഡ്വൈസർ ടീം 4 മണിക്കൂറിനുള്ളിൽ ബന്ധപ്പെടും.',
    },
    ta: {
      lead: 'பூச்சி தாக்கம் சாத்தியம்.',
      question: 'உயிருள்ள பூச்சி, முட்டை, அல்லது இலை கடிப்பு உள்ளதா?',
      expertEscalation:
        'பூச்சி அடையாளம் நிபுணர் பார்வை தேவை.\n\nஎங்கள் அணி 4 மணி நேரத்தில் தொடர்பு கொள்ளும்.',
    },
    kn: {
      lead: 'ಕೀಟ ಹಾನಿ ಸಾಧ್ಯತೆ.',
      question: 'ಜೀವಂತ ಕೀಟ, ಮೊಟ್ಟೆ, ಅಥವಾ ಎಲೆ ಕಚ್ಚುವಿಕೆ ಕಾಣುತ್ತೀರಾ?',
      expertEscalation:
        'ಕೀಟ ಗುರುತಿಸಲು ತಜ್ಞರ ಪರಿಶೀಲನೆ ಬೇಕು.\n\nನಮ್ಮ ತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    },
    hi: {
      lead: 'कीट / कीट संभावना है।',
      question: 'क्या जीवित कीट, अंडे, या पत्ती काटने के निशान दिख रहे हैं?',
      expertEscalation:
        'कीट पहचान के लिए विशेषज्ञ समीक्षा जरूरी है।\n\nहमारी टीम 4 घंटे में संपर्क करेगी।',
    },
  },
  weed: {
    en: {
      lead: 'Possible weed detected near the crop area.',
      question: 'Is it spreading rapidly across the field?',
      expertEscalation:
        'Weed identification needs further review.\n\nOur crop advisor team will help confirm this within 4 hours.',
    },
    ml: {
      lead: 'വിളയുടെ അടുത്ത് അനാവശ്യ പുല്ല്/കളം സാധ്യത.',
      question: 'ഇത് വേഗത്തിൽ നിലം മുഴുവൻ പടരുന്നുണ്ടോ?',
      expertEscalation:
        'കളം തിരിച്ചറിയാൻ വിദഗ്ധ സഹായം വേണം.\n\nടീം 4 മണിക്കൂറിനുള്ളിൽ ബന്ധപ്പെടും.',
    },
    ta: {
      lead: 'பயிர் பகுதியில் களை சாத்தியம்.',
      question: 'வயல் முழுவதும் விரைவாக பரவுகிறதா?',
      expertEscalation:
        'களை அடையாளம் மேலும் பரிசோதனை தேவை.\n\nஎங்கள் அணி 4 மணி நேரத்தில் உதவும்.',
    },
    kn: {
      lead: 'ಬೆಳೆ ಪ್ರದೇಶದಲ್ಲಿ ಕಳೆ ಸಾಧ್ಯತೆ.',
      question: 'ಇದು ತ್ವರಿತವಾಗಿ ಎಲ್ಲೆಡೆ ಹರಡುತ್ತಿದೆಯೇ?',
      expertEscalation:
        'ಕಳೆ ಗುರುತಿಸಲು ಮೇಲಿನ ಪರಿಶೀಲನೆ ಬೇಕು.\n\nತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    },
    hi: {
      lead: 'फसल क्षेत्र में खरपतवार की संभावना।',
      question: 'क्या यह तेजी से पूरे खेत में फैल रहा है?',
      expertEscalation:
        'खरपतवार पहचान के लिए और समीक्षा चाहिए।\n\nटीम 4 घंटे में संपर्क करेगी।',
    },
  },
  root_soil: {
    en: {
      lead: 'Possible root or soil-side issue.',
      question: 'Are roots becoming soft or is there a foul smell?',
      expertEscalation:
        'Root condition needs expert review.\n\nOur crop advisor team will contact you within 4 hours.',
    },
    ml: {
      lead: 'വേര്/മണ്ണ് പ്രശ്നം സാധ്യത.',
      question: 'വേരുകൾ മൃദുവാകുന്നുണ്ടോ, ദുർഗന്ധമുണ്ടോ?',
      expertEscalation:
        'വേരിന്റെ നില വിദഗ്ധ പരിശോധന വേണം.\n\nടീം 4 മണിക്കൂറിനുള്ളിൽ ബന്ധപ്പെടും.',
    },
    ta: {
      lead: 'வேர் / மண் பிரச்சனை சாத்தியம்.',
      question: 'வேர்கள் மென்மையாகிறதா, துர்நாற்றம் உள்ளதா?',
      expertEscalation:
        'வேர் நிலை நிபுணர் பார்வை தேவை.\n\nஅணி 4 மணி நேரத்தில் தொடர்பு கொள்ளும்.',
    },
    kn: {
      lead: 'ಬೇರು / ಮಣ್ಣಿನ ಸಮಸ್ಯೆ ಸಾಧ್ಯತೆ.',
      question: 'ಬೇರು ಮೃದುವಾಗುತ್ತಿದೆಯೇ, ದುರ್ವಾಸನೆ ಇದೆಯೇ?',
      expertEscalation:
        'ಬೇರು ಸ್ಥಿತಿಗೆ ತಜ್ಞರ ಪರಿಶೀಲನೆ ಬೇಕು.\n\nತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    },
    hi: {
      lead: 'जड़ / मिट्टी की समस्या संभव है।',
      question: 'क्या जड़ें नरम हो रही हैं या बदबू है?',
      expertEscalation:
        'जड़ की स्थिति के लिए विशेषज्ञ समीक्षा जरूरी है।\n\nटीम 4 घंटे में संपर्क करेगी।',
    },
  },
  compatibility: {
    en: {
      lead: 'Spray mixing / compatibility question noted.',
      question: 'Which two products are you planning to mix in the tank?',
      expertEscalation:
        'Tank-mix safety needs expert review.\n\nOur crop advisor team will contact you within 4 hours.',
    },
    ml: {
      lead: 'സ്പ്രേ മിശ്രണം / പൊരുത്തം ചോദ്യം.',
      question: 'ടാങ്കിൽ ഏത് രണ്ട് ഉൽപ്പന്നങ്ങൾ ചേർക്കാൻ പ്ലാൻ ചെയ്യുന്നു?',
      expertEscalation:
        'ടാങ്ക് മിശ്രണ സുരക്ഷയ്ക്ക് വിദഗ്ധ സഹായം വേണം.\n\nടീം 4 മണിക്കൂറിനുള്ളിൽ ബന്ധപ്പെടും.',
    },
    ta: {
      lead: 'தெளிப்பு கலப்பு / பொருந்துதல் கேள்வி.',
      question: 'டாங்கில் எந்த இரண்டு பொருட்களை கலக்க திட்டம்?',
      expertEscalation:
        'கலப்பு பாதுகாப்புக்கு நிபுணர் பார்வை தேவை.\n\nஅணி 4 மணி நேரத்தில் தொடர்பு கொள்ளும்.',
    },
    kn: {
      lead: 'ಸ್ಪ್ರೇ ಮಿಶ್ರಣ / ಹೊಂದಾಣಿಕೆ ಪ್ರಶ್ನೆ.',
      question: 'ಟ್ಯಾಂಕിൽ ಯಾವ ಎರಡು ಉತ್ಪನ್ನಗಳನ್ನು ಮಿಶ್ರಣ ಮಾಡಲು ಯೋಜಿಸಿದ್ದೀರಿ?',
      expertEscalation:
        'ಮಿಶ್ರಣ ಸುರಕ್ಷತೆಗೆ ತಜ್ಞರ ಪರಿಶೀಲನೆ ಬೇಕು.\n\nತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    },
    hi: {
      lead: 'स्प्रे मिक्स / संगतता प्रश्न।',
      question: 'टैंक में कौन से दो उत्पाद मिलाने की योजना है?',
      expertEscalation:
        'मिक्स सुरक्षा के लिए विशेषज्ञ समीक्षा जरूरी है।\n\nटीम 4 घंटे में संपर्क करेगी।',
    },
  },
  cultivation: {
    en: { lead: '', question: '', expertEscalation: '' },
    ml: { lead: '', question: '', expertEscalation: '' },
    ta: { lead: '', question: '', expertEscalation: '' },
    kn: { lead: '', question: '', expertEscalation: '' },
    hi: { lead: '', question: '', expertEscalation: '' },
  },
  unknown_low_conf: {
    en: {
      lead: 'We need a clearer look at this.',
      question: 'Can you send one close photo of the affected area?',
      expertEscalation:
        'This needs expert review.\n\nOur crop advisor team will contact you within 4 hours.',
    },
    ml: {
      lead: 'കൂടുതൽ വ്യക്തമായ ചിത്രം വേണം.',
      question: 'ബാധിത ഭാഗത്തിന്റെ അടുത്ത ഫോട്ടോ അയയ്ക്കാമോ?',
      expertEscalation:
        'വിദഗ്ധ പരിശോധന വേണം.\n\nടീം 4 മണിക്കൂറിനുള്ളിൽ ബന്ധപ്പെടും.',
    },
    ta: {
      lead: 'தெளிவான படம் தேவை.',
      question: 'பாதிக்கப்பட்ட பகுதியின் அருகில் படம் அனுப்ப முடியுமா?',
      expertEscalation:
        'நிபுணர் பார்வை தேவை.\n\nஅணி 4 மணி நேரத்தில் தொடர்பு கொள்ளும்.',
    },
    kn: {
      lead: 'ಸ್ಪಷ್ಟ ಫೋಟೋ ಬೇಕು.',
      question: 'ಬಾಧಿತ ಭಾಗದ ಹತ್ತಿರದ ಫೋಟೋ ಕಳುಹಿಸಬಹುದೇ?',
      expertEscalation:
        'ತಜ್ಞರ ಪರಿಶೀಲನೆ ಬೇಕು.\n\nತಂಡ 4 ಗಂಟೆಗಳಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    },
    hi: {
      lead: 'साफ फोटो चाहिए।',
      question: 'प्रभावित हिस्से की करीबी फोटो भेज सकते हैं?',
      expertEscalation:
        'विशेषज्ञ समीक्षा जरूरी है।\n\nटीम 4 घंटे में संपर्क करेगी।',
    },
  },
};

export const assessmentPlaybookService = {
  resolve(
    classification: ClassificationResult,
    language: AdvisoryLanguage,
    options?: { hasCropMedia?: boolean }
  ): PlaybookResult {
    const cat = classification.category;
    if (cat === 'disease_stress' || cat === 'cultivation') {
      return { action: 'continue_diagnosis' };
    }

    const copy = COPY[cat][language] ?? COPY[cat].en;
    const lowConfidence = classification.confidence < 0.62;
    const noMedia = !options?.hasCropMedia;

    if (lowConfidence && (cat === 'insect' || cat === 'unknown_low_conf') && noMedia) {
      return {
        action: 'reply',
        message: copy.expertEscalation,
        escalate: true,
      };
    }

    if (cat === 'compatibility') {
      const jarNote =
        language === 'ml'
          ? '\n\nവലിയ സ്പ്രേയ്ക്ക് മുമ്പ് jar test നടത്താൻ ശുപാർശ ചെയ്യുന്നു.'
          : '\n\nJar test is recommended before large-scale spraying.';
      return {
        action: 'reply',
        message: responseComposerService.compose({
          body: copy.lead + jarNote,
          validationQuestion: copy.question,
          footer: responseComposerService.advisoryDisclaimer(language),
        }),
      };
    }

    return {
      action: 'reply',
      message: responseComposerService.compose({
        body: copy.lead,
        validationQuestion: copy.question,
        footer: responseComposerService.advisoryDisclaimer(language),
      }),
      escalate: lowConfidence,
    };
  },

  async applyEscalation(farmerId: string, category: AgricultureInputCategory, notes?: string): Promise<void> {
    await createTelecallerTask({
      farmerId,
      title: `WhatsApp ${category} — expert review`,
      notes: notes ?? `Playbook escalation for ${category}`,
      priority: 'high',
    });
  },
};
