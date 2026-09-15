"use client";

import type { ButtonHTMLAttributes } from "react";

export type SendState = "idle" | "sending" | "error";

const LABELS: Record<SendState, string> = { idle: "Send inquiry", sending: "Sending", error: "Try again" };

export function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 3 10 14" /><path d="M21 3 14 21l-4-7-7-4Z" />
    </svg>
  );
}

// The "Send inquiry" button on both inquiry paths. It stays quiet (a paper-plane icon
// that nudges on hover and a "Sending" state); the moment of sending is shown by
// <SentConfirmation/> instead.
export function SendButton({ state, ...rest }: { state: SendState } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled">) {
  const className = ["primary-button send-button", state !== "idle" ? `is-${state}` : ""].filter(Boolean).join(" ");
  return (
    <button {...rest} className={className} type="button" disabled={state === "sending"}>
      <span className="send-icon" aria-hidden="true"><PlaneIcon /></span>
      <span className="send-label">{LABELS[state]}</span>
    </button>
  );
}
