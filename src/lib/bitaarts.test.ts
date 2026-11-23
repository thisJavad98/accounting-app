import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractBitaGold18 } from "./bitaarts";

const sample = {
  meta: { success: true },
  data: {
    base_params: [
      {
        name: "هر گرم طلای 18 عیار",
        code: "gold18",
        value: 242_963_330,
        unit: "ریال",
        change_24h: 4.93,
        today_change_percentage: 2.75,
        last_update: "2026-11-23T11:28:18Z",
      },
    ],
    main_params: [],
  },
};

describe("extractBitaGold18", () => {
  it("reads only gold18 and converts rial to toman", () => {
    const item = extractBitaGold18(sample, "IRT");
    assert.ok(item);
    assert.equal(item.value, 24_296_333);
    assert.equal(item.direction, "up");
    assert.equal(item.changePct, 2.75);
    assert.equal(item.updatedAt, "2026-11-23T11:28:18Z");
  });

  it("keeps rial when currency is IRR", () => {
    const item = extractBitaGold18(sample, "IRR");
    assert.ok(item);
    assert.equal(item.value, 242_963_330);
  });

  it("returns null when gold18 is missing", () => {
    assert.equal(
      extractBitaGold18({ data: { base_params: [{ code: "other", value: 1 }] } }, "IRT"),
      null,
    );
  });
});
