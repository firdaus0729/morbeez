import { whatsappService } from '../whatsapp.service.js';
/** WhatsApp outbound adapters for ROI flows (worker + inbound). */
export function createRoiWhatsAppSenders() {
    return {
        text: (phone, text) => whatsappService.sendText(phone, text),
        list: (p) => whatsappService.sendList({
            to: p.phone,
            body: p.body,
            buttonText: p.buttonText,
            sections: p.sections,
        }),
        buttons: (p) => whatsappService.sendButtons({
            to: p.phone,
            body: p.body,
            buttons: p.buttons,
        }),
    };
}
//# sourceMappingURL=roi-whatsapp-senders.js.map