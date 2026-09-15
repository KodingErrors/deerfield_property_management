"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { availabilityEmailLines, CallbackPicker } from "./callback-picker";
import { PhoneInput } from "./phone-input";
import { SendButton, type SendState } from "./send-button";
import { SentConfirmation } from "./sent-confirmation";
import { useDeliveryConfig } from "./use-delivery-config";
import { callbackDays } from "@/lib/callback-schedule";
import { properties, type Property } from "@/lib/catalog";
import { BODY_MAX_LENGTH, SUBJECT_MAX_LENGTH, enforceBody, enforceSubject } from "@/lib/inquiry-format.js";

const INTERESTS = ["Commercial leasing", "Buying a property", "Selling a property", "Investment advisory", "General inquiry"];

type Values = { name: string; email: string; phone: string; company: string; interest: string; message: string; website: string };

function readValues(form: HTMLFormElement): Values {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) || "").trim();
  return { name: text("name"), email: text("email"), phone: text("phone"), company: text("company"), interest: text("interest"), message: text("message"), website: text("website") };
}

function buildInquiry(values: Values, selected: Property[], callbacks: string[]) {
  const subjectDetail = selected.length === 1 ? selected[0].name : selected.length > 1 ? `${selected.length} properties` : values.interest;
  return {
    subject: `[DEERFIELD] Inquiry — ${subjectDetail}`,
    body: [
      "DEERFIELD DEAL DESK INQUIRY", "", `Name: ${values.name}`, `Email: ${values.email}`,
      `Phone: ${values.phone || "Not provided"}`, `Company: ${values.company || "Not provided"}`,
      `Interest: ${values.interest}`, "", "PROPERTIES",
      ...(selected.length ? selected.map((property) => `- ${property.name}, ${property.city}, ON`) : ["- No specific property"]),
      "", "CALLBACK AVAILABILITY (EASTERN TIME)",
      ...(callbacks.length ? callbacks : ["- No callback windows selected"]),
      "", "MESSAGE", values.message,
    ].join("\n"),
  };
}

