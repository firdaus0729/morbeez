import type { AdvisoryLanguage } from '../../ai/types.js';

export function dispatchedMessage(params: {
  lang: AdvisoryLanguage;
  orderName: string;
  trackingId: string;
  expectedDelivery: string;
}): string {
  const { lang, orderName, trackingId, expectedDelivery } = params;
  const map: Record<AdvisoryLanguage, string> = {
    en: `✅ *Order dispatched successfully*\n\nOrder: ${orderName}\nTracking ID: *${trackingId}*\nExpected delivery: *${expectedDelivery}*`,
    ml: `✅ *ഓർഡർ അയച്ചു*\n\nഓർഡർ: ${orderName}\nട്രാക്കിംഗ് ID: *${trackingId}*\nഡെലിവറി: *${expectedDelivery}*`,
    ta: `✅ *ஆர்டர் அனுப்பப்பட்டது*\n\nஆர்டர்: ${orderName}\nTracking ID: *${trackingId}*\nடெலிவரி: *${expectedDelivery}*`,
    kn: `✅ *ಆರ್ಡರ್ ರವಾನಿಸಲಾಗಿದೆ*\n\nಆರ್ಡರ್: ${orderName}\nTracking ID: *${trackingId}*\nಡೆಲಿವರಿ: *${expectedDelivery}*`,
    hi: `✅ *ऑर्डर भेज दिया गया*\n\nऑर्डर: ${orderName}\nTracking ID: *${trackingId}*\nडिलीवरी: *${expectedDelivery}*`,
  };
  return map[lang] ?? map.en;
}

export function paymentFailedMessage(params: {
  lang: AdvisoryLanguage;
  orderRef: string;
  amountInr?: string;
}): string {
  const { lang, orderRef, amountInr } = params;
  const amt = amountInr ? ` (${amountInr})` : '';
  const map: Record<AdvisoryLanguage, string> = {
    en: `❌ *Payment failed*${amt}\n\nOrder ref: ${orderRef}\n\nPlease try again or select COD (Cash on Delivery).`,
    ml: `❌ *പേയ്മെന്റ് പരാജയപ്പെട്ടു*${amt}\n\nഓർഡർ: ${orderRef}\n\nവീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ COD തിരഞ്ഞെടുക്കുക.`,
    ta: `❌ *பணம் செலுத்த முடியவில்லை*${amt}\n\nஆர்டர்: ${orderRef}\n\nமீண்டும் முயற்சிக்கவும் அல்லது COD தேர்ந்தெடுக்கவும்.`,
    kn: `❌ *ಪೇಮೆಂಟ್ ವಿಫಲ*${amt}\n\nಆರ್ಡರ್: ${orderRef}\n\nಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ COD ಆಯ್ಕೆಮಾಡಿ.`,
    hi: `❌ *भुगतान विफल*${amt}\n\nऑर्डर: ${orderRef}\n\nफिर कोशिश करें या COD चुनें।`,
  };
  return map[lang] ?? map.en;
}

export function trackOrderDetail(params: {
  lang: AdvisoryLanguage;
  orderName: string;
  status: string;
  trackingId?: string;
  trackingUrl?: string;
  expectedDelivery?: string;
}): string {
  const lines = [
    `📦 *${params.orderName}*`,
    `Status: ${params.status}`,
  ];
  if (params.trackingId) lines.push(`Tracking: *${params.trackingId}*`);
  if (params.expectedDelivery) lines.push(`Expected: ${params.expectedDelivery}`);
  if (params.trackingUrl) lines.push(`\nTrack: ${params.trackingUrl}`);
  return lines.join('\n');
}

export function retryPaymentHint(lang: AdvisoryLanguage, url: string): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: `Complete payment here:\n${url}`,
    ml: `പേയ്മെന്റ് പൂർത്തിയാക്കുക:\n${url}`,
    ta: `பணம் செலுத்த:\n${url}`,
    kn: `ಪೇಮೆಂಟ್ ಪೂರ್ಣಗೊಳಿಸಿ:\n${url}`,
    hi: `भुगतान पूरा करें:\n${url}`,
  };
  return map[lang] ?? map.en;
}

export function codHint(lang: AdvisoryLanguage, url: string): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: `For COD, place order on our store and choose Cash on Delivery:\n${url}`,
    ml: `COD-ന് സ്റ്റോറിൽ ഓർഡർ ചെയ്ത് Cash on Delivery തിരഞ്ഞെടുക്കുക:\n${url}`,
    ta: `COD-க்கு கடையில் ஆர்டர் செய்து Cash on Delivery தேர்வு செய்யவும்:\n${url}`,
    kn: `COD ಗಾಗಿ ಅಂಗಡಿಯಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡಿ Cash on Delivery ಆಯ್ಕೆಮಾಡಿ:\n${url}`,
    hi: `COD के लिए स्टोर पर ऑर्डर करें और Cash on Delivery चुनें:\n${url}`,
  };
  return map[lang] ?? map.en;
}

export function noOrderFound(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'No recent order found for your number. Reply *menu* or contact support.',
    ml: 'നിങ്ങളുടെ നമ്പറിൽ റീസന്റ് ഓർഡർ കണ്ടെത്തിയില്ല. *menu* ടൈപ്പ് ചെയ്യുക.',
    ta: 'சமீபத்திய ஆர்டர் இல்லை. *menu* என தட்டச்சு செய்யுங்கள்.',
    kn: 'ಇತ್ತೀಚಿನ ಆರ್ಡರ್ ಸಿಗಲಿಲ್ಲ. *menu* ಟೈಪ್ ಮಾಡಿ.',
    hi: 'हाल का ऑर्डर नहीं मिला। *menu* टाइप करें।',
  };
  return map[lang] ?? map.en;
}
