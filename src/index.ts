import dotenv from 'dotenv';
import Bale, { Button } from './bot/Bale/Bale';
import { parsePlaces, stringifyPlaces } from './utils/placeParser';
import { UserService } from './modules/users/users';
import ScrapPowerOutage from './modules/scrapeOutage';
import { toReadableJalali } from './utils/toReadableJalali';
dotenv.config();

const Users = new UserService();
const scraper = new ScrapPowerOutage();

// Command handlers
Bale.onCommand('/start', async (chatId) => {
  const buttons = [];
  const user = Users.getUser(chatId);
  if (user?.places) {
    buttons.push(
      { text: 'نمایش لیست', callback_data: '/myList' },
      { text: 'بررسی قطعی برق', callback_data: '/checkOutage' },
      { text: 'حذف کاربر', callback_data: '/deleteUser' }
    );
  }

  await Bale.sendMessage(
    chatId,
    [
      'سلام!\n به ربات *قطعی برق قم* خوش اومدی 👋',
      'برای شروع، لیست مکان‌های خودت رو وارد کن تا من هر روز رأس ساعت ۱۲:۳۰ بامداد، زمان قطعی برق رو برات بفرستم.\n\n',
    ],
    buttons.length ? buttons : undefined
  );

  await Bale.sendPhoto(chatId, 'src/images/search-phrase-example.png', [
    'برای ادامه، نام منطقه‌ت رو *دقیقاً* از جدول خاموشی [qepd.co.ir](https://qepd.co.ir/fa-IR/DouranPortal/6423) کپی کن و قرار بده.',
    '❗️لطفاً دقیقا از همین ساختار لقب، مکان و خط جدید استفاده کن. مثال:\n' +
      ('خانه\n' + 'چهارمندان'),
    'کار\n' + 'خیابان ساحلی',
    'باشگاه\n' + '۱۷ متری فهیمی و خیابان حافظ',
    'ℹ️ برای رفتن به خط جدید در کامپیوتر از کلید Ctrl + Enter استفاده کنید. (قابل ویرایش در تنظیمات)',
  ]);
});

Bale.onCommand('/deleteUser', async (chatId) => {
  Users.deleteUser(chatId);
  await Bale.sendMessage(chatId, 'اطلاعاتت با موفقیت حذف شد 💀', [
    { text: 'راهنما', callback_data: '/start' },
  ]);
});

Bale.onCommand('/myList', async (chatId) => {
  const user = Users.getUser(chatId);

  const buttons = [
    { text: 'راهنما', callback_data: '/start' },
    { text: 'بررسی قطعی برق', callback_data: '/checkOutage' },
  ] as Button[];

  if (!user?.places) {
    return await Bale.sendMessage(
      chatId,
      'لیستی برای شما ثبت نشده!\n' + 'راهنما رو بزن و لیست خودت رو وارد کن 👇',
      buttons
    );
  }

  const userList = stringifyPlaces(user.places);

  buttons.push({
    text: 'رونوشت و اصلاح',
    copy_text: { text: userList },
  });

  await Bale.sendMessage(chatId, userList, buttons);
});

Bale.onCommand('/checkOutage', checkOutage);

async function checkOutage(chatId: string) {
  const user = Users.getUser(chatId);

  const buttons = [{ text: 'راهنما', callback_data: '/start' }] as Button[];

  if (!user?.places) {
    return await Bale.sendMessage(
      chatId,
      'لیستی برای شما ثبت نشده!\n' + 'راهنما رو بزن و لیست خودت رو وارد کن 👇',
      buttons
    );
  }

  buttons.push({ text: 'بررسی قطعی برق', callback_data: '/checkOutage' });

  const ScrapedOutage = await scraper.check(user.places);

  if ('error' in ScrapedOutage) {
    return await Bale.sendMessage(
      chatId,
      `${ScrapedOutage.error} [${ScrapedOutage.code}]`,
      buttons
    );
  }

  const outageResult = ScrapedOutage.places
    .map(({ outageTimes, place }) => {
      const outageTimeString = outageTimes
        .map(({ startHour, endHour }) => `از ${startHour} تا ${endHour}`)
        .join(' و ');
      return [place.alias, outageTimeString].join('\n');
    })
    .join('\n\n');

  const formattedDate = toReadableJalali(ScrapedOutage.date);
  await Bale.sendMessage(
    chatId,
    `⚠️${formattedDate}\n` + outageResult,
    buttons
  );
}

Bale.onCommand('/save', async (chatId, text) => {
  // text here is "/save|ENCODED_STRING"
  const [, encoded] = text.split('|');
  const decoded = decodeURIComponent(encoded);

  const list = parsePlaces(decoded);
  Users.setUser(chatId, { places: list });

  const buttons = [
    { text: 'راهنما', callback_data: '/start' },
    { text: 'بررسی قطعی برق', callback_data: '/checkOutage' },
  ];
  await Bale.sendMessage(
    chatId,
    'با موفقیت لیست بروز شد 👍\n' +
      'هر روز ساعت قطعی رو خودکار برات ارسال میکنم!',
    buttons
  );
});

Bale.onMessage(async (chatId, text) => {
  const user = Users.getUser(chatId);
  const list = parsePlaces(text);
  const input = stringifyPlaces(list);

  const correctButtons = [
    { text: 'ذخیره', callback_data: `/save|${encodeURIComponent(input)}` },
    { text: 'رونوشت و اصلاح', copy_text: { text: input } },
  ];

  if (list.length) {
    if (user?.places) {
      correctButtons.push({
        text: 'نمایش لیست قبلی',
        callback_data: '/myList',
      });
    }

    return await Bale.sendMessage(
      chatId,
      'این رو ذخیره کنم؟\n' + input,
      correctButtons
    );
  }

  const invalidButtons = [
    { text: 'راهنما', callback_data: '/start' },
    { text: 'رونوشت و اصلاح', copy_text: { text: text } },
  ];

  if (user?.places) {
    invalidButtons.push({
      text: 'نمایش لیست قبلی',
      callback_data: '/myList',
    });
  }

  await Bale.sendMessage(
    chatId,
    [
      'خطایی در پردازش لیست رخ داد!\n' + text,
      'ساختار درست:\n' +
        '<لقب>\n<نام منطقه>\n\n<لقب>\n<نام منطقه>\n' +
        'جدا کردن با خط و... مهم است!',
    ],
    invalidButtons
  );
});

// Start
Bale.startPolling();
