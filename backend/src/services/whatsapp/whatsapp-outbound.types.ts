export interface WhatsAppProvider {
  sendText(to: string, text: string): Promise<void>;
  sendTemplate(to: string, name: string, params: { body: string[] }): Promise<void>;
  /** Optional: WhatsApp interactive list (Cloud API supports). */
  sendList?: (params: {
    to: string;
    header?: string;
    body: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  }) => Promise<void>;
  sendButtons?: (params: {
    to: string;
    body: string;
    buttons: Array<{ id: string; title: string }>;
  }) => Promise<void>;
}
