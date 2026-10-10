// ==UserScript==
// @name         Video Spoiler Guard (Twitch + YouTube)
// @namespace    https://example.local/video-spoiler-guard
// @version      2.0.0
// @description  Adds a random, per-video amount of fake time to the displayed length on Twitch VODs and YouTube videos so you can't tell how close the end is. Toggle each site from the Tampermonkey menu.
// @match        https://www.twitch.tv/*
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // ---- Settings -----------------------------------------------------------
  const MIN_EXTRA_MINUTES = 20;   // smallest amount of fake time added
  const MAX_EXTRA_MINUTES = 120;  // largest amount of fake time added
  const HIDE_PROGRESS_FILL = false; // true = also hide the seekbar's played-portion fill (Twitch only)
  // -------------------------------------------------------------------------

  const SITES = {
    twitch: {
      name: "Twitch",
      host: /(^|\.)twitch\.tv$/,
      label: '[data-a-target="player-seekbar-duration"]',
      videoId: () => (location.pathname.match(/^\/videos\/(\d+)/) || [])[1] || null,
      // Skip nothing extra: VODs have no inserted ads in the player element.
      blocked: () => false,
    },
    youtube: {
      name: "YouTube",
      host: /(^|\.)youtube\.com$/,
      label: ".ytp-time-duration",
      videoId: () => (location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null),
      // While an ad plays, <video> holds the ad's length, not the video's.
      blocked: () => !!document.querySelector(".html5-video-player.ad-showing"),
    },
  };

  const siteKey = Object.keys(SITES).find((k) => SITES[k].host.test(location.hostname));
  if (!siteKey) return;
  const site = SITES[siteKey];

  // ---- On/off state, shared by both sites through script storage ----------
  const isOn = (key) => GM_getValue("enabled:" + key, true) !== false;
  const setOn = (key, value) => GM_setValue("enabled:" + key, value);

  let menuIds = [];
  function buildMenu() {
    if (typeof GM_unregisterMenuCommand === "function") {
      menuIds.forEach((id) => GM_unregisterMenuCommand(id));
    }
    menuIds = [];
    const add = (title, fn) => menuIds.push(GM_registerMenuCommand(title, fn));
    const tag = (on) => (on ? "ON" : "OFF");

    Object.keys(SITES).forEach((key) => {
      add(`${SITES[key].name}: ${tag(isOn(key))} (click to turn ${isOn(key) ? "off" : "on"})`, () => {
        setOn(key, !isOn(key));
        refresh();
      });
    });

    const allOn = Object.keys(SITES).every(isOn);
    add(allOn ? "Turn BOTH off" : "Turn BOTH on", () => {
      Object.keys(SITES).forEach((key) => setOn(key, !allOn));
      refresh();
    });
  }

  function refresh() {
    buildMenu();
    apply();
  }

  // ---- Fake length --------------------------------------------------------
  // The offset is picked once per video and remembered, so revisiting the same
  // video always shows the same fake length.
  function offsetSeconds(id) {
    const key = `offset:${siteKey}:${id}`;
    let stored = GM_getValue(key, null);
    // Twitch offsets saved by version 1 used a bare id key.
    if (typeof stored !== "number" && siteKey === "twitch") stored = GM_getValue("offset:" + id, null);
    if (typeof stored !== "number") {
      const minutes = MIN_EXTRA_MINUTES + Math.random() * (MAX_EXTRA_MINUTES - MIN_EXTRA_MINUTES);
      stored = Math.round(minutes * 60);
    }
    GM_setValue(key, stored);
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
    const label = document.querySelector(site.label);
    if (!label) return;

    const video = document.querySelector("video");
    const real = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;

    if (!isOn(siteKey)) {
      // Put the real length back once after switching off.
      if (label.dataset.vsgFaked && real && !site.blocked()) {
        label.textContent = format(real);
        delete label.dataset.vsgFaked;
      }
      return;
    }

    const id = site.videoId();
    // Real length comes from the <video> element, never from the label we
    // rewrite, so the offset can't compound.
    if (!id || !real || site.blocked()) return;

    const fake = format(real + offsetSeconds(id));
    if (label.textContent !== fake) label.textContent = fake;
    label.dataset.vsgFaked = "1";
  }

  if (HIDE_PROGRESS_FILL && siteKey === "twitch") {
    const style = document.createElement("style");
    style.textContent =
      '[data-a-target="player-seekbar-progress"], .seekbar-bar, .seekbar-segment__bar { opacity: 0 !important; }';
    (document.head || document.documentElement).appendChild(style);
  }

  // Both sites are SPAs and rewrite the label, so react to DOM changes (runs
  // before paint, so the real length never flashes). apply() only writes when
  // the text differs, which keeps this from looping.
  const start = () => {
    new MutationObserver(apply).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    apply();
  };

  buildMenu();
  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  // Video metadata can load without any DOM mutation; catch that too.
  document.addEventListener("loadedmetadata", apply, true);
  document.addEventListener("durationchange", apply, true);
})();
