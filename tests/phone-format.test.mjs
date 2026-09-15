import assert from "node:assert/strict";
import test from "node:test";
import { caretAfterDigits, formatPhone } from "../lib/phone-format.js";

test("formats a North American number progressively as digits arrive", () => {
  const stages = ["", "4", "41", "416", "(416) 2", "(416) 26", "(416) 262", "(416) 262-6", "(416) 262-68", "(416) 262-685", "(416) 262-6853"];
  const digits = "4162626853";
  for (let length = 0; length <= digits.length; length += 1) {
    assert.equal(formatPhone(digits.slice(0, length)), stages[length]);
  }
});

test("reformatting its own output is idempotent", () => {
  for (const value of ["416", "(416) 262", "(416) 262-6853", "+1 (416) 262-6853", "+1"]) {
    assert.equal(formatPhone(value), value);
  }
});

test("a leading 1 is treated as the country code", () => {
  assert.equal(formatPhone("1"), "+1");
  assert.equal(formatPhone("+1"), "+1");
  assert.equal(formatPhone("14"), "+1 4");
  assert.equal(formatPhone("1 416 262 6853"), "+1 (416) 262-6853");
  assert.equal(formatPhone("+1 (416) 262-6853"), "+1 (416) 262-6853");
  assert.equal(formatPhone("+14162626853"), "+1 (416) 262-6853");
});

test("tolerates punctuation and spacing the visitor pasted in", () => {
  assert.equal(formatPhone("416.262.6853"), "(416) 262-6853");
  assert.equal(formatPhone("416-262-6853"), "(416) 262-6853");
  assert.equal(formatPhone(" 416 262 6853 "), "(416) 262-6853");
});

test("leaves numbers it does not understand exactly as typed", () => {
  for (const value of ["+44 20 7946 0958", "416-262-6853 x204", "416 262 6853 ext 12", "41626268531", "+"]) {
    assert.equal(formatPhone(value), value);
  }
  assert.equal(formatPhone(null), "");
});

test("caret lands after the same number of digits in the formatted text", () => {
  assert.equal(caretAfterDigits("(416) 262-6853", 0), 0);
  assert.equal(caretAfterDigits("(416) 262-6853", 3), 4);
  assert.equal(caretAfterDigits("(416) 262-6853", 4), 7);
  assert.equal(caretAfterDigits("(416) 262-6853", 7), 11);
  assert.equal(caretAfterDigits("(416) 262-6853", 10), 14);
  assert.equal(caretAfterDigits("(416) 262-6853", 99), 14);
});
