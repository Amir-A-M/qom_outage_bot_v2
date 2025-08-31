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

export type Button = {
  text: string;
  callback_data?: string;
  url?: string;
  copy_text?: { text: string };
};

type CommandHandler = (chatId: string, text: string) => Promise<void> | void;

type CallbackHandler = (chatId: string, data: string) => Promise<void> | void;

export default class Bale {
  private static token = process.env.BALE_TOKEN!;
  private static apiBase = `https://tapi.bale.ai/bot${Bale.token}`;
  private static offset = 0;
  private static commands: Map<string, CommandHandler> = new Map();
  private static callbacks: Map<string, CallbackHandler> = new Map();
  private static defaultHandler: CommandHandler | null = null;

  /** Send a plain text message */
  static async sendMessage(
    chatId: string | number,
    text: string | string[],
    buttons?: Button[]
  ) {
    if (!text) return;

    const reply_markup = {
      inline_keyboard: [
        buttons?.map((b) => ({
          text: b.text,
          callback_data: b.callback_data,
          copy_text: b.copy_text,
        })),
      ],
    };

    await axios.post(
      `${this.apiBase}/sendMessage`,
      {
        chat_id: chatId,
        text: typeof text === 'string' ? text : text.join('\n\n'),
        reply_markup: !!buttons && reply_markup,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /** Send a photo */
  static async sendPhoto(
    chatId: string | number,
    photoPath: string,
    caption?: string | string[]
  ) {
    const form = new FormData();
    form.append('chat_id', chatId.toString());
    form.append('photo', fs.createReadStream(photoPath));
    if (caption)
      form.append(
        'caption',
        typeof caption === 'string' ? caption : caption.join('\n\n')
      );

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

  /** Add callback handler (button clicks) */
  static onCallback(data: string, handler: CallbackHandler) {
    this.callbacks.set(data, handler);
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
          for (const update of res.data.result as any[]) {
            this.offset = update.update_id + 1;

            // ✅ Normal text messages
            if (update.message?.text) {
              const chatId = update.message.chat.id.toString();
              const text = update.message.text.trim();

              if (this.commands.has(text)) {
                await this.commands.get(text)!(chatId, text);
              } else if (this.defaultHandler) {
                await this.defaultHandler(chatId, text);
              }
            }

            // ✅ Button clicks (callback queries)
            if (update.callback_query) {
              const chatId = update.callback_query.message.chat.id.toString();
              const fullData = update.callback_query.data;
              const data = fullData.split('|')[0];

              // 1) Dedicated callback handlers
              if (this.callbacks.has(data)) {
                await this.callbacks.get(data)!(chatId, fullData);
              }
              // 2) Fallback: reuse command handlers
              else if (this.commands.has(data)) {
                await this.commands.get(data)!(chatId, fullData);
              }
              // 3) Last fallback: default handler
              else if (this.defaultHandler) {
                await this.defaultHandler(chatId, fullData);
              }

              // ✅ optional: acknowledge button press
              await axios.post(`${this.apiBase}/answerCallbackQuery`, {
                callback_query_id: update.callback_query.id,
              });
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }
  }
}
