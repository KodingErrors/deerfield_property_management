// ==UserScript==
// @name         Twitch VOD Spoiler Guard
// @namespace    https://example.local/twitch-vod-spoiler-guard
// @version      1.0.0
// @description  Adds a random, per-VOD amount of fake playtime to the displayed VOD length so you can't tell how close the end is.
// @match        https://www.twitch.tv/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // ---- Settings -----------------------------------------------------------
  const MIN_EXTRA_MINUTES = 20;   // smallest amount of fake time added
  const MAX_EXTRA_MINUTES = 120;  // largest amount of fake time added
  const HIDE_PROGRESS_FILL = false; // true = also hide the seekbar's played-portion fill
  // -------------------------------------------------------------------------

  const DURATION_SEL = '[data-a-target="player-seekbar-duration"]';
  const PROGRESS_SEL = '[data-a-target="player-seekbar-progress"], .seekbar-bar, .seekbar-segment__bar';

  const vodId = () => (location.pathname.match(/^\/videos\/(\d+)/) || [])[1] || null;

  // The offset is picked once per VOD and remembered, so reloading or
  // revisiting the same VOD always shows the same fake length.
  function offsetSeconds(id) {
    const key = "offset:" + id;
    let stored = GM_getValue(key, null);
    if (typeof stored !== "number") {
      const minutes = MIN_EXTRA_MINUTES + Math.random() * (MAX_EXTRA_MINUTES - MIN_EXTRA_MINUTES);
      stored = Math.round(minutes * 60);
      GM_setValue(key, stored);
    }
    return stored;
  }

  function format(totalSeconds) {
    const s = Math.floor(totalSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }

  function apply() {
    const id = vodId();
    if (!id) return;

    const label = document.querySelector(DURATION_SEL);
    const video = document.querySelector("video");
    // Real length comes from the <video> element, never from the label we
    // rewrite, so the offset can't compound.
    if (!label || !video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const fake = format(video.duration + offsetSeconds(id));
    if (label.textContent !== fake) label.textContent = fake;
  }

  if (HIDE_PROGRESS_FILL) {
    const style = document.createElement("style");
    style.textContent = `${PROGRESS_SEL} { opacity: 0 !important; }`;
    (document.head || document.documentElement).appendChild(style);
  }

  // Twitch is a SPA and React rewrites the label, so react to DOM changes
  // (runs before paint, so the real length never flashes). apply() only
  // writes when the text differs, which keeps this from looping.
  const start = () => {
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    apply();
  };

  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  // Video metadata can load without any DOM mutation; catch that too.
  document.addEventListener("loadedmetadata", apply, true);
  document.addEventListener("durationchange", apply, true);
})();
