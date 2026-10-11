import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKey, todayKey } from "./dates";
import { intakeSms } from "./sms-intake";
import { looksLikeBankSms, parseBankSms } from "./sms-parser";

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
  assert.equal(dayKey(new Date(parsed.at ?? 0)), todayKey());
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

test("an SMS the bank dated on an earlier day is turned away", () => {
  const result = intakeSms("برداشت 1,250,000 در 2020/01/15 ساعت 14:23 مانده 3,400,000", "IRT", []);
  assert.equal(result.status, "old");
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
