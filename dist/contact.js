import { properties } from "./data.js";
import "./site-shell.js";

const form = document.querySelector("#inquiry-form");
const propertySelect = document.querySelector("#contact-property");
const status = document.querySelector("#form-status");
const selectedId = new URLSearchParams(location.search).get("property");

propertySelect.insertAdjacentHTML("beforeend", properties.map((item) => `<option value="${item.id}">${item.name} — ${item.city}</option>`).join(""));
if (properties.some((item) => item.id === selectedId)) propertySelect.value = selectedId;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const property = properties.find((item) => item.id === values.property);
  const subject = `Deerfield inquiry — ${property?.name || values.interest}`;
  const body = [
    "DEERFIELD DEAL DESK INQUIRY",
    "",
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Phone: ${values.phone || "Not provided"}`,
    `Company: ${values.company || "Not provided"}`,
    `Interest: ${values.interest}`,
    `Property: ${property ? `${property.name}, ${property.city}, ON` : "No specific property"}`,
    "",
    "MESSAGE",
    values.message,
  ].join("\n");
  status.textContent = "Your email application is opening with the completed inquiry. Review it before sending.";
  location.href = `mailto:info@deerfieldbrokerage.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
