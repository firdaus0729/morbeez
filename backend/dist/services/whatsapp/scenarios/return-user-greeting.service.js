import { supabase } from '../../../lib/supabase.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
function cropDisplay(cropType) {
    return cropType.charAt(0).toUpperCase() + cropType.slice(1);
}
function issuePrompt(issue, lang) {
    const map = {
        en: `Last time you mentioned ${issue}. Did it improve after the recommendation?`,
        ml: `കഴിഞ്ഞ തവണ ${issue} പറഞ്ഞിരുന്നു. നിർദ്ദേശത്തിന് ശേഷം മെച്ചപ്പെട്ടു തന്നെയാണോ?`,
        ta: `கடந்த முறை ${issue} என்று சொன்னீர்கள். பரிந்துரைக்குப் பிறகு முன்னேற்றம் உள்ளதா?`,
        kn: `ಕಳೆದ ಬಾರಿ ${issue} ಎಂದಿದ್ದಿರಿ. ನಮ್ಮ ಸಲಹೆಯ ನಂತರ ಸುಧಾರಣೆ ಕಂಡಿದೆಯೆ?`,
        hi: `पिछली बार आपने ${issue} बताया था। सलाह के बाद सुधार दिखा क्या?`,
    };
    return map[lang] ?? map.en;
}
function cropPrompt(ctx, lang) {
    const crop = cropDisplay(ctx.cropType);
    const cropKey = ctx.cropType.toLowerCase();
    if (cropKey === 'cardamom') {
        const cardamomMap = {
            en: 'How are the new chimb shoots in your cardamom block now?',
            ml: 'നിങ്ങളുടെ ഏലക്ക ബ്ലോക്കിലെ പുതിയ ചിമ്പ് ഷൂട്ടുകളുടെ നിലവിലെ സ്ഥിതി എങ്ങനെയാണ്?',
            ta: 'உங்கள் ஏலக்காய் பகுதியில் புதிய chimb shoots எப்படி இருக்கிறது?',
            kn: 'ನಿಮ್ಮ ಏಲಕ್ಕಿ ತೋಟದಲ್ಲಿನ ಹೊಸ ಚಿಂಬ್ ಶೂಟ್‌ಗಳ ಸ್ಥಿತಿ ಈಗ ಹೇಗಿದೆ?',
            hi: 'आपके इलायची ब्लॉक में नए चिम्ब शूट्स की स्थिति अब कैसी है?',
        };
        return cardamomMap[lang] ?? cardamomMap.en;
    }
    if (ctx.dap && ctx.dap > 0 && ctx.dap < 500) {
        const map = {
            en: `Your ${crop} crop is now around ${ctx.dap} DAP. How is the crop condition now?`,
            ml: `നിങ്ങളുടെ ${crop} കൃഷി ഇപ്പോൾ ഏകദേശം ${ctx.dap} DAP ആയി. ഇപ്പോൾ വിളയുടെ സ്ഥിതി എങ്ങനെയാണ്?`,
            ta: `உங்கள் ${crop} பயிர் இப்போது சுமார் ${ctx.dap} DAP. இப்போது பயிர் நிலை எப்படி?`,
            kn: `ನಿಮ್ಮ ${crop} ಬೆಳೆ ಈಗ ಸುಮಾರು ${ctx.dap} DAP. ಈಗ ಬೆಳೆ ಸ್ಥಿತಿ ಹೇಗಿದೆ?`,
            hi: `आपकी ${crop} फसल अब लगभग ${ctx.dap} DAP है। अभी फसल की हालत कैसी है?`,
        };
        return map[lang] ?? map.en;
    }
    const stage = ctx.cropStage?.trim();
    const map = {
        en: stage
            ? `Your ${crop} crop is at ${stage} stage. How is the field condition now?`
            : `How is your ${crop} crop condition now?`,
        ml: stage
            ? `നിങ്ങളുടെ ${crop} വിള ${stage} ഘട്ടത്തിലാണ്. നിലത്തിന്റെ സ്ഥിതി എങ്ങനെയാണ്?`
            : `നിങ്ങളുടെ ${crop} വിളയുടെ നിലവിലെ അവസ്ഥ എങ്ങനെയാണ്?`,
        ta: stage
            ? `உங்கள் ${crop} பயிர் ${stage} நிலையில் உள்ளது. வயல் நிலை இப்போது எப்படி?`
            : `உங்கள் ${crop} பயிர் நிலை இப்போது எப்படி உள்ளது?`,
        kn: stage
            ? `ನಿಮ್ಮ ${crop} ಬೆಳೆ ${stage} ಹಂತದಲ್ಲಿದೆ. ಹೊಲದ ಪರಿಸ್ಥಿತಿ ಈಗ ಹೇಗಿದೆ?`
            : `ನಿಮ್ಮ ${crop} ಬೆಳೆ ಸ್ಥಿತಿ ಈಗ ಹೇಗಿದೆ?`,
        hi: stage
            ? `आपकी ${crop} फसल ${stage} चरण में है। खेत की स्थिति अभी कैसी है?`
            : `आपकी ${crop} फसल की स्थिति अभी कैसी है?`,
    };
    return map[lang] ?? map.en;
}
function salutation(name, lang) {
    const first = name?.trim().split(/\s+/)[0];
    const base = {
        en: 'Hi',
        ml: 'ഹായ്',
        ta: 'ஹாய்',
        kn: 'ಹಾಯ್',
        hi: 'नमस्ते',
    };
    return first ? `${base[lang] ?? base.en} ${first} 👋` : `${base[lang] ?? base.en} 👋`;
}
export const returnUserGreetingService = {
    async buildSmartGreeting(farmerId, language) {
        const [historyCount, farmerRow, compactCtx, followup, order, issue] = await Promise.all([
            supabase
                .from('interaction_logs')
                .select('id', { count: 'exact', head: true })
                .eq('farmer_id', farmerId)
                .eq('channel', 'whatsapp'),
            supabase.from('farmers').select('name').eq('id', farmerId).maybeSingle(),
            fetchCompactFarmerContext(farmerId),
            supabase
                .from('callback_requests')
                .select('id')
                .eq('farmer_id', farmerId)
                .eq('status', 'pending')
                .limit(1)
                .maybeSingle(),
            supabase
                .from('commerce_orders')
                .select('id, fulfillment_status, financial_status, created_at')
                .eq('farmer_id', farmerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('disease_history')
                .select('issue_label')
                .eq('farmer_id', farmerId)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);
        const hasHistory = Boolean(historyCount.count && historyCount.count > 1);
        const hasCropContext = Boolean(compactCtx.cropType);
        if (!hasHistory || !hasCropContext)
            return null;
        const orderStatus = String(order.data?.fulfillment_status ?? '').toLowerCase();
        const paymentStatus = String(order.data?.financial_status ?? '').toLowerCase();
        const hasActiveOrder = Boolean(order.data?.id) &&
            !['delivered', 'cancelled', 'returned'].includes(orderStatus) &&
            !['refunded', 'voided'].includes(paymentStatus);
        const ctx = {
            farmerName: farmerRow.data?.name ?? undefined,
            cropType: compactCtx.cropType,
            dap: compactCtx.dap,
            cropStage: compactCtx.cropStage,
            unresolvedIssue: issue.data?.issue_label ?? undefined,
            hasPendingFollowUp: Boolean(followup.data?.id),
            hasActiveOrder,
        };
        let contextLine = '';
        if (ctx.unresolvedIssue) {
            contextLine = issuePrompt(ctx.unresolvedIssue, language);
        }
        else if (ctx.hasPendingFollowUp) {
            contextLine =
                language === 'ml'
                    ? 'മുൻ നിർദ്ദേശത്തിന് ശേഷം മാറ്റമുണ്ടായോ?'
                    : language === 'ta'
                        ? 'முந்தைய பரிந்துரைக்கு பிறகு மேம்பாடு ஏற்பட்டதா?'
                        : language === 'kn'
                            ? 'ಹಿಂದಿನ ಸಲಹೆಯ ನಂತರ ಸುಧಾರಣೆ ಕಂಡಿದೆಯೆ?'
                            : language === 'hi'
                                ? 'पिछली सलाह के बाद सुधार दिखा क्या?'
                                : 'Did you see improvement after the last recommendation?';
        }
        else {
            contextLine = cropPrompt(ctx, language);
        }
        return {
            greeting: `${salutation(ctx.farmerName, language)}\n\n${contextLine}`,
            includeTrackOrder: ctx.hasActiveOrder,
            optionsIntro: language === 'ml'
                ? 'താഴെയുള്ള ഓപ്ഷനുകളിൽ ഒന്ന് തിരഞ്ഞെടുക്കാം:'
                : language === 'ta'
                    ? 'கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்வு செய்யுங்கள்:'
                    : language === 'kn'
                        ? 'ಕೆಳಗಿನ ಆಯ್ಕೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ:'
                        : language === 'hi'
                            ? 'नीचे दिए विकल्पों में से चुनें:'
                            : 'Choose an option below:',
        };
    },
};
//# sourceMappingURL=return-user-greeting.service.js.map