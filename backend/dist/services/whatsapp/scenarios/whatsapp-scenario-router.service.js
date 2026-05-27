import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { conversationSessionService, } from '../conversation-session.service.js';
import { mainMenuCopy } from './whatsapp-menu.service.js';
import { t } from './whatsapp-flow-copy.js';
import { weatherAlertsService } from './weather-alerts.service.js';
import { dailyPricesService } from './daily-prices.service.js';
import { soilFlowService } from './soil-flow.service.js';
import { callbackFlowService } from './callback-flow.service.js';
import { terminologyService } from './terminology.service.js';
import { diagnosisFlowService } from './diagnosis-flow.service.js';
import { farmerWelcomeService } from './farmer-welcome.service.js';
import { multiPlotService } from './multi-plot.service.js';
import { orderWhatsappService } from '../orders/order-whatsapp.service.js';
import { cultivationLoggingService } from '../cultivation/cultivation-logging.service.js';
const CROP_MEDIA = new Set(['image', 'image_message', 'document']);
const MENU_IDS = new Set([
    'menu.diagnosis',
    'menu.weather',
    'menu.prices',
    'menu.soil',
    'menu.expert',
]);
function effectiveLanguage(session, fallback) {
    return (session.preferred_language ?? fallback);
}
function isMenuCommand(text) {
    return /^(menu|main menu|മെനു|மெனு)$/i.test(text.trim());
}
function isChangePlotCommand(text) {
    return /^(change plot|switch plot|plot change|മറ്റ് പ്ലോട്ട്|ப்ளாட் மாற்று)$/i.test(text.trim());
}
export const whatsappScenarioRouter = {
    async sendPlotPicker(phone, farmerId, lang, send, pendingText) {
        const plots = await multiPlotService.listPlots(farmerId);
        if (plots.length < 2)
            return;
        if (pendingText) {
            await conversationSessionService.patchContext(farmerId, { pendingSymptomsText: pendingText });
        }
        const list = multiPlotService.buildPlotList(plots, lang);
        if (send.list) {
            await send.list({ phone, ...list });
        }
        else if (send.buttons) {
            await send.buttons({
                phone,
                body: list.body,
                buttons: multiPlotService.buildPlotButtons(plots, lang),
            });
        }
        else {
            const names = plots.map((p) => p.crop_type).join(' / ');
            await send.text(phone, `${list.body}\n\nReply: ${names}`);
        }
        await conversationSessionService.setState(farmerId, 'plot_select');
    },
    async applyPlotSelection(msg, captured, lang, plotId, send) {
        const plots = await multiPlotService.listPlots(captured.farmerId);
        const plot = plots.find((p) => p.id === plotId);
        if (!plot) {
            await send.text(msg.phone, t('mainMenuHint', lang));
            return;
        }
        await multiPlotService.setActivePlot(captured.farmerId, plot);
        const ctx = await conversationSessionService.getContext(captured.farmerId);
        await send.text(msg.phone, multiPlotService.plotConfirmedMessage(plot, lang));
        if (ctx.pendingSymptomsText) {
            await conversationSessionService.patchContext(captured.farmerId, {
                pendingSymptomsText: undefined,
            });
            await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
            return;
        }
        await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
    },
    async tryRoute(msg, captured, session, send) {
        const lang = effectiveLanguage(session, captured.language);
        const text = (msg.text ?? '').trim();
        if (!session.preferred_language) {
            return { handled: false };
        }
        // Scenario 44 — always use stored language
        captured.language = lang;
        // Scenarios 30–31, 37 — cultivation logging
        if (text.startsWith('cult.') ||
            /^applied$/i.test(text) ||
            cultivationLoggingService.isSprayCompletedMessage(text)) {
            const cult = await cultivationLoggingService.handleInboundAction({
                farmerId: captured.farmerId,
                phone: msg.phone,
                language: lang,
                action: text,
                text,
            });
            if (cult.handled)
                return { handled: true };
        }
        // Scenarios 35–36 — order tracking & payment buttons
        if (text.startsWith('order.') ||
            text.startsWith('pay.') ||
            /^track\b/i.test(text) ||
            /order status/i.test(text) ||
            /^retry$/i.test(text) ||
            /^cod$/i.test(text)) {
            const handled = await orderWhatsappService.handleInboundAction({
                phone: msg.phone,
                farmerId: captured.farmerId,
                language: lang,
                action: text,
                text,
            });
            if (handled)
                return { handled: true };
        }
        if (isMenuCommand(text)) {
            await this.showMainMenu(msg.phone, lang, send);
            await conversationSessionService.setState(captured.farmerId, 'main_menu');
            return { handled: true };
        }
        if (isChangePlotCommand(text)) {
            await conversationSessionService.clearActivePlot(captured.farmerId);
            await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
            return { handled: true };
        }
        // Scenario 29 — plot selection (list/button reply)
        if (text.startsWith('plot.') || session.state === 'plot_select') {
            const plots = await multiPlotService.listPlots(captured.farmerId);
            const selected = multiPlotService.parsePlotSelection(text, plots);
            if (selected) {
                await this.applyPlotSelection(msg, captured, lang, selected.id, send);
                return { handled: true };
            }
            if (session.state === 'plot_select') {
                await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, text || undefined);
                return { handled: true };
            }
        }
        // Scenario 29 — multi-crop message ("Ginger fine, cardamom has issue")
        if (text) {
            const plots = await multiPlotService.listPlots(captured.farmerId);
            if (plots.length >= 2) {
                const analysis = multiPlotService.analyzeMultiCropMessage(text, plots);
                if (analysis.needsPlotPicker) {
                    if (analysis.suggestedPlot && analysis.cropsWithIssue.length === 1) {
                        await multiPlotService.setActivePlot(captured.farmerId, analysis.suggestedPlot);
                        await conversationSessionService.patchContext(captured.farmerId, {
                            pendingSymptomsText: text,
                        });
                        await send.text(msg.phone, multiPlotService.plotConfirmedMessage(analysis.suggestedPlot, lang));
                        await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
                        return { handled: true };
                    }
                    await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, text);
                    return { handled: true };
                }
                if (analysis.suggestedPlot && analysis.cropsMentioned.length === 1) {
                    await multiPlotService.setActivePlot(captured.farmerId, analysis.suggestedPlot);
                }
            }
        }
        // Main menu selection (list reply ids)
        if (text.startsWith('menu.') || MENU_IDS.has(text)) {
            await this.handleMenuSelection(msg, captured, lang, text, send);
            return { handled: true };
        }
        // Water volume / post-diagnosis actions
        if (text.startsWith('water.') || session.state === 'diagnosis_water_volume') {
            const handled = await this.handleWaterVolume(msg, captured, lang, text, send);
            if (handled)
                return { handled: true };
        }
        if (text === 'action.callback' || /^callback$/i.test(text)) {
            await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
            return { handled: true };
        }
        if (/^technical$/i.test(text) || text === 'action.technical') {
            const ctx = await conversationSessionService.getContext(captured.farmerId);
            if (ctx.diagnosis?.lastAdvisorySummary) {
                await send.text(msg.phone, ctx.diagnosis.lastAdvisorySummary);
            }
            else if (ctx.diagnosis?.dosageItems?.length) {
                await send.text(msg.phone, diagnosisFlowService.technicalOnlyReply({ dosageGuidance: ctx.diagnosis.dosageItems }, lang));
            }
            return { handled: true };
        }
        // Soil sub-menu
        if (text.startsWith('soil.')) {
            await this.handleSoilAction(msg, captured, lang, text, send);
            return { handled: true };
        }
        // Chimb follow-up buttons (Scenario 7)
        if (session.state === 'chimb_followup' && /^(chimb\.(yes|no|unsure)|yes|no)$/i.test(text)) {
            const answer = text.includes('no') ? 'no' : text.includes('yes') ? 'yes' : 'unsure';
            await conversationSessionService.patchContext(captured.farmerId, { chimbDrainage: answer });
            await send.text(msg.phone, terminologyService.chimbAdviceCopy(lang));
            await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
            return { handled: true };
        }
        // Scenario 7 — chimb issue
        if (text && terminologyService.isChimbIssue(text)) {
            await conversationSessionService.setState(captured.farmerId, 'chimb_followup');
            if (send.buttons) {
                await send.buttons({
                    phone: msg.phone,
                    body: terminologyService.chimbQuestionCopy(lang),
                    buttons: [
                        { id: 'chimb.yes', title: 'Yes' },
                        { id: 'chimb.no', title: 'No' },
                        { id: 'chimb.unsure', title: 'Not Sure' },
                    ],
                });
            }
            else {
                await send.text(msg.phone, terminologyService.chimbQuestionCopy(lang));
            }
            return { handled: true };
        }
        // Scenario 8 — unknown terminology
        if (text && terminologyService.isLikelyUnknownRegionalPhrase(text)) {
            const { data: farmer } = await supabase
                .from('farmers')
                .select('district')
                .eq('id', captured.farmerId)
                .maybeSingle();
            const resolved = await terminologyService.resolveTerm(text, lang, farmer?.district, undefined);
            if (!resolved.found || resolved.confidence < 0.6) {
                await terminologyService.createReviewTask({
                    farmerId: captured.farmerId,
                    term: text,
                    language: lang,
                    district: farmer?.district ?? undefined,
                    contextText: text,
                });
                await conversationSessionService.setState(captured.farmerId, 'terminology_clarify');
                await send.text(msg.phone, terminologyService.clarifyCopy(lang));
                return { handled: true };
            }
        }
        // Scenario 12 — low yield without soil report
        if (text &&
            /\b(yield|production|harvest).*(low|poor|kam|കുറ|குற|ಕಮಿ|कम)\b/i.test(text)) {
            const hasReport = await soilFlowService.hasSoilReport(captured.farmerId);
            if (!hasReport) {
                const soil = await soilFlowService.handleLowYieldWithoutReport(captured.farmerId, lang);
                await send.text(msg.phone, soil.body);
                if (send.list) {
                    await send.list({ phone: msg.phone, ...soil.list });
                }
                await conversationSessionService.setState(captured.farmerId, 'soil_flow');
                return { handled: true };
            }
        }
        // PDF / document soil report (Scenario 14)
        if (msg.msgType === 'document' && session.state === 'soil_flow') {
            await send.text(msg.phone, soilFlowService.reportReceivedReply(lang));
            await conversationSessionService.setState(captured.farmerId, 'main_menu');
            return { handled: true };
        }
        // Scenario 2 — image in diagnosis flow
        if (CROP_MEDIA.has(msg.msgType)) {
            const plots = await multiPlotService.listPlots(captured.farmerId);
            if (plots.length >= 2 && !(await multiPlotService.getActivePlotId(captured.farmerId))) {
                await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, msg.text || undefined);
                return { handled: true };
            }
            if (plots.length === 1) {
                await multiPlotService.setActivePlot(captured.farmerId, plots[0]);
            }
            const diagnosisStates = new Set([
                'diagnosis_awaiting_photos',
                'diagnosis',
                'main_menu',
                'root_photos_requested',
                'plot_select',
            ]);
            if (diagnosisStates.has(session.state) || session.state === 'main_menu') {
                const { imageCount, shouldRunDiagnosis } = await diagnosisFlowService.recordImageReceived(captured.farmerId);
                if (imageCount === 1) {
                    await send.text(msg.phone, diagnosisFlowService.firstImagePrompt(lang));
                    await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
                    return { handled: true };
                }
                if (shouldRunDiagnosis) {
                    const welcome = await farmerWelcomeService.buildWelcomeLine(captured.farmerId, lang);
                    await send.text(msg.phone, diagnosisFlowService.analyzingPrompt(lang));
                    return { handled: true, runDiagnosis: true, welcomePrefix: welcome ?? undefined };
                }
            }
        }
        if (session.state === 'diagnosis_awaiting_photos' && text) {
            await send.text(msg.phone, t('diagnosisPrompt', lang));
            return { handled: true };
        }
        if (session.state === 'soil_flow' && text && !text.startsWith('soil.')) {
            await send.text(msg.phone, t('mainMenuHint', lang));
            return { handled: true };
        }
        return { handled: false };
    },
    async showMainMenu(phone, lang, send) {
        const menu = mainMenuCopy(lang);
        if (send.list) {
            await send.list({
                phone,
                body: menu.welcome,
                buttonText: menu.buttonText,
                sections: [{ title: 'Menu', rows: menu.rows }],
            });
        }
        else {
            await send.text(phone, menu.welcome);
        }
    },
    async handleMenuSelection(msg, captured, lang, menuId, send) {
        switch (menuId) {
            case 'menu.diagnosis': {
                const plots = await multiPlotService.listPlots(captured.farmerId);
                await conversationSessionService.patchContext(captured.farmerId, {
                    diagnosis: { imageCount: 0 },
                });
                if (plots.length >= 2 && !(await multiPlotService.getActivePlotId(captured.farmerId))) {
                    await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
                    break;
                }
                if (plots.length === 1) {
                    await multiPlotService.setActivePlot(captured.farmerId, plots[0]);
                }
                await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
                await send.text(msg.phone, t('diagnosisPrompt', lang));
                break;
            }
            case 'menu.weather': {
                const weather = await weatherAlertsService.formatForFarmer(captured.farmerId, lang);
                await send.text(msg.phone, weather);
                await conversationSessionService.setState(captured.farmerId, 'main_menu');
                break;
            }
            case 'menu.prices': {
                const prices = await dailyPricesService.formatForFarmer(captured.farmerId, lang);
                await send.text(msg.phone, prices);
                await conversationSessionService.setState(captured.farmerId, 'main_menu');
                break;
            }
            case 'menu.soil': {
                const soil = soilFlowService.soilMenuList(lang);
                if (send.list) {
                    await send.list({ phone: msg.phone, ...soil });
                }
                else {
                    await send.text(msg.phone, soil.body);
                }
                await conversationSessionService.setState(captured.farmerId, 'soil_flow');
                break;
            }
            case 'menu.expert':
                await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
                await conversationSessionService.setState(captured.farmerId, 'main_menu');
                break;
            default:
                await this.showMainMenu(msg.phone, lang, send);
        }
    },
    async handleSoilAction(msg, captured, lang, action, send) {
        switch (action) {
            case 'soil.address':
                await send.text(msg.phone, soilFlowService.addressReply(lang));
                break;
            case 'soil.testing':
                await send.text(msg.phone, await soilFlowService.requestSoilTesting(captured.farmerId, lang));
                break;
            case 'soil.upload':
                await send.text(msg.phone, lang === 'ml'
                    ? 'മണ്ണ് റിപ്പോർട്ടിന്റെ PDF അല്ലെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.'
                    : 'Please send your soil report PDF or photo.');
                break;
            case 'soil.expert':
                await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang, 'Soil expert'));
                break;
            default:
                break;
        }
        await conversationSessionService.setState(captured.farmerId, 'soil_flow');
    },
    async handleWaterVolume(msg, captured, lang, text, send) {
        if (text === 'action.callback') {
            await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
            return true;
        }
        const liters = diagnosisFlowService.parseWaterLiters(text);
        if (liters == null) {
            if (text === 'water.custom') {
                await send.text(msg.phone, lang === 'ml'
                    ? 'എത്ര ലിറ്റർ വെള്ളം? ഉദാ: 300L'
                    : 'How many liters? Example: 300L');
                return true;
            }
            return false;
        }
        const reply = await diagnosisFlowService.formatQuantityReply(captured.farmerId, lang, liters);
        await send.text(msg.phone, reply);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        return true;
    },
    async afterDiagnosis(params) {
        await diagnosisFlowService.storeDiagnosisResult(params.farmerId, params.sessionId, params.advisory, params.summary);
        if (params.advisory.confidence < 0.55 || params.advisory.escalationRecommended) {
            await params.send.text(params.phone, diagnosisFlowService.lowConfidenceReply(params.lang));
            if (params.send.buttons) {
                await params.send.buttons({
                    phone: params.phone,
                    body: 'Choose:',
                    buttons: [
                        { id: 'action.upload', title: 'Upload Photos' },
                        { id: 'action.callback', title: 'Callback' },
                    ],
                });
            }
            return;
        }
        if (/\b(root|nematode|rhizome|വേര|வேர்|ಬೇರು|जड़)\b/i.test(params.advisory.probableIssue) ||
            params.advisory.stressAnalysis?.some((s) => /root|nematode/i.test(s))) {
            await params.send.text(params.phone, diagnosisFlowService.rootPhotosReply(params.lang));
            await conversationSessionService.setState(params.farmerId, 'root_photos_requested');
            return;
        }
        const ctx = await conversationSessionService.getContext(params.farmerId);
        if ((ctx.diagnosis?.dosageItems?.length ?? 0) > 0) {
            const list = diagnosisFlowService.waterVolumeList(params.lang);
            if (params.send.list) {
                await params.send.list({ phone: params.phone, ...list });
            }
            else {
                await params.send.text(params.phone, list.body);
            }
        }
        const hasProducts = params.hasProductRecommendations ??
            ((params.advisory.dosageGuidance?.length ?? 0) > 0 ||
                (params.advisory.recommendedProductTags?.length ?? 0) > 0);
        await cultivationLoggingService
            .onAdvisoryCompleted({
            farmerId: params.farmerId,
            sessionId: params.sessionId,
            language: params.lang,
            hasProductRecommendations: hasProducts,
        })
            .catch((err) => logger.error({ err }, 'Cultivation follow-up schedule failed'));
    },
};
//# sourceMappingURL=whatsapp-scenario-router.service.js.map