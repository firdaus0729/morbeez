export interface WhatsAppProvider {
  sendText(to: string, text: string): Promise<void>;
  sendTemplate(to: string, name: string, params: { body: string[] }): Promise<void>;
}
