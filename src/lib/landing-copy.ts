import type { Locale } from "./types";

export type SmsSegment = string | { text: string; field: number };

const fa = {
  brand: "دخل",
  openApp: "باز کردن برنامه",
  howItWorks: "چطور کار می‌کند",
  switchTo: "English",
  hero: {
    title: "پیامک بانک می‌آید، حساب‌تان مرتب می‌شود.",
    body: "دخل پیامک بانک را می‌خواند، می‌پرسد برای چه پرداختید و آخر ماه نشان می‌دهد پول کجا رفت.",
    notification: { from: "بلو", text: "برداشت ۲,۶۰۰,۰۰۰ ریال از حساب شما" },
  },
  story: {
    title: "یک پیامک، شش جواب",
    body: "متن پیامک همین‌جا روی گوشی خودتان خوانده می‌شود. چیزی جایی فرستاده نمی‌شود.",
    sms: [
      { text: "بلو", field: 0 },
      "\n",
      { text: "برداشت پول", field: 1 },
      "\nمحمدجواد عزیز، ",
      { text: "2,600,000ریال", field: 2 },
      " از حساب شما پرید.\nموجودی: ",
      { text: "33,005,006 ریال", field: 3 },
      "\n",
      { text: "۹:۳۷  ۱۴۰۵.۰۷.۱۹", field: 4 },
    ] as SmsSegment[],
    fields: [
      { label: "بانک", value: "بلو" },
      { label: "نوع", value: "خرج" },
      { label: "مبلغ", value: "۲۶۰,۰۰۰ تومان" },
      { label: "موجودی", value: "۳,۳۰۰,۵۰۱ تومان" },
      { label: "زمان", value: "یکشنبه ۱۹ مهر، ۰۹:۳۷" },
      { label: "عنوان پیشنهادی", value: "برداشت پول" },
    ],
    ask: "و فقط یک سؤال از شما: این پول برای چه بود؟",
  },
  bento: {
    title: "برای خرج‌های واقعی هر روز ساخته شده",
    report: { title: "گزارش آخر ماه", body: "ببینید هر تومان کجا رفت، به تفکیک روز، دسته و عنوان." },
    ask: { title: "می‌پرسد چرا", body: "هر پیامک یک پنجره باز می‌کند تا عنوان و دلیل پرداخت را بنویسید." },
    privacy: { suffix: "٪", title: "در مرورگر خودتان", body: "بدون حساب کاربری و بدون سرور. فقط کوکی." },
    calendar: { title: "تقویم شمسی", body: "ماه‌ها و روزها همان‌طور که حساب می‌کنید." },
    themes: { title: "روشن و تیره", body: "بکشید و هر دو را ببینید." },
  },
  months: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
  year: "۱۴۰۵",
  banksTitle: "با پیامک بانک‌های ایرانی کار می‌کند",
  banks: ["ملت", "ملی", "بلو", "صادرات", "تجارت", "سامان", "پاسارگاد", "پارسیان", "سپه", "رسالت", "آینده", "شهر", "مسکن", "کشاورزی", "رفاه", "اقتصاد نوین", "ویپاد", "سینا"],
  manifesto: {
    eyebrow: "حریم خصوصی",
    text: "اطلاعات مالی شما فقط مال شماست. نه ثبت‌نام، نه سرور، نه ردیابی. هر تراکنش فقط در کوکی‌های همین مرورگر می‌ماند و هر وقت بخواهید با یک دکمه پاک می‌شود.",
  },
  steps: {
    title: "سه حرکت، یک ماه مرتب",
    items: [
      { title: "بفرستید", body: "پیامک بانک را کپی کنید یا مستقیم با برنامه به اشتراک بگذارید. مبلغ، بانک و تاریخ خودکار پر می‌شود." },
      { title: "بنویسید", body: "یک عنوان کوتاه و دلیل پرداخت بنویسید. پیشنهادها از خرج‌های قبلی خودتان می‌آیند." },
      { title: "ببینید", body: "آخر ماه ببینید هر تومان کجا رفت: به تفکیک روز، دسته و عنوان." },
    ],
  },
  final: { title: "از همین پیامک بعدی شروع کنید.", body: "رایگان، بدون ثبت‌نام، روی همین گوشی." },
  footer: "داده‌های شما فقط در همین مرورگر ذخیره می‌شود.",
};

export type LandingCopy = typeof fa;

const en: LandingCopy = {
  brand: "Dakhl",
  openApp: "Open the app",
  howItWorks: "How it works",
  switchTo: "فارسی",
  hero: {
    title: "Your bank texts you. Your books update.",
    body: "Dakhl reads each bank SMS, asks what the payment was for, and shows where your month went.",
    notification: { from: "Blu Bank", text: "IRR 2,600,000 debited from your account" },
  },
  story: {
    title: "One SMS, six answers",
    body: "The text is parsed right here on your phone. Nothing is uploaded anywhere.",
    sms: [
      { text: "Blu Bank", field: 0 },
      "\n",
      { text: "Card purchase", field: 1 },
      "\nDear Javad, ",
      { text: "IRR 2,600,000", field: 2 },
      " was debited at Hyperstar.\nBalance: ",
      { text: "33,005,006 IRR", field: 3 },
      "\n",
      { text: "09:37 2026/10/11", field: 4 },
    ],
    fields: [
      { label: "Bank", value: "Blu Bank" },
      { label: "Type", value: "Expense" },
      { label: "Amount", value: "260,000 Toman" },
      { label: "Balance", value: "3,300,501 Toman" },
      { label: "Time", value: "Sun, Oct 11, 09:37" },
      { label: "Suggested title", value: "Hyperstar" },
    ],
    ask: "Then just one question for you: what was it for?",
  },
  bento: {
    title: "Built for real, everyday spending",
    report: { title: "Month-end report", body: "See where every toman went, by day, category and title." },
    ask: { title: "It asks why", body: "Every SMS opens a sheet for a title and the reason you paid." },
    privacy: { suffix: "%", title: "in your own browser", body: "No account, no server. Just cookies." },
    calendar: { title: "Persian calendar", body: "Months and days the way you count them." },
    themes: { title: "Light and dark", body: "Drag to compare both." },
  },
  months: ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"],
  year: "1405",
  banksTitle: "Works with SMS from Iranian banks",
  banks: ["Mellat", "Melli", "Blu", "Saderat", "Tejarat", "Saman", "Pasargad", "Parsian", "Sepah", "Resalat", "Ayandeh", "Shahr", "Maskan", "Keshavarzi", "Refah", "EN Bank", "Wepod", "Sina"],
  manifesto: {
    eyebrow: "Privacy",
    text: "Your money is your business. No sign-up, no server, no tracking. Every entry lives only in this browser's cookies, and one tap erases it all.",
  },
  steps: {
    title: "Three moves, one tidy month",
    items: [
      { title: "Share", body: "Copy a bank SMS or share it straight to the app. Amount, bank and date fill in by themselves." },
      { title: "Note", body: "Add a short title and why you paid. Suggestions come from your own past entries." },
      { title: "Review", body: "At month end, see where every toman went, by day, category and title." },
    ],
  },
  final: { title: "Start with your next bank SMS.", body: "Free, no sign-up, right on this phone." },
  footer: "Your data is stored only in this browser.",
};

export const landingCopy: Record<Locale, LandingCopy> = { fa, en };
