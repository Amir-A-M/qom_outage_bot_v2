import dotenv from 'dotenv';
import Bale, { Button } from './bot/Bale/Bale';
import { parsePlaces, stringifyPlaces } from './utils/placeParser';
import { UserService } from './modules/users/users';
import ScrapPowerOutage from './modules/scrapeOutage';
import { toReadableJalali } from './utils/toReadableJalali';
import cron from 'node-cron';
import { settings } from './settings';
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
      'من هر شب ساعت ۱۰، سایت برق رو بررسی می‌کنم و بهت میگم فردا برق چه ساعت(هایی) قطع میشه. اینطوری دیگه لازم نیست هر بار خودت دستی چک کنی.',
      '*راهنمای زیر رو با دقت بخون تا بتونی بدون مشکل ربات رو راه‌اندازی کنی* 👇',
    ],
    buttons.length ? buttons : undefined
  );

  setTimeout(async () => {
    await Bale.sendPhoto(chatId, 'src/images/list-example.png');
    await Bale.sendPhoto(chatId, 'src/images/search-phrase-example.png', [
      '*برای شروع* باید لیست مکان‌هات رو بفرستی.\n' +
        '*هر مکان دو خط داره:*\n' +
        '🔹 *خط اول:* یک اسم دلخواه برای خودت (مثلاً "خانه"، "کار"، "باشگاه" یا...) \n' +
        '🔹 *خط دوم:* همون نام منطقه‌ای که توی جدول خاموشی [qepd.co.ir](https://qepd.co.ir/fa-IR/DouranPortal/6423) برای محله شما نوشته شده ',

      '⬇️ *مثال:*\n' + 'خونه\n' + 'خیابان ساحلی',
      'کار\n' + 'از پل رجایی تا پل رضوی',
      'باشگاه\n' + '۱۷ متری فهیمی و خیابان حافظ\n',

      '⬇️ *نکات مهم:*\n' +
        '👈 هر مکان رو پشت سر هم، *جدا شده با یک خط خالی* بفرست.\n' +
        '👈 *اسم دلخواه* رو خودت انتخاب کن، هر چی دوست داری باشه.\n' +
        '👈 *ولی «نام منطقه»* باید دقیقاً همونی باشه که توی سایت [qepd.co.ir](https://qepd.co.ir/fa-IR/DouranPortal/6423) نوشته.\n' +
        '👈 اگه بنویسی "قدوسی". هم خاموشی "شهرک قدس خیابان قدوسی" و هم ساعت خاموشی "بلوار قدوسی تقاطع عماریاسر" رو برات میارم. *پس نام منطقه دقیق باشه!*\n' +
        '👈 *برای رفتن به خط جدید در کامپیوتر* از کلید Ctrl + Enter استفاده کنید. (قابل ویرایش در تنظیمات)',
    ]);
  }, 3000);
});

Bale.onCommand('/deleteUser', async (chatId) => {
  const user = Users.getUser(chatId);

  const buttons = [{ text: 'راهنما', callback_data: '/start' }] as Button[];

  if (user?.places) {
    const userList = stringifyPlaces(user.places);

    buttons.push({
      text: 'رونوشت لیست',
      copy_text: { text: userList },
    });
  }

  Users.deleteUser(chatId);
  await Bale.sendMessage(chatId, 'اطلاعاتت با موفقیت حذف شد 💀', buttons);
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
    `📢 ${formattedDate}:\n` + outageResult,
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

      '⬇️ *مثال:*\n' + 'خونه\n' + 'خیابان ساحلی',
      'کار\n' + 'از پل رجایی تا پل رضوی',
      'باشگاه\n' + '۱۷ متری فهیمی و خیابان حافظ\n',

      '⬇️ *نکات مهم:*\n' +
        '👈 هر مکان رو پشت سر هم، *جدا شده با یک خط خالی* بفرست.\n' +
        '👈 *اسم دلخواه* رو خودت انتخاب کن، هر چی دوست داری باشه.\n' +
        '👈 *ولی «نام منطقه»* باید دقیقاً همونی باشه که توی سایت [qepd.co.ir](https://qepd.co.ir/fa-IR/DouranPortal/6423) نوشته.\n' +
        '👈 اگه بنویسی "قدوسی". هم خاموشی "شهرک قدس خیابان قدوسی" و هم ساعت خاموشی "بلوار قدوسی تقاطع عماریاسر" رو برات میارم. *پس نام منطقه دقیق باشه!*\n' +
        '👈 *برای رفتن به خط جدید در کامپیوتر* از کلید Ctrl + Enter استفاده کنید. (قابل ویرایش در تنظیمات)',
    ],
    invalidButtons
  );
});

// Start
Bale.startPolling();

// Scheduled job
cron.schedule('0 0 22 * * *', async () => {
  let count = 0;
  for (const [chatId, data] of Object.entries(Users.getUsers())) {
    if (!data.places?.length) continue;

    count++;
    await checkOutage(chatId);
  }

  const logMessage = `Sent ${count} outage Notifs at ${new Date().toISOString().slice(0, 16)}`;

  if (settings.adminChatId)
    await Bale.sendMessage(settings.adminChatId, logMessage);
  console.log(logMessage);
});
