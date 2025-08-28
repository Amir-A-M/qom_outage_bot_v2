import dotenv from 'dotenv';
import Bale from './bot/Bale/Bale';
dotenv.config();

// Command handlers
Bale.onCommand('/start', async (chatId) => {
  await Bale.sendMessage(chatId, 'سلام! به ربات قطعی برق خوش آمدید 👋');
  await Bale.sendPhoto(
    chatId,
    'src/images/search-phrase-example.png',
    'مثال: خیابان ساحلی'
  );
});

Bale.onCommand('/ping', async (chatId) => {
  await Bale.sendMessage(chatId, 'pong 🏓');
});

// Default text handler
Bale.onMessage(async (chatId, text) => {
  await Bale.sendMessage(chatId, `You said: ${text}`);
});

// Start
Bale.startPolling();
