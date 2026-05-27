import { supabase } from '../../../lib/supabase.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { blockService } from '../../core/block.service.js';
const CROP_ALIASES = {
    ginger: ['ginger', 'inchi', 'ഇഞ്ചി', 'இஞ்சி', 'ಶುಂಠಿ', 'अदरक', 'adrak'],
    cardamom: ['cardamom', 'elakka', 'ഏലക്ക', 'ஏலக்காய்', 'ಏಲಕ್ಕಿ', 'इलायची', 'elachi'],
    pepper: ['pepper', 'kurumulaku', 'കുരുമുളക്', 'மிளகு', 'ಮೆಣಸು', 'काली मिर्च', 'black pepper'],
    turmeric: ['turmeric', 'manjal', 'മഞ്ഞൾ', 'மஞ்சள்', 'ಹಳದಿ', 'हल्दी'],
    banana: ['banana', 'vazha', 'വാഴ', 'வாழை', 'ಬಾಳೆ', 'केला'],
    coconut: ['coconut', 'thenga', 'തേങ്ങ', 'தேங்காய்', 'ತೆಂಗ', 'नारियल'],
};
const ISSUE_SIGNALS = /\b(issue|problem|disease|pest|yellow|wilt|spot|damage|sick|dying|roganam|രോഗ|കീട|நோய்|ಕೀಟ|रोग|समस्या|issue|prashnam|kuzhappam)\b/i;
const OK_SIGNALS = /\b(fine|ok|okay|good|healthy|ningnanu|ningnallaa|സുഖം|நல்ல|ಚೆನ್ನಾಗಿ|ठीक|theek)\b/i;
function normalizeCropKey(cropType) {
    return cropType.trim().toLowerCase();
}
function cropMentionedInText(text, cropType) {
    const key = normalizeCropKey(cropType);
    const aliases = CROP_ALIASES[key] ?? [key];
    const lower = text.toLowerCase();
    return aliases.some((a) => lower.includes(a.toLowerCase()));
}
function plotDisplayName(plot, lang) {
    if (plot.plot_label?.trim())
        return plot.plot_label.trim();
    const crop = plot.crop_type.charAt(0).toUpperCase() + plot.crop_type.slice(1);
    if (lang === 'ml') {
        if (plot.crop_type === 'ginger')
            return 'ഇഞ്ചി പ്ലോട്ട്';
        if (plot.crop_type === 'cardamom')
            return 'ഏലക്ക പ്ലോട്ട്';
    }
    return `${crop} Plot`;
}
export const multiPlotService = {
    async listPlots(farmerId) {
        const blocks = await blockService.listByFarmer(farmerId);
        if (blocks.length === 0) {
            const created = await blockService.ensureDefaultBlock(farmerId);
            return [
                {
                    id: created.id,
                    crop_type: created.crop_type,
                    stage: created.stage,
                    acreage: created.acreage_decimal,
                    plot_label: created.plot_label,
                    is_primary: created.is_primary,
                },
            ];
        }
        return blocks.map((b) => ({
            id: b.id,
            crop_type: b.crop_type,
            stage: b.stage,
            acreage: b.acreage_decimal,
            plot_label: b.plot_label,
            is_primary: b.is_primary,
        }));
    },
    async getActivePlotId(farmerId) {
        const { data } = await supabase
            .from('conversation_sessions')
            .select('active_block_id, active_plot_id')
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .maybeSingle();
        return data?.active_block_id ?? data?.active_plot_id ?? null;
    },
    async setActivePlot(farmerId, plot) {
        const now = new Date().toISOString();
        await supabase
            .from('conversation_sessions')
            .update({
            active_block_id: plot.id,
            active_plot_id: plot.id,
            updated_at: now,
        })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp');
        await conversationSessionService.patchContext(farmerId, {
            activeCropType: plot.crop_type,
            activePlotLabel: plotDisplayName(plot, 'en'),
        });
    },
    parsePlotSelection(text, plots) {
        const t = text.trim();
        if (t.startsWith('plot.')) {
            const id = t.slice(5);
            const byId = plots.find((p) => p.id === id);
            if (byId)
                return byId;
            const byCrop = plots.find((p) => normalizeCropKey(p.crop_type) === normalizeCropKey(id));
            if (byCrop)
                return byCrop;
        }
        for (const plot of plots) {
            const name = plotDisplayName(plot, 'en').toLowerCase();
            if (t.toLowerCase().includes(name.toLowerCase()))
                return plot;
            if (cropMentionedInText(t, plot.crop_type) && plots.length <= 3) {
                const exact = plots.filter((p) => cropMentionedInText(t, p.crop_type));
                if (exact.length === 1)
                    return exact[0];
            }
        }
        return null;
    },
    analyzeMultiCropMessage(text, plots) {
        if (plots.length < 2) {
            return {
                needsPlotPicker: false,
                cropsMentioned: [],
                cropsWithIssue: [],
                cropsOk: [],
                suggestedPlot: plots[0] ?? null,
            };
        }
        const mentioned = plots.filter((p) => cropMentionedInText(text, p.crop_type));
        const cropsMentioned = mentioned.map((p) => p.crop_type);
        if (mentioned.length < 2) {
            return {
                needsPlotPicker: false,
                cropsMentioned,
                cropsWithIssue: [],
                cropsOk: [],
                suggestedPlot: mentioned[0] ?? null,
            };
        }
        const segments = text.split(/[.,;!\n]+/).map((s) => s.trim()).filter(Boolean);
        const withIssue = [];
        const ok = [];
        for (const plot of mentioned) {
            const seg = segments.find((s) => cropMentionedInText(s, plot.crop_type)) ?? text;
            if (ISSUE_SIGNALS.test(seg) && !OK_SIGNALS.test(seg)) {
                withIssue.push(plot.crop_type);
            }
            else if (OK_SIGNALS.test(seg)) {
                ok.push(plot.crop_type);
            }
        }
        const cropsWithIssue = withIssue.length > 0
            ? withIssue
            : mentioned.filter((p) => !ok.includes(p.crop_type)).map((p) => p.crop_type);
        const suggested = cropsWithIssue.length === 1
            ? (mentioned.find((p) => p.crop_type === cropsWithIssue[0]) ?? null)
            : null;
        return {
            needsPlotPicker: true,
            cropsMentioned,
            cropsWithIssue,
            cropsOk: ok,
            suggestedPlot: suggested,
        };
    },
    plotSelectPrompt(lang) {
        const map = {
            en: 'Which plot has the issue?',
            ml: 'ഏത് പ്ലോട്ടിലാണ് പ്രശ്നം?',
            ta: 'எந்த ப்ளாட்டில் பிரச்சனை?',
            kn: 'ಯಾವ ಪ್ಲಾಟ್‌ನಲ್ಲಿ ಸಮಸ್ಯೆ?',
            hi: 'किस प्लॉट में समस्या है?',
        };
        return map[lang] ?? map.en;
    },
    plotConfirmedMessage(plot, lang) {
        const name = plotDisplayName(plot, lang);
        const map = {
            en: `Got it — we'll focus on *${name}*.\n\nPlease send a crop photo or describe symptoms.`,
            ml: `ശരി — *${name}* ഫോക്കസ് ചെയ്യുന്നു.\n\nഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ ലക്ഷണങ്ങൾ വിവരിക്കുക.`,
            ta: `சரி — *${name}* மீது கவனம்.\n\nபடம் அனுப்பவும் அல்லது அறிகுறிகளை விவரிக்கவும்.`,
            kn: `ಸರಿ — *${name}* ಮೇಲೆ ಗಮನ.\n\nಫೋಟೋ ಕಳುಹಿಸಿ ಅಥವಾ ಲಕ್ಷಣಗಳನ್ನು ವಿವರಿಸಿ.`,
            hi: `ठीक है — *${name}* पर ध्यान.\n\nफोटो भेजें या लक्षण बताएं।`,
        };
        return map[lang] ?? map.en;
    },
    buildPlotList(plots, lang) {
        return {
            body: this.plotSelectPrompt(lang),
            buttonText: lang === 'ml' ? 'പ്ലോട്ട്' : 'Plot',
            sections: [
                {
                    title: 'Plots',
                    rows: plots.slice(0, 10).map((p) => ({
                        id: `plot.${p.id}`,
                        title: plotDisplayName(p, lang).slice(0, 24),
                        description: p.stage ? `${p.stage}${p.acreage ? ` · ${p.acreage} ac` : ''}` : undefined,
                    })),
                },
            ],
        };
    },
    buildPlotButtons(plots, lang) {
        return plots.slice(0, 3).map((p) => ({
            id: `plot.${p.id}`,
            title: plotDisplayName(p, lang).slice(0, 20),
        }));
    },
    async requiresPlotSelection(farmerId) {
        const plots = await this.listPlots(farmerId);
        if (plots.length < 2)
            return false;
        const activeId = await this.getActivePlotId(farmerId);
        return !activeId;
    },
};
//# sourceMappingURL=multi-plot.service.js.map