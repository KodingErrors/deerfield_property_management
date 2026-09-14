export const SOURCE_CHECKED_AT = "2026-09-14";
export const PORTFOLIO_URL = "https://deerfieldbrokerage.com/properties";

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
    features: Object.freeze({ ...blankFeatures, ...(options.features || {}) }),
    image: options.image || null,
    description: options.description || null,
    sourceUrl: options.sourceUrl || PORTFOLIO_URL,
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
  ], { sourceUrl: "https://deerfieldbrokerage.com/properties/office/91" }),
  property("office-90", "123 James Street North", "Hamilton", "office", true, [], {
    sourceUrl: "https://deerfieldbrokerage.com/properties/office/90",
  }),
  property("office-93", "135 Rebecca Street", "Hamilton", "office", true, [
    ["03", 4205],
  ], { sourceUrl: "https://deerfieldbrokerage.com/properties/office/93" }),
  property("office-rebecca-182", "182 Rebecca Street", "Hamilton", "office", false),
  property("industrial-south-service-240", "240 South Service Road", "Stoney Creek", "industrial", false),
  property("retail-gwb-picton-30", "30 GWB Picton", "Picton", "retail", false),
  property("industrial-88", "4151 Mainway", "Burlington", "industrial", true, [
    ["West", 14028],
  ], {
    image: "https://deerfieldbrokerage.com/property-media/DF_Mainway.jpg",
    description: "Industrial property at 4151 Mainway, Burlington.",
    sourceUrl: "https://deerfieldbrokerage.com/properties/industrial/88",
  }),
  property("industrial-87", "589 Barton Street", "Stoney Creek", "industrial", true, [
    ["100A", 4504],
  ], { sourceUrl: "https://deerfieldbrokerage.com/properties/industrial/87" }),
  property("retail-acton-market", "Acton Market Place", "Acton", "retail", false),
  property("retail-65", "Applewood Village Plaza", "Mississauga", "retail", true, [
    ["37", 1025],
  ], { sourceUrl: "https://deerfieldbrokerage.com/properties/retail/65" }),
  property("retail-barrys-bay", "Barry's Bay", "Barry's Bay", "retail", false),
  property("retail-belle-river", "Belle River", "Belle River", "retail", false),
  property("industrial-brock-rich", "Brock-Rich", "Hamilton", "industrial", false),
  property("office-89", "Burlington Office Centre", "Burlington", "office", true, [
    ["202", 250],
    ["207", 150],
    ["217, 219–222", 1250],
    ["302", 250],
  ], {
    features: { parking: true },
    description: "Private move-in-ready office suites on gross lease. Utilities, parking and building services are listed as included.",
    sourceUrl: "https://deerfieldbrokerage.com/properties/office/89",
  }),
  property("retail-canada-trust", "Canada Trust Square", "Hamilton", "retail", false),
  property("retail-80", "Centre Point Plaza", "Hamilton", "retail", true, [], {
    sourceUrl: "https://deerfieldbrokerage.com/properties/retail/80",
  }),
  property("retail-fourth-avenue", "Fourth Avenue", "St. Catharines", "retail", false),
  property("industrial-glendale", "Glendale Industrial Mall", "Niagara-on-the-Lake", "industrial", false),
  property("retail-heritage-commons", "Heritage Commons", "Stoney Creek", "retail", false),
  property("retail-heritage-highlands", "Heritage Highlands", "Stoney Creek", "retail", false),
  property("retail-newcastle", "Newcastle", "Newcastle", "retail", false),
  property("retail-notl", "Niagara-on-the-Lake", "Niagara-on-the-Lake", "retail", false),
  property("retail-78", "Oastler Park Shopping Plaza", "Parry Sound", "retail", true, [], {
    sourceUrl: "https://deerfieldbrokerage.com/properties/retail/78",
  }),
  property("retail-ott-drive", "Ott Drive", "Huntsville", "retail", false),
  property("retail-picton-plaza", "Picton Shopping Plaza", "Picton", "retail", false),
  property("industrial-ridley", "Ridley Industrial Mall", "St. Catharines", "industrial", false),
  property("retail-82", "Spartan Square", "Stoney Creek", "retail", true, [], {
    sourceUrl: "https://deerfieldbrokerage.com/properties/retail/82",
  }),
  property("retail-stone-church", "Stone Church", "Hamilton", "retail", false),
  property("retail-virgil", "Virgil Holdings", "Niagara-on-the-Lake", "retail", false),
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
