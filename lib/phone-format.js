// Live formatting for the optional phone fields. North American numbers (Deerfield is in
// Ontario) are shaped as the digits arrive — "416" → "(416) 262" → "(416) 262-6853", with an
// optional country code shown as "+1 (416) 262-6853". Anything that is not plainly a North
// American number (another country code, an extension, too many digits) is left exactly as
// typed so the visitor is never fought over a number the formatter does not understand.
// The pure helpers are DOM-free so they can be unit tested.

const NORTH_AMERICAN_INPUT = /^[\s()./-]*(?:\+?1[\s()./-]*)?[\d\s()./-]*$/;

export function formatPhone(raw) {
  const value = String(raw ?? "");
  if (!NORTH_AMERICAN_INPUT.test(value)) return value;

  let digits = value.replace(/\D/g, "");
  // No North American area code starts with 1, so a leading 1 is always the country code.
  const hasCountryCode = digits.startsWith("1");
  if (hasCountryCode) digits = digits.slice(1);
  if (digits.length > 10) return value;
  if (!digits) return hasCountryCode ? "+1" : value.trim() === "+" ? "+" : "";

  const area = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  const line = digits.slice(6, 10);
  let formatted = digits.length <= 3 ? area : `(${area}) ${exchange}`;
  if (line) formatted += `-${line}`;
  return hasCountryCode ? `+1 ${formatted}` : formatted;
}

// Caret position that keeps the same number of digits to the left after reformatting.
export function caretAfterDigits(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      seen += 1;
      if (seen === digitCount) return index + 1;
    }
  }
  return formatted.length;
}

function countDigits(text) {
  return (text.match(/\d/g) || []).length;
}

export function bindPhoneFormatting(input) {
  if (!input) return;
  let previous = input.value;

  input.addEventListener("input", (event) => {
    let value = input.value;
    let caret = input.selectionStart ?? value.length;

    // Backspacing over a formatting character alone would let the formatter put it straight
    // back, trapping the caret; treat it as deleting the digit before it instead.
    if (event.inputType === "deleteContentBackward" && countDigits(value) === countDigits(previous)) {
      const before = value.slice(0, caret).replace(/\d(?=\D*$)/, "");
      value = before + value.slice(caret);
      caret = before.length;
    }

    const formatted = formatPhone(value);
    const digitsBeforeCaret = countDigits(value.slice(0, caret));
    if (formatted !== input.value) {
      input.value = formatted;
      const position = caretAfterDigits(formatted, digitsBeforeCaret);
      input.setSelectionRange(position, position);
    }
    previous = input.value;
  });
}
