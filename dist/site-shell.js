const THEME_KEY = "deerfield-theme";
const root = document.documentElement;
const themeButton = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const menuButton = document.querySelector("#menu-toggle");
const menuClose = document.querySelector("#menu-close");
const mobileNavigation = document.querySelector("#mobile-navigation");
const mobileNavigationBackdrop = document.querySelector("#mobile-navigation-backdrop");
const servicesNavigation = document.querySelector(".services-navigation");

function syncThemeControl() {
  if (!themeButton || !themeIcon) return;
  const dark = root.dataset.theme === "dark";
  themeButton.setAttribute("aria-label", dark ? "Use light mode" : "Use dark mode");
  themeButton.title = dark ? "Use light mode" : "Use dark mode";
  themeIcon.textContent = dark ? "☀" : "◐";
  if (themeMeta) themeMeta.content = dark ? "#101410" : "#fbfcfa";
}

function setMenu(open) {
  if (!mobileNavigation || !mobileNavigationBackdrop || !menuButton) return;
  mobileNavigation.hidden = !open;
  mobileNavigationBackdrop.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (open) menuClose?.focus();
  else menuButton.focus();
}

themeButton?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  syncThemeControl();
});

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  if (localStorage.getItem(THEME_KEY)) return;
  root.dataset.theme = event.matches ? "dark" : "light";
  syncThemeControl();
});

menuButton?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));
mobileNavigationBackdrop?.addEventListener("click", () => setMenu(false));
mobileNavigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileNavigation && !mobileNavigation.hidden) setMenu(false);
});
document.addEventListener("click", (event) => {
  if (servicesNavigation?.open && !servicesNavigation.contains(event.target)) servicesNavigation.removeAttribute("open");
});

syncThemeControl();
