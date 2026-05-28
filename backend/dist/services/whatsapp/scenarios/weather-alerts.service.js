import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { supabase } from '../../../lib/supabase.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';
/** Open-Meteo — live forecast (not canned sample text). */
const DISTRICT_COORDS = {
    wayanad: { lat: 11.6854, lon: 76.132, label: 'Wayanad' },
    ernakulam: { lat: 9.9312, lon: 76.2673, label: 'Kochi' },
    kochi: { lat: 9.9312, lon: 76.2673, label: 'Kochi' },
    bengaluru: { lat: 12.9716, lon: 77.5946, label: 'Bangalore' },
    bangalore: { lat: 12.9716, lon: 77.5946, label: 'Bangalore' },
};
const DEFAULT_COORDS = DISTRICT_COORDS.wayanad;
function dayLabel(isoDate, index, lang) {
    if (index === 0) {
        const today = {
            en: 'Today',
            ml: 'ഇന്ന്',
            ta: 'இன்று',
            kn: 'ಇಂದು',
            hi: 'आज',
        };
        return today[lang] ?? today.en;
    }
    if (index === 1) {
        const tomorrow = {
            en: 'Tomorrow',
            ml: 'നാളെ',
            ta: 'நாளை',
            kn: 'ನಾಳೆ',
            hi: 'कल',
        };
        return tomorrow[lang] ?? tomorrow.en;
    }
    try {
        return new Intl.DateTimeFormat(lang === 'ml' ? 'ml-IN' : 'en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Kolkata',
        }).format(new Date(`${isoDate}T12:00:00+05:30`));
    }
    catch {
        return isoDate;
    }
}
async function fetchSnapshot(farmerId, language) {
    const { data: farmer } = await supabase
        .from('farmers')
        .select('district, state')
        .eq('id', farmerId)
        .maybeSingle();
    const districtKey = String(farmer?.district ?? 'wayanad')
        .toLowerCase()
        .replace(/\s+/g, '');
    const coords = DISTRICT_COORDS[districtKey] ??
        DISTRICT_COORDS[String(farmer?.state ?? '').toLowerCase()] ??
        DEFAULT_COORDS;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set('daily', 'precipitation_sum,temperature_2m_max,relative_humidity_2m_mean');
    url.searchParams.set('forecast_days', '3');
    url.searchParams.set('timezone', 'Asia/Kolkata');
    const res = await fetch(url.toString());
    if (!res.ok)
        return null;
    const data = (await res.json());
    const daily = data.daily;
    if (!daily?.time?.length)
        return null;
    const days = [];
    for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const rainMm = daily.precipitation_sum?.[i] ?? 0;
        days.push({
            isoDate: daily.time[i],
            dayLabel: dayLabel(daily.time[i], i, language),
            rainMm,
            maxTempC: daily.temperature_2m_max?.[i],
            humidityPct: daily.relative_humidity_2m_mean?.[i],
            spraySuitable: rainMm < 5,
        });
    }
    const todayRain = days[0]?.rainMm ?? 0;
    const todayTemp = days[0]?.maxTempC ?? 0;
    return {
        locationLabel: coords.label,
        days,
        heavyRainLikely: todayRain >= 10 || days.some((d) => d.rainMm >= 15),
        highHeatLikely: todayTemp >= 34,
    };
}
function snapshotFacts(snapshot) {
    return snapshot.days
        .map((d) => {
        const parts = [
            `${d.dayLabel} (${d.isoDate})`,
            `rain ${d.rainMm.toFixed(1)} mm`,
            d.maxTempC != null ? `max ${d.maxTempC.toFixed(0)} C` : null,
            d.humidityPct != null ? `humidity ${d.humidityPct.toFixed(0)}%` : null,
            `spray ${d.spraySuitable ? 'suitable' : 'avoid'}`,
        ].filter(Boolean);
        return parts.join(', ');
    })
        .join('\n');
}
async function composeWithOpenAi(params) {
    if (!env.OPENAI_API_KEY?.trim())
        return null;
    const crop = params.cropType.charAt(0).toUpperCase() + params.cropType.slice(1);
    const langNames = {
        en: 'English',
        ml: 'Malayalam',
        ta: 'Tamil',
        kn: 'Kannada',
        hi: 'Hindi',
    };
    const system = `You are Morbeez Crop Doctor on WhatsApp.
Write a short, farmer-friendly weather advisory using ONLY the forecast facts provided.
Rules:
- Reply entirely in ${langNames[params.language]}.
- Max 520 characters.
- Sound human and practical, not like a rigid template.
- Mention location once.
- Include rainfall risk, spray timing guidance, and one crop-specific cultivation alert for ${crop}.
- Do NOT invent numbers; use only provided forecast values.
- Avoid repeating the same opening line every time.
- No markdown headings or bullet dumps.`;
    const user = `Location: ${params.snapshot.locationLabel}
Crop: ${crop}
${params.dap && params.dap > 0 ? `DAP: ${params.dap}` : ''}
${params.cropStage ? `Stage: ${params.cropStage}` : ''}
Recent issues: ${params.recentIssues}
Heavy rain likely: ${params.snapshot.heavyRainLikely ? 'yes' : 'no'}
High heat likely: ${params.snapshot.highHeatLikely ? 'yes' : 'no'}

Forecast facts:
${snapshotFacts(params.snapshot)}`;
    try {
        const res = await fetch(OPENAI_BASE, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: env.OPENAI_TEXT_MODEL,
                max_tokens: 320,
                temperature: 0.55,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
            }),
        });
        if (!res.ok) {
            logger.warn({ status: res.status }, 'Weather OpenAI compose failed');
            return null;
        }
        const data = (await res.json());
        const text = data.choices?.[0]?.message?.content?.trim();
        return text ? text.slice(0, 3500) : null;
    }
    catch (err) {
        logger.warn({ err }, 'Weather OpenAI compose error');
        return null;
    }
}
function compactFallback(snapshot, language, cropType) {
    const crop = cropType.charAt(0).toUpperCase() + cropType.slice(1);
    const today = snapshot.days[0];
    if (!today) {
        const unavailable = {
            en: `Weather for ${snapshot.locationLabel} is temporarily unavailable.`,
            ml: `${snapshot.locationLabel} പ്രദേശത്തിന്റെ കാലാവസ്ഥ ലഭ്യമല്ല.`,
            ta: `${snapshot.locationLabel} வானிலை தற்காலிகமாக கிடைக்கவில்லை.`,
            kn: `${snapshot.locationLabel} ಹವಾಮಾನ ಈಗ ಲಭ್ಯವಿಲ್ಲ.`,
            hi: `${snapshot.locationLabel} का मौसम अभी उपलब्ध नहीं है।`,
        };
        return unavailable[language] ?? unavailable.en;
    }
    const sprayLine = today.spraySuitable
        ? language === 'ml'
            ? 'ഇന്ന് സ്പ്രേ ചെയ്യാം.'
            : language === 'ta'
                ? 'இன்று தெளிப்பு செய்யலாம்.'
                : language === 'kn'
                    ? 'ಇಂದು ಸ್ಪ್ರೇ ಮಾಡಬಹುದು.'
                    : language === 'hi'
                        ? 'आज स्प्रे कर सकते हैं।'
                        : 'Spray is suitable today.'
        : language === 'ml'
            ? 'ഇന്ന് ഭാരമായി മഴ പ്രതീക്ഷിക്കുന്നതിനാൽ സ്പ്രേ ഒഴിവാക്കുക.'
            : language === 'ta'
                ? 'இன்று கனமழை எதிர்பார்ப்பால் தெளிப்பை தவிர்க்கவும்.'
                : language === 'kn'
                    ? 'ಇಂದು ಭಾರೀ ಮಳೆ ನಿರೀಕ್ಷೆಯಾಗಿದೆ; ಸ್ಪ್ರೇ ತಪ್ಪಿಸಿ.'
                    : language === 'hi'
                        ? 'आज भारी बारिश की संभावना है, स्प्रे न करें।'
                        : 'Avoid spray today due to rain risk.';
    const rainAlert = snapshot.heavyRainLikely && language === 'ml'
        ? ' മഴ അപകട സാധ്യത ഉയർന്നിരിക്കുന്നു.'
        : snapshot.heavyRainLikely
            ? ' High rainfall risk.'
            : '';
    const intro = {
        en: `📍 ${snapshot.locationLabel} — ${crop} field weather:`,
        ml: `📍 ${snapshot.locationLabel} — ${crop} കൃഷിക്ക്:`,
        ta: `📍 ${snapshot.locationLabel} — ${crop} பயிர்:`,
        kn: `📍 ${snapshot.locationLabel} — ${crop} ಬೆಳೆ:`,
        hi: `📍 ${snapshot.locationLabel} — ${crop} फसल:`,
    };
    const tempPart = today.maxTempC != null
        ? language === 'ml'
            ? ` പരമാവധി താപനില ${today.maxTempC.toFixed(0)}°C.`
            : ` Max ${today.maxTempC.toFixed(0)}°C.`
        : '';
    const humidityPart = today.humidityPct != null
        ? language === 'ml'
            ? ` ഈർപ്പം ~${today.humidityPct.toFixed(0)}%.`
            : ` Humidity ~${today.humidityPct.toFixed(0)}%.`
        : '';
    const rainPart = language === 'ml'
        ? ` ${today.dayLabel} മഴ ~${today.rainMm.toFixed(1)} mm.`
        : language === 'ta'
            ? ` ${today.dayLabel} மழை ~${today.rainMm.toFixed(1)} mm.`
            : language === 'kn'
                ? ` ${today.dayLabel} ಮಳೆ ~${today.rainMm.toFixed(1)} mm.`
                : language === 'hi'
                    ? ` ${today.dayLabel} बारिश ~${today.rainMm.toFixed(1)} mm.`
                    : ` ${today.dayLabel}: ~${today.rainMm.toFixed(1)} mm rain.`;
    return `${intro[language] ?? intro.en}${rainPart}${tempPart}${humidityPart} ${sprayLine}${rainAlert}`.trim();
}
export const weatherAlertsService = {
    async formatForFarmer(farmerId, language) {
        try {
            const [snapshot, ctx] = await Promise.all([
                fetchSnapshot(farmerId, language),
                fetchCompactFarmerContext(farmerId),
            ]);
            if (!snapshot) {
                return compactFallback({ locationLabel: 'your area', days: [], heavyRainLikely: false, highHeatLikely: false }, language, ctx.cropType);
            }
            const aiReply = await composeWithOpenAi({
                snapshot,
                language,
                cropType: ctx.cropType,
                cropStage: ctx.cropStage,
                dap: ctx.dap,
                recentIssues: ctx.recentIssues,
            });
            if (aiReply)
                return aiReply;
            return compactFallback(snapshot, language, ctx.cropType);
        }
        catch (err) {
            logger.warn({ err, farmerId }, 'Weather format failed');
            const unavailable = {
                en: 'Weather service is temporarily unavailable. Please try again shortly.',
                ml: 'കാലാവസ്ഥ സേവനം താൽക്കാലികമായി ലഭ്യമല്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.',
                ta: 'வானிலை சேவை தற்காலிகமாக கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.',
                kn: 'ಹವಾಮಾನ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
                hi: 'मौसम सेवा अस्थायी रूप से उपलब्ध नहीं है। थोड़ी देर बाद फिर कोशिश करें।',
            };
            return unavailable[language] ?? unavailable.en;
        }
    },
};
//# sourceMappingURL=weather-alerts.service.js.map