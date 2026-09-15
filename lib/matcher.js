const TYPE_LABELS = {
  industrial: "Industrial",
  retail: "Retail",
  office: "Office",
  unsure: "Any property type",
};

function evaluation(key, label, outcome, reason, extra = {}) {
  return { key, label, outcome, reason, ...extra };
}

function bestSize(property, ideal) {
  if (!property.units.length) return null;
  if (!ideal) return property.units[0];
  return property.units.reduce((best, unit) =>
    Math.abs(unit.size - ideal) < Math.abs(best.size - ideal) ? unit : best
  );
}

function evaluateHardConstraints(search, property) {
  const failures = [];
  const unknowns = [];
  const matches = [];

  if (property.available === false) {
    failures.push(evaluation(
      "availability",
      "Availability",
      "miss",
      "No units are currently listed as available."
    ));
  } else if (property.available == null) {
    unknowns.push(evaluation(
      "availability",
      "Availability",
      "unknown",
      "Current availability is not confirmed."
    ));
  } else {
    matches.push(evaluation(
      "availability",
      "Availability",
      "match",
      "At least one unit is currently listed for lease."
    ));
  }

  if (search.type && search.type !== "unsure") {
    if (property.type === search.type) {
      matches.push(evaluation(
        "type",
        "Property type",
        "match",
        TYPE_LABELS[property.type] + " matches your required property type."
      ));
    } else {
      failures.push(evaluation(
        "type",
        "Property type",
        "miss",
        TYPE_LABELS[property.type] + " does not meet your " + TYPE_LABELS[search.type].toLowerCase() + " requirement."
      ));
    }
  }

  if (search.locationMode === "hard" && search.cities.length) {
    if (search.cities.includes(property.city)) {
      matches.push(evaluation(
        "location",
        "Location",
        "match",
        property.city + " is one of your required locations."
      ));
    } else {
      failures.push(evaluation(
        "location",
        "Location",
        "miss",
        property.city + " is outside your required locations."
      ));
    }
  }

  const hasHardSize = search.sizeMin != null || search.sizeMax != null;
  if (hasHardSize && property.available !== false) {
    if (!property.units.length) {
      unknowns.push(evaluation(
        "size",
        "Available size",
        "unknown",
        "An available unit is listed, but its square footage is not confirmed."
      ));
    } else {
      const matchingUnits = property.units.filter((unit) => {
        const aboveMinimum = search.sizeMin == null || unit.size >= search.sizeMin;
        const belowMaximum = search.sizeMax == null || unit.size <= search.sizeMax;
        return aboveMinimum && belowMaximum;
      });
      if (matchingUnits.length) {
        const unit = matchingUnits[0];
        matches.push(evaluation(
          "size",
          "Available size",
          "match",
          "Unit " + unit.label + " is listed at " + formatNumber(unit.size) + " SF, within your required range.",
          { unitId: unit.label }
        ));
      } else {
        const sizes = property.units.map((unit) => unit.size);
        const largest = Math.max(...sizes);
        const smallest = Math.min(...sizes);
        let reason = "Confirmed available units range from " + formatNumber(smallest) + " to " + formatNumber(largest) + " SF, outside your required range.";
        if (search.sizeMin != null && largest < search.sizeMin) {
          reason = "The largest confirmed available unit is " + formatNumber(largest) + " SF, below your " + formatNumber(search.sizeMin) + " SF minimum.";
        } else if (search.sizeMax != null && smallest > search.sizeMax) {
          reason = "The smallest confirmed available unit is " + formatNumber(smallest) + " SF, above your " + formatNumber(search.sizeMax) + " SF maximum.";
        }
        failures.push(evaluation("size", "Available size", "miss", reason));
      }
    }
  }

  return { failures, unknowns, matches };
}

function evaluatePreferences(search, property) {
  const evaluations = [];

  if (search.locationMode === "preference" && search.cities.length) {
    const matched = search.cities.includes(property.city);
    evaluations.push(evaluation(
      "location",
      "Preferred location",
      matched ? "match" : "miss",
      matched
        ? property.city + " is one of your preferred locations."
        : property.city + " is outside your preferred locations.",
      { weight: 3, satisfaction: matched ? 1 : 0 }
    ));
  }

  if (search.sizeIdeal != null) {
    const unit = bestSize(property, search.sizeIdeal);
    if (!unit) {
      evaluations.push(evaluation(
        "sizeIdeal",
        "Ideal size",
        "unknown",
        "The available square footage is not confirmed.",
        { weight: 3, satisfaction: null }
      ));
    } else {
      const satisfaction = Math.max(
        0,
        1 - Math.abs(unit.size - search.sizeIdeal) / Math.max(search.sizeIdeal, 1)
      );
      const outcome = satisfaction >= 0.9 ? "match" : satisfaction > 0 ? "partial" : "miss";
      evaluations.push(evaluation(
        "sizeIdeal",
        "Ideal size",
        outcome,
        "Unit " + unit.label + " is " + formatNumber(unit.size) + " SF compared with your " + formatNumber(search.sizeIdeal) + " SF ideal.",
        { weight: 3, satisfaction, unitId: unit.label }
      ));
    }
  }

  for (const preference of search.features) {
    const value = property.features[preference.key];
    if (value == null) {
      evaluations.push(evaluation(
        preference.key,
        preference.label,
        "unknown",
        preference.label + " is not confirmed in the public listing.",
        { weight: preference.weight, satisfaction: null }
      ));
    } else {
      evaluations.push(evaluation(
        preference.key,
        preference.label,
        value ? "match" : "miss",
        value
          ? preference.label + " is confirmed in the public listing."
          : preference.label + " is confirmed as unavailable.",
        { weight: preference.weight, satisfaction: value ? 1 : 0 }
      ));
    }
  }

  return evaluations;
}

function normalizedScore(preferences) {
  const known = preferences.filter((item) => item.satisfaction != null);
  if (!known.length) return null;
  const earned = known.reduce((sum, item) => sum + item.weight * item.satisfaction, 0);
  const possible = known.reduce((sum, item) => sum + item.weight, 0);
  return Math.round((earned / possible) * 100);
}

export function matchProperty(search, property) {
  const hard = evaluateHardConstraints(search, property);
  if (hard.failures.length) {
    return {
      property,
      status: "excluded",
      score: null,
      hardFailures: hard.failures,
      hardUnknowns: hard.unknowns,
      hardMatches: hard.matches,
      preferences: [],
    };
  }

  const preferences = evaluatePreferences(search, property);
  return {
    property,
    status: hard.unknowns.length ? "verification_required" : "eligible",
    score: normalizedScore(preferences),
    hardFailures: [],
    hardUnknowns: hard.unknowns,
    hardMatches: hard.matches,
    preferences,
  };
}

export function matchProperties(search, properties) {
  const matches = properties.map((property) => matchProperty(search, property));
  const sortKnown = (a, b) => {
    if (a.score !== b.score) return (b.score ?? -1) - (a.score ?? -1);
    const aUnknown = a.preferences.filter((item) => item.outcome === "unknown").length;
    const bUnknown = b.preferences.filter((item) => item.outcome === "unknown").length;
    if (aUnknown !== bUnknown) return aUnknown - bUnknown;
    return a.property.name.localeCompare(b.property.name) || a.property.id.localeCompare(b.property.id);
  };
  const eligible = matches.filter((item) => item.status === "eligible").sort(sortKnown);
  const verificationRequired = matches
    .filter((item) => item.status === "verification_required")
    .sort(sortKnown);
  const excluded = matches.filter((item) => item.status === "excluded").sort((a, b) =>
    a.property.name.localeCompare(b.property.name)
  );
  return {
    eligible,
    verificationRequired,
    excluded,
    counts: {
      eligible: eligible.length,
      verification_required: verificationRequired.length,
      excluded: excluded.length,
    },
  };
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(value);
}
