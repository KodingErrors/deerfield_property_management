"use client";

import { useEffect, useRef, useState } from "react";
import { availabilityEmailLines, CallbackPicker } from "../callback-picker";
import { PhoneInput } from "../phone-input";
import { SendButton, type SendState } from "../send-button";
import { copyText } from "../use-toast";
import type { DeliveryConfig } from "../use-delivery-config";
import type { Match, Search } from "@/lib/catalog";
import { BODY_MAX_LENGTH, SUBJECT_MAX_LENGTH, enforceBody, enforceSubject } from "@/lib/inquiry-format.js";
import { buildInquiry, CONTACT_EMAIL, type ContactValues } from "@/lib/search";

type Props = {
  open: boolean;
  search: Search;
  matches: Match[];
  delivery: DeliveryConfig;
  /** Callback windows live in the wizard so closing and reopening the modal keeps them. */
  availability: ReadonlySet<string>;
  onAvailabilityChange: (next: Set<string>) => void;
  onClose: () => void;
  onSent: () => void;
  showToast: (message: string) => void;
};

const GENERATED_NOTE = "Drafted from your answers. Edit it freely — the form stops overwriting it once you do.";
const EDITED_NOTE = "You have customised this email. Form changes no longer update it.";

export function ContactModal({ open, onClose, ...rest }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  // `open` is the single source of truth: every close path calls onClose() and this
  // effect closes the element, rather than calling close() and waiting for the native
  // close event to travel back into React state.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="modal contact-modal"
      id="contact-dialog"
      aria-labelledby="contact-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}
    >
      {/* Unmounted while closed, so every opening starts from a fresh packet. */}
      <div id="contact-content">{open ? <ContactPacket {...rest} close={onClose} /> : null}</div>
    </dialog>
  );
}

type PacketProps = Omit<Props, "open" | "onClose"> & { close: () => void };

function readForm(form: HTMLFormElement | null, availability: string[]): ContactValues {
  const data = form ? new FormData(form) : new FormData();
  const text = (key: string) => String(data.get(key) || "").trim();
  return {
    name: text("name"), email: text("email"), phone: text("phone"), company: text("company"),
    intendedUse: text("intendedUse"), notes: text("notes"),
    propertyIds: data.getAll("contact-property").map(String),
    availability,
  };
}