export function ContactForm() {
  const form = useRef<HTMLFormElement>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const delivery = useDeliveryConfig();
  const days = useMemo(callbackDays, []);

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [availability, setAvailability] = useState<ReadonlySet<string>>(new Set());
  const [hasPhone, setHasPhone] = useState(false);
  const [formStatus, setFormStatus] = useState("");

  // The review dialog: what will be sent, editable until the visitor presses send.
  const [pending, setPending] = useState<(Values & { propertyIds: string[]; availability: string[] }) | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendStatus, setSendStatus] = useState("");
  const [sentOpen, setSentOpen] = useState(false);

  // The portfolio comparison hands over several properties at once through the URL.
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).getAll("property").filter((id) => properties.some((item) => item.id === id));
    if (wanted.length) setSelectedIds(new Set(wanted));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("#contact-property-picker")) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const selected = properties.filter((item) => selectedIds.has(item.id));
  const needle = propertyQuery.trim().toLowerCase();
  const options = properties.filter((item) => `${item.name} ${item.city}`.toLowerCase().includes(needle));

  function toggleProperty(id: string, on: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function openReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = form.current!;
    if (!element.reportValidity()) return;
    const values = readValues(element);
    const email = buildInquiry(values, selected, availabilityEmailLines(availability, days));
    setPending({ ...values, propertyIds: [...selectedIds], availability: [...availability] });
    setSubject(enforceSubject(email.subject));
    setBody(email.body);
    setSendStatus("");
    setSendState("idle");
    reviewDialog.current?.showModal();
  }

  function closeReview() {
    reviewDialog.current?.close();
    setSendStatus("");
  }

  async function send() {
    if (!pending || !subject.trim() || !body.trim()) {
      setSendStatus("Add a subject and email message before sending.");
      return;
    }
    setSendState("sending");
    setSendStatus("Sending your inquiry securely…");
    let sent = false;
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Send precisely what the dialog displayed.
        body: JSON.stringify({ ...pending, subject: enforceSubject(subject), body: enforceBody(body), submissionId: crypto.randomUUID() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The email could not be sent. Please try again.");
      setSendStatus("Your inquiry was sent to Deerfield successfully.");
      setFormStatus("Your inquiry was sent to Deerfield successfully.");
      form.current?.reset();
      setSelectedIds(new Set());
      setAvailability(new Set());
      setHasPhone(false);
      setPending(null);
      sent = true;
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "The email could not be sent. Please try again.");
    } finally {
      setSendState(sent ? "idle" : "error");
    }
    if (sent) {
      reviewDialog.current?.close();
      setSentOpen(true);
    }
  }

  return (
    <>
      <form
        ref={form}
        className="inquiry-form"
        id="inquiry-form"
        noValidate
        onSubmit={openReview}
        onInput={(event) => {
          const target = event.target as HTMLInputElement;
          if (target.name === "phone") setHasPhone(Boolean(target.value.trim()));
        }}
      >
        <div className="form-grid">
          <label className="wide-field"><span>Full name *</span><input name="name" required autoComplete="name" /></label>
          <label className="wide-field"><span>Email *</span><input name="email" type="email" required autoComplete="email" /></label>
          <label className="wide-field"><span>Phone <small>Optional</small></span><PhoneInput name="phone" /></label>
          <label className="wide-field"><span>Company <small>Optional</small></span><input name="company" autoComplete="organization" /></label>
        </div>
        <label className="wide-field">
          <span>I’m interested in</span>
          <select name="interest" defaultValue={INTERESTS[0]}>{INTERESTS.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <div className="wide-field">
          <span>Properties</span>
          <div className={`property-multiselect${menuOpen ? " is-open" : ""}`} id="contact-property-picker">
            <button className="property-multiselect-toggle" id="contact-property-toggle" type="button" aria-expanded={menuOpen} aria-controls="contact-property-menu" onClick={() => setMenuOpen((open) => !open)}>
              <span id="contact-property-summary">{selected.length ? `${selected.length} ${selected.length === 1 ? "property" : "properties"} selected — choose more` : "Choose properties"}</span>
              <span aria-hidden="true">⌄</span>
            </button>
            <div className="property-multiselect-menu" id="contact-property-menu" hidden={!menuOpen}>
              <label className="property-search">
                <span className="sr-only">Search properties</span>
                <input id="contact-property-search" type="search" placeholder="Search by property or city" autoComplete="off" value={propertyQuery} onChange={(event) => setPropertyQuery(event.target.value)} autoFocus={menuOpen} />
              </label>
              <div className="property-option-list" id="contact-property-options" role="group" aria-label="Properties">
                {options.length ? options.map((item) => (
                  <label className="property-option" key={item.id}>
                    <input type="checkbox" value={item.id} checked={selectedIds.has(item.id)} onChange={(event) => { toggleProperty(item.id, event.target.checked); setMenuOpen(false); }} />
                    <span><strong>{item.name}</strong><small>{item.city}, ON</small></span>
                  </label>
                )) : <p className="property-empty">No properties match that search.</p>}
              </div>
            </div>
            <div className="property-selection-chips" id="contact-property-chips" aria-live="polite">
              {selected.map((item) => (
                <button key={item.id} type="button" aria-label={`Remove ${item.name}`} onClick={() => toggleProperty(item.id, false)}>
                  <span>{item.name}</span><b aria-hidden="true">×</b>
                </button>
              ))}
            </div>
          </div>
          <small className="field-help" id="contact-property-help">Choose one or more properties, or leave this blank for a general inquiry.</small>
        </div>
        <label className="wide-field"><span>Message *</span><textarea name="message" rows={7} required placeholder="Tell us about the space, timing, location, or investment goal." /></label>

        <CallbackPicker selected={availability} onChange={setAvailability} mode="auto" hasPhone={hasPhone} />

        <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <button className="primary-button" type="submit">Review email to Deerfield</button>
        <p className="form-status" id="form-status" aria-live="polite">{formStatus}</p>
      </form>

      <dialog className="email-review-dialog" id="email-review-dialog" ref={reviewDialog} aria-labelledby="email-review-title" onClick={(event) => { if (event.target === reviewDialog.current) closeReview(); }}>
        <div className="email-review-card">
          <header>
            <div><p className="eyebrow">Final review</p><h2 id="email-review-title">Review and edit your email.</h2></div>
            <button className="dialog-close" id="email-review-close" type="button" aria-label="Close email review" onClick={closeReview}>×</button>
          </header>
          <p className="review-intro">This is the exact message that will be delivered through the Resend API when you press send.</p>
          <dl className="review-envelope" id="email-review-envelope">
            <div><dt>To</dt><dd id="review-to">{delivery.recipient}</dd></div>
            <div><dt>From</dt><dd id="review-from">{delivery.from || "Deerfield Deal Desk"}</dd></div>
            <div><dt>Reply-To</dt><dd id="review-reply-to">{pending?.email || "—"}</dd></div>
            <div><dt>Subject</dt><dd id="review-subject-final">{subject.trim() ? enforceSubject(subject) : "—"}</dd></div>
          </dl>
          <label className="wide-field"><span>Subject</span><input id="email-review-subject" maxLength={SUBJECT_MAX_LENGTH} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="wide-field"><span>Email message</span><textarea id="email-review-body" rows={17} maxLength={BODY_MAX_LENGTH} value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <div className="email-review-actions">
            <button className="secondary-button" id="email-review-back" type="button" onClick={closeReview}>Back to form</button>
            <SendButton id="email-send-button" state={sendState} onClick={send} />
          </div>
          <p className="form-status" id="email-send-status" aria-live="polite">{sendStatus}</p>
        </div>
      </dialog>

      <SentConfirmation open={sentOpen} onClose={() => setSentOpen(false)} />
    </>
  );
}
