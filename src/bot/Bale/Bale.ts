import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

type Update = {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
};

type CommandHandler = (chatId: string, text: string) => Promise<void> | void;

export default class Bale {
  private static token = process.env.BALE_TOKEN!;
  private static apiBase = `https://tapi.bale.ai/bot${Bale.token}`;
  private static offset = 0;
  private static commands: Map<string, CommandHandler> = new Map();
  private static defaultHandler: CommandHandler | null = null;

  /** Send a plain text message */
  static async sendMessage(chatId: string | number, text: string) {
    await axios.post(
      `${this.apiBase}/sendMessage`,
      { chat_id: chatId, text },
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /** Send a photo */
  static async sendPhoto(
    chatId: string | number,
    photoPath: string,
    caption?: string
  ) {
    const form = new FormData();
    form.append('chat_id', chatId.toString());
    form.append('photo', fs.createReadStream(photoPath));
    if (caption) form.append('caption', caption);

    await axios.post(`${this.apiBase}/sendPhoto`, form, {
      headers: form.getHeaders(),
    });
  }

  /** Add command handler */
  static onCommand(command: string, handler: CommandHandler) {
    this.commands.set(command, handler);
  }

  /** Set default message handler */
  static onMessage(handler: CommandHandler) {
    this.defaultHandler = handler;
  }

  /** Polling loop */
  static async startPolling() {
    console.log('Bale bot polling started...');
    while (true) {
      try {
        const res = await axios.post(`${this.apiBase}/getUpdates`, {
          offset: this.offset,
          timeout: 30,
        });
        if (res.data.ok && res.data.result.length) {
          for (const update of res.data.result as Update[]) {
            this.offset = update.update_id + 1;

            if (update.message?.text) {
              const chatId = update.message.chat.id.toString();
              const text = update.message.text.trim();

              if (this.commands.has(text)) {
                await this.commands.get(text)!(chatId, text);
              } else if (this.defaultHandler) {
                await this.defaultHandler(chatId, text);
              }
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }
  }
}
