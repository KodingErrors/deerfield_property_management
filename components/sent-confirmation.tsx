"use client";

import { useEffect, useRef, useState } from "react";
import { sentSchedule } from "@/lib/sent-timing.js";
import { PlaneIcon } from "./send-button";

type Props = {
  open: boolean;
  onClose: () => void;
  message?: string;
};

// The centred confirmation both inquiry paths show after a successful send: the paper
// plane flies in for FLIGHT_MS, then "Sent!" appears; it dismisses on click, Escape or
// after a short linger. lib/sent-timing.js pins the timing.
export function SentConfirmation({ open, onClose, message = "Your inquiry is on its way to Deerfield." }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [landed, setLanded] = useState(false);
  // Held in a ref so an inline onClose from the parent cannot restart the flight on
  // every re-render.
  const dismiss = useRef(onClose);
  dismiss.current = onClose;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      if (element.open) element.close();
      return;
    }
    setLanded(false);
    if (!element.open) element.showModal();
    const { landAt, closeAt } = sentSchedule(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const landTimer = setTimeout(() => setLanded(true), landAt);
    // Dismisses itself after the linger; a click or Escape gets there sooner.
    const closeTimer = setTimeout(() => dismiss.current(), closeAt);
    return () => {
      clearTimeout(landTimer);
      clearTimeout(closeTimer);
    };
  }, [open]);

  return (
    <dialog
      ref={dialog}
      id="sent-dialog"
      className={`sent-dialog${landed ? " is-landed" : ""}`}
      aria-labelledby="sent-dialog-title"
      onClick={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className="sent-scene" aria-hidden="true">
        <svg className="sent-trail" viewBox="0 0 320 160" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 8">
          <path d="M14 142 C 90 138, 150 110, 196 76 S 262 34, 300 24" />
        </svg>
        <span className="sent-plane"><PlaneIcon /></span>
      </div>
      <div className="sent-copy">
        <p className="sent-title" id="sent-dialog-title" role="status">Sent!</p>
        <p className="sent-message">{message}</p>
        <button className="secondary-button" type="button">Done</button>
      </div>
    </dialog>
  );
}