function ContactPacket({ search, matches, delivery, availability, onAvailabilityChange, onSent, showToast, close }: PacketProps) {
  const form = useRef<HTMLFormElement>(null);
  const availabilityLines = availabilityEmailLines(availability);
  // Snapshot of the form, refreshed on every input so the packet follows it.
  const [values, setValues] = useState<ContactValues>(() => ({
    name: "", email: "", phone: "", company: "", intendedUse: search.intendedUse, notes: search.notes,
    propertyIds: matches.map((match) => match.property.id), availability: availabilityLines,
  }));
  // The editor is seeded from the form and follows it until the visitor edits the email
  // directly; from then on their wording wins and only an explicit reset regenerates it.
  const [edited, setEdited] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");

  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>("#contact-name")?.focus();
  }, []);

  const current = { ...values, availability: availabilityLines };
  const generated = buildInquiry(search, current, matches);
  const editorSubject = edited ? edited.subject : generated.subject;
  const editorBody = edited ? edited.body : generated.body;

  // What will actually be sent, copied or opened: the editor's text, run through the same
  // limits the server applies, so the preview stays faithful.
  function finalInquiry() {
    const subject = editorSubject.trim() || generated.subject;
    return { subject: enforceSubject(subject), body: enforceBody(editorBody) };
  }

  function refresh() {
    setValues(readForm(form.current, availabilityLines));
  }

  function validated(action: string): boolean {
    const element = form.current!;
    const latest = readForm(element, availabilityLines);
    if (!element.reportValidity() || !latest.name || !latest.email || !latest.intendedUse) {
      setError(`Add your name, email and intended use before ${action}.`);
      return false;
    }
    setError("");
    return true;
  }

  async function send() {
    if (!validated("sending")) return;
    const latest = readForm(form.current, availabilityLines);
    const packet = finalInquiry();
    setSendState("sending");
    setStatus("Sending your inquiry securely…");
    let sent = false;
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: latest.name, email: latest.email, subject: packet.subject, body: packet.body, submissionId: crypto.randomUUID() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The email could not be sent. Please try again.");
      setStatus("Your inquiry was sent to Deerfield successfully.");
      sent = true;
    } catch (sendError) {
      setStatus(sendError instanceof Error ? sendError.message : "The email could not be sent. Please try again.");
    } finally {
      setSendState(sent ? "idle" : "error");
    }
    if (sent) onSent();
  }

  async function copyInquiry() {
    const packet = finalInquiry();
    await copyText(`Subject: ${packet.subject}\n\n${packet.body}`);
    showToast("Inquiry copied to your clipboard.");
  }

  async function openInEmailApp() {
    if (!validated("opening the email")) return;
    const packet = finalInquiry();
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(packet.subject)}&body=${encodeURIComponent(packet.body)}`;
    // Long bodies overflow some mail clients' URL limit; fall back to the clipboard.
    if (mailto.length > 7800) {
      await copyText(packet.body);
      showToast("The inquiry was copied because it is too long for some email apps.");
      return;
    }
    window.location.href = mailto;
  }

  return (
    <>
      <header className="modal-header">
        <div>
          <p className="eyebrow">Review before contacting</p>
          <h2 id="contact-title">Your requirement packet</h2>
          <p>Everything remains editable, including the email itself. Send it straight to Deerfield, or open it in your own email app.</p>
        </div>
        <button className="icon-button" type="button" aria-label="Close contact form" onClick={close}>×</button>
      </header>
      <div className="contact-layout">
        <form id="contact-form" ref={form} noValidate onInput={refresh} onChange={refresh} onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <label className="wide-field"><span>Full name <b aria-hidden="true">*</b></span><input id="contact-name" name="name" type="text" required autoComplete="name" /></label>
            <label className="wide-field"><span>Email <b aria-hidden="true">*</b></span><input id="contact-email" name="email" type="email" required autoComplete="email" /></label>
            <label className="wide-field"><span>Phone <small>Optional</small></span><PhoneInput id="contact-phone" name="phone" /></label>
            <label className="wide-field"><span>Company <small>Optional</small></span><input id="contact-company" name="company" type="text" autoComplete="organization" /></label>
          </div>
          <label className="wide-field"><span>Intended use <b aria-hidden="true">*</b></span><textarea id="contact-use" name="intendedUse" rows={3} required defaultValue={search.intendedUse} /></label>
          <label className="wide-field"><span>Additional information</span><textarea id="contact-notes" name="notes" rows={4} defaultValue={search.notes} /></label>
          <fieldset className="selected-properties">
            <legend>Properties of interest</legend>
            {matches.length ? matches.map((match) => (
              <label key={match.property.id}>
                <input type="checkbox" name="contact-property" value={match.property.id} defaultChecked />
                <span><strong>{match.property.name}</strong><small>{match.property.city}, ON</small></span>
              </label>
            )) : <p>No property selected. Deerfield will receive your requirements only.</p>}
          </fieldset>
          {/* List view first: the modal's form column is too narrow for the grid to lead. */}
          <CallbackPicker selected={availability} onChange={onAvailabilityChange} mode="list" hasPhone={Boolean(values.phone)} />
          <p className="form-error" id="contact-error" role="alert">{error}</p>
        </form>
        <aside className="packet-preview">
          <p className="eyebrow">Your email — review and edit</p>
          <dl className="review-envelope" id="wizard-envelope">
            <div><dt>To</dt><dd id="wizard-to">{delivery.recipient}</dd></div>
            <div><dt>From</dt><dd id="wizard-from">{delivery.from || "Deerfield Deal Desk"}</dd></div>
            <div><dt>Reply-To</dt><dd id="wizard-reply-to">{values.email || "—"}</dd></div>
            <div><dt>Subject</dt><dd id="wizard-subject">{finalInquiry().subject}</dd></div>
          </dl>
          <div className="packet-editor" id="packet-editor">
            <label className="wide-field">
              <span>Subject</span>
              <input id="packet-subject" maxLength={SUBJECT_MAX_LENGTH} value={editorSubject} onChange={(event) => setEdited({ subject: event.target.value, body: editorBody })} />
            </label>
            <label className="wide-field packet-body-field">
              <span>Email message</span>
              <textarea id="packet-body" rows={18} maxLength={BODY_MAX_LENGTH} spellCheck value={editorBody} onChange={(event) => setEdited({ subject: editorSubject, body: event.target.value })} />
            </label>
            <p className="packet-editor-status" id="packet-editor-status">
              <span>{edited ? EDITED_NOTE : GENERATED_NOTE}</span>
              <button className="link-button" type="button" data-reset-packet hidden={!edited} onClick={() => { setEdited(null); document.querySelector<HTMLTextAreaElement>("#packet-body")?.focus(); }}>Reset to generated draft</button>
            </p>
          </div>
        </aside>
      </div>
      <footer className="modal-footer">
        <p className="form-status" id="wizard-send-status" aria-live="polite">{status}</p>
        <button className="secondary-button" type="button" onClick={copyInquiry}>Copy inquiry</button>
        <button className="secondary-button" type="button" onClick={openInEmailApp}>Open in email app</button>
        <SendButton state={sendState} onClick={send} data-send-inquiry="" />
      </footer>
    </>
  );
}
