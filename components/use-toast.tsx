"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A single bottom-centre toast. The hook returns the message setter and the element to
// render once, near the end of the page.
export function useToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toast = <output id="app-toast" className={`toast${visible ? " visible" : ""}`} aria-live="polite">{message}</output>;
  return { showToast, toast };
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}
