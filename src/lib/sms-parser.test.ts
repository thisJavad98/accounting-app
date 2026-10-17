import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKey, todayKey } from "./dates";
import { computeBankInventories, detectSmsInventoryPreview } from "./inventory";
import { intakeSms } from "./sms-intake";
import { looksLikeBankSms, parseBankSms, parseBankSmsBatch } from "./sms-parser";

const jalali = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const part = (type: string) => jalali.find((p) => p.type === type)?.value;
/** Today written the way an Iranian bank writes it, so the tests do not expire. */
const TODAY = `${part("year")}/${part("month")}/${part("day")}`;

const read = (sms: string) => {
  const parsed = parseBankSms(sms);
  assert.ok(parsed, `could not read: ${sms}`);
  return parsed;
};

test("reads an amount that shares its line with the balance", () => {
  const parsed = read("برداشت 1,250,000 ریال مانده 3,400,000");
  assert.equal(parsed.amount, 1_250_000);
  assert.equal(parsed.balance, 3_400_000);
  assert.equal(parsed.kind, "expense");
});

test("a one-line deposit is income, not an expense", () => {
  const parsed = read("واریز 50,000,000 ریال مانده 61,000,000");
  assert.equal(parsed.kind, "income");
  assert.equal(parsed.amount, 50_000_000);
});

test("a card number is not mistaken for the amount", () => {
  const parsed = read("خرید از کارت 6104-3378-1234-5678 مبلغ 1,250,000\nمانده 3,400,000");
  assert.equal(parsed.amount, 1_250_000);
});

test("a reference number is not mistaken for a date", () => {
  const parsed = read("برداشت:1,250,000\nپیگیری:123456-07-19\nمانده:3,400,000");
  assert.equal(parsed.at, null);
  assert.equal(parsed.dateStated, false);
});

