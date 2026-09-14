import { seedFeatures } from "./seed-traits.js";
import { seedDetails } from "./seed-details.js";

export const SOURCE_CHECKED_AT = "2026-09-14";
export const PORTFOLIO_URL = "./properties/";

const blankFeatures = Object.freeze({
  parking: null,
  truckLevelLoading: null,
  driveInDoors: null,
  officeComponent: null,
  outdoorStorage: null,
  streetFrontage: null,
  visibility: null,
  groundFloor: null,
  signage: null,
  transitAccess: null,
  elevator: null,
  privateEntrance: null,
});

function property(id, name, city, type, available, units = [], options = {}) {
  return Object.freeze({
    id,
    name,
    city,
    province: "ON",
    type,
    available,
    units: units.map(([label, size]) => ({ label, size, available: true })),
    // Explicit per-record values win over the generated seed data.
    features: Object.freeze({ ...blankFeatures, ...seedFeatures(id, type), ...(options.features || {}) }),
    // Presentational specifics only; the matcher never reads these.
    details: Object.freeze({ ...seedDetails(id, type, available, city), ...(options.details || {}) }),
    image: options.image || null,
    description: options.description || null,
    sourceUrl: "./property/?id=" + encodeURIComponent(id),
    sourceCheckedAt: SOURCE_CHECKED_AT,
  });
}

export const properties = Object.freeze([
  property("office-91", "100 James Street South", "Hamilton", "office", true, [
    ["02", 625],
    ["03", 1500],
    ["4", 2000],
    ["5", 1500],
    ["07", 2469],
  ], { image: "assets/office-91.webp" }),
  property("office-90", "123 James Street North", "Hamilton", "office", true, [], { image: "assets/office-90.webp" }),
  property("office-93", "135 Rebecca Street", "Hamilton", "office", true, [
    ["03", 4205],
  ], { image: "assets/office-93.webp" }),
  property("office-rebecca-182", "182 Rebecca Street", "Hamilton", "office", false, [], { image: "assets/office-rebecca-182.webp" }),
  property("industrial-south-service-240", "240 South Service Road", "Stoney Creek", "industrial", false, [], { image: "assets/industrial-south-service-240.webp" }),
  property("retail-gwb-picton-30", "30 GWB Picton", "Picton", "retail", false, [], { image: "assets/retail-gwb-picton-30.webp" }),
  property("industrial-88", "4151 Mainway", "Burlington", "industrial", true, [
    ["West", 14028],
  ], {
    image: "assets/industrial-88.webp",
    description: "Industrial property at 4151 Mainway, Burlington.",
  }),
  property("industrial-87", "589 Barton Street", "Stoney Creek", "industrial", true, [
    ["100A", 4504],
  ], { image: "assets/industrial-87.webp" }),
  property("retail-acton-market", "Acton Market Place", "Acton", "retail", false, [], { image: "assets/retail-acton-market.jpg" }),
  property("retail-65", "Applewood Village Plaza", "Mississauga", "retail", true, [
    ["37", 1025],
  ], { image: "assets/retail-65.jpg" }),
  property("retail-barrys-bay", "Barry's Bay", "Barry's Bay", "retail", false, [], { image: "assets/retail-barrys-bay.jpg" }),
  property("retail-belle-river", "Belle River", "Belle River", "retail", false, [], { image: "assets/retail-belle-river.jpg" }),
  property("industrial-brock-rich", "Brock-Rich", "Hamilton", "industrial", false, [], { image: "assets/industrial-brock-rich.webp" }),
  property("office-89", "Burlington Office Centre", "Burlington", "office", true, [
    ["202", 250],
    ["207", 150],
    ["217, 219–222", 1250],
    ["302", 250],
  ], {
    features: { parking: true },
    image: "assets/office-89.webp",
    description: "Private move-in-ready office suites on gross lease. Utilities, parking and building services are listed as included.",
  }),
  property("retail-canada-trust", "Canada Trust Square", "Hamilton", "retail", false, [], { image: "assets/retail-canada-trust.webp" }),
  property("retail-80", "Centre Point Plaza", "Hamilton", "retail", true, [["8, 9", 2822]], { image: "assets/retail-80.webp" }),
  property("retail-fourth-avenue", "Fourth Avenue", "St. Catharines", "retail", false, [], { image: "assets/retail-fourth-avenue.webp" }),
  property("industrial-glendale", "Glendale Industrial Mall", "Niagara-on-the-Lake", "industrial", false, [], { image: "assets/industrial-glendale.webp" }),
  property("retail-heritage-commons", "Heritage Commons", "Stoney Creek", "retail", false, [], { image: "assets/retail-heritage-commons.webp" }),
  property("retail-heritage-highlands", "Heritage Highlands", "Stoney Creek", "retail", false, [], { image: "assets/retail-heritage-highlands.webp" }),
  property("retail-newcastle", "Newcastle", "Newcastle", "retail", false, [], { image: "assets/retail-newcastle.webp" }),
  property("retail-notl", "Niagara-on-the-Lake", "Niagara-on-the-Lake", "retail", false, [], { image: "assets/retail-notl.webp" }),
  property("retail-78", "Oastler Park Shopping Plaza", "Parry Sound", "retail", true, [], { image: "assets/retail-78.webp" }),
  property("retail-ott-drive", "Ott Drive", "Huntsville", "retail", false, [], { image: "assets/retail-ott-drive.webp" }),
  property("retail-picton-plaza", "Picton Shopping Plaza", "Picton", "retail", false, [], { image: "assets/retail-picton-plaza.webp" }),
  property("industrial-ridley", "Ridley Industrial Mall", "St. Catharines", "industrial", false, [], { image: "assets/industrial-ridley.webp" }),
  property("retail-82", "Spartan Square", "Stoney Creek", "retail", true, [], { image: "assets/retail-82.webp" }),
  property("retail-stone-church", "Stone Church", "Hamilton", "retail", false, [], { image: "assets/retail-stone-church.webp" }),
  property("retail-virgil", "Virgil Holdings", "Niagara-on-the-Lake", "retail", false, [], { image: "assets/retail-virgil.webp" }),
]);

export const cities = Object.freeze([...new Set(properties.map((item) => item.city))].sort());

export const featureSets = Object.freeze({
  industrial: [
    ["truckLevelLoading", "Truck-level loading"],
    ["driveInDoors", "Drive-in doors"],
    ["officeComponent", "Office component"],
    ["parking", "Parking"],
    ["outdoorStorage", "Outdoor storage"],
  ],
  retail: [
    ["streetFrontage", "Street frontage"],
    ["visibility", "Visibility"],
    ["parking", "Parking"],
    ["groundFloor", "Ground floor"],
    ["signage", "Signage opportunity"],
  ],
  office: [
    ["parking", "Parking"],
    ["groundFloor", "Ground-floor access"],
    ["privateEntrance", "Private entrance"],
    ["transitAccess", "Transit access"],
    ["elevator", "Elevator"],
  ],
  unsure: [
    ["parking", "Parking"],
    ["transitAccess", "Transit access"],
    ["groundFloor", "Ground-floor access"],
  ],
});
