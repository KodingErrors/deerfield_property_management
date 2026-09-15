"use client";

import { useCallback, type InputHTMLAttributes } from "react";
import { bindPhoneFormatting } from "@/lib/phone-format.js";

// An uncontrolled tel input that formats North American numbers as they are typed
// ((416) 262-6853, +1 …). Uncontrolled on purpose: the formatter moves the caret itself,
// which a controlled value would fight. Read it through the surrounding form.
export function PhoneInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange">) {
  // A callback ref runs once per element, so the listener is bound exactly once.
  const bind = useCallback((input: HTMLInputElement | null) => {
    if (input && !input.dataset.phoneBound) {
      input.dataset.phoneBound = "true";
      bindPhoneFormatting(input);
    }
  }, []);
  return <input {...props} ref={bind} type="tel" autoComplete={props.autoComplete ?? "tel"} />;
}