for (const [label, written] of [
  ["year first", TODAY],
  ["day first", TODAY.split("/").reverse().join("/")],
  ["two-digit year", TODAY.slice(2)],
  ["dashes", TODAY.replace(/\//g, "-")],
] as const) {
  test(`a date written ${label} lands on today`, () => {
    const parsed = read(`برداشت:1,250,000\n${written} 14:23\nمانده:3,400,000`);
    assert.equal(parsed.dateStated, true);
    assert.equal(dayKey(new Date(parsed.at ?? 0)), todayKey());
  });
}

test("a bare clock time is not treated as a stated date", () => {
  const parsed = read("برداشت 1,250,000 ساعت 14:23:51 مانده 3,400,000");
  assert.equal(parsed.dateStated, false);
  assert.equal(intakeSms("برداشت 1,250,000 ساعت 14:23:51 مانده 3,400,000", "IRT", []).status, "ready");
});

test("takes the merchant as the title", () => {
  assert.equal(read("خرید از دیجی کالا\nمبلغ 2,400,000 ریال\nمانده 9,100,000").suggestedTitle, "دیجی کالا");
  assert.equal(read("purchase 1,250,000 IRR at Starbucks. balance 3,400,000").suggestedTitle, "Starbucks");
  assert.equal(read("خرید از کارت 6104-3378-1234-5678 مبلغ 1,250,000").suggestedTitle, "");
});

test("reads an amount the SMS names with no word the parser knows", () => {
  const parsed = read("تراکنش کارت شما 1,250,000\nمانده 3,400,000");
  assert.equal(parsed.amount, 1_250_000);
  assert.equal(parsed.balance, 3_400_000);
});

test("reads thousands grouped with dots", () => {
  const parsed = read("تراکنش کارت شما 1.250.000 ریال\nمانده 3.400.000 ریال");
  assert.equal(parsed.amount, 1_250_000);
  assert.equal(parsed.balance, 3_400_000);
});

test("text that never mentions money is not an SMS, numbers or not", () => {
  assert.equal(parseBankSms("یادداشت جلسه فردا ساعت 10:30 اتاق 1,250,000"), null);
  assert.equal(parseBankSms("https://example.com/order/1250000"), null);
  assert.equal(looksLikeBankSms("یادداشت جلسه فردا"), false);
  assert.equal(looksLikeBankSms("برداشت 1,250,000 ریال"), true);
});

const OLD_SMS = "برداشت 1,250,000 در 2020/01/15 ساعت 14:23 مانده 3,400,000";

test("an SMS the bank dated on an earlier day keeps that day", () => {
  const result = intakeSms(OLD_SMS, "IRT", []);
  assert.equal(result.status, "old");
  assert.ok(result.status === "old");
  assert.equal(dayKey(new Date(result.tx.at)), "2020-01-15");
});

test("an old SMS already saved is a duplicate, not offered again", () => {
  const first = intakeSms(OLD_SMS, "IRT", []);
  assert.ok(first.status === "old");
  assert.equal(intakeSms(OLD_SMS, "IRT", [first.tx]).status, "duplicate");
});

test("an SMS with no date at all is taken as new", () => {
  const result = intakeSms("برداشت: 1,250,000\nمانده: 3,400,000", "IRT", []);
  assert.equal(result.status, "ready");
});

test("the same undated SMS read twice is a duplicate", () => {
  const sms = "بانک ملت\nبرداشت: 1,250,000\nمانده: 3,400,000";
  const first = intakeSms(sms, "IRT", []);
  assert.equal(first.status, "ready");
  assert.ok(first.status === "ready");
  assert.equal(intakeSms(sms, "IRT", [first.tx]).status, "duplicate");
});

test("rials are converted to tomans, balance included", () => {
  const result = intakeSms("برداشت 1,250,000 ریال مانده 3,400,000", "IRT", []);
  assert.ok(result.status === "ready");
  assert.equal(result.tx.amount, 125_000);
  assert.equal(result.tx.balance, 340_000);
});

test("detects balance-only inventory SMS and multi-line balance", () => {
  const parsed = read("بانک سامان\nموجودی قابل برداشت:\n45,000,000 ریال");
  assert.equal(parsed.bank, "بانک سامان");
  assert.equal(parsed.balance, 45_000_000);
  assert.equal(parsed.amount, 0);
});

test("deduplicates duplicate banks by keeping the last inventory and sums across distinct banks", () => {
  const multiSms = [
    "بانک ملت\nبرداشت: 1,000,000 ریال\nمانده: 20,000,000 ریال",
    "بانک سامان\nواریز: 5,000,000 ریال\nموجودی: 35,000,000 ریال",
    "بانک ملت\nبرداشت: 2,000,000 ریال\nمانده: 18,000,000 ریال",
  ].join("\n\n");

  const batch = parseBankSmsBatch(multiSms);
  assert.equal(batch.length, 3);

  const preview = detectSmsInventoryPreview(multiSms, "IRT");
  // 2 distinct banks (Mellat & Saman), Mellat keeps its last inventory (1,800,000 IRT) + Saman (3,500,000 IRT)
  assert.equal(preview.rawCount, 3);
  assert.equal(preview.items.length, 2);
  assert.equal(preview.totalInventory, 1_800_000 + 3_500_000);

  const summary = computeBankInventories([
    {
      id: "1",
      kind: "expense",
      amount: 100_000,
      at: 1_000,
      title: "بانک ملت",
      note: "",
      category: "other",
      bank: "بانک ملت",
      balance: 2_000_000,
    },
    {
      id: "2",
      kind: "income",
      amount: 500_000,
      at: 2_000,
      title: "بانک سامان",
      note: "",
      category: "salary",
      bank: "سامان",
      balance: 3_500_000,
    },
    {
      id: "3",
      kind: "expense",
      amount: 200_000,
      at: 3_000,
      title: "ملت",
      note: "",
      category: "other",
      bank: "ملت",
      balance: 1_800_000,
    },
  ]);

  assert.equal(summary.count, 2);
  assert.equal(summary.items[0].balance, 1_800_000);
  assert.equal(summary.items[1].balance, 3_500_000);
  assert.equal(summary.total, 5_300_000);
});

