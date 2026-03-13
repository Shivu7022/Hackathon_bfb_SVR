// Rule-based recommendation engine for Smart Leaf Doctor
// Covers all ResNet disease classes trained on PlantVillage dataset

const BASE_RECOMMENDATIONS = [
  // ─── Pepper ─────────────────────────────────────────────────────────────────
  {
    crop: "pepper", disease: "bacterial_spot",
    label: "Pepper Bacterial Spot",
    severity: "mild",
    pesticide: "Copper Hydroxide 77% WP",
    dosePerLitreMl: 2.0, intervalDays: 10, sprays: 3
  },
  {
    crop: "pepper", disease: "bacterial_spot",
    label: "Pepper Bacterial Spot",
    severity: "severe",
    pesticide: "Streptomycin Sulphate 90% + Tetracycline 10%",
    dosePerLitreMl: 0.6, intervalDays: 7, sprays: 3
  },
  {
    crop: "pepper", disease: "healthy",
    label: "Pepper Healthy",
    severity: "mild",
    pesticide: "No treatment needed — plant appears healthy",
    dosePerLitreMl: 0, intervalDays: 0, sprays: 0
  },

  // ─── Potato ─────────────────────────────────────────────────────────────────
  {
    crop: "potato", disease: "early_blight",
    label: "Potato Early Blight",
    severity: "mild",
    pesticide: "Mancozeb 75% WP",
    dosePerLitreMl: 2.5, intervalDays: 10, sprays: 2
  },
  {
    crop: "potato", disease: "early_blight",
    label: "Potato Early Blight",
    severity: "severe",
    pesticide: "Chlorothalonil 75% WP",
    dosePerLitreMl: 2.0, intervalDays: 7, sprays: 3
  },
  {
    crop: "potato", disease: "late_blight",
    label: "Potato Late Blight",
    severity: "mild",
    pesticide: "Metalaxyl + Mancozeb 72% WP",
    dosePerLitreMl: 2.5, intervalDays: 7, sprays: 3
  },
  {
    crop: "potato", disease: "late_blight",
    label: "Potato Late Blight",
    severity: "severe",
    pesticide: "Dimethomorph 50% WP",
    dosePerLitreMl: 1.0, intervalDays: 5, sprays: 4
  },
  {
    crop: "potato", disease: "healthy",
    label: "Potato Healthy",
    severity: "mild",
    pesticide: "No treatment needed — plant appears healthy",
    dosePerLitreMl: 0, intervalDays: 0, sprays: 0
  },

  // ─── Tomato ─────────────────────────────────────────────────────────────────
  {
    crop: "tomato", disease: "early_blight",
    label: "Tomato Early Blight",
    severity: "mild",
    pesticide: "Mancozeb 75% WP",
    dosePerLitreMl: 2.5, intervalDays: 10, sprays: 2
  },
  {
    crop: "tomato", disease: "early_blight",
    label: "Tomato Early Blight",
    severity: "severe",
    pesticide: "Chlorothalonil 75% WP",
    dosePerLitreMl: 2.0, intervalDays: 7, sprays: 3
  },
  {
    crop: "tomato", disease: "late_blight",
    label: "Tomato Late Blight",
    severity: "mild",
    pesticide: "Metalaxyl + Mancozeb 72% WP",
    dosePerLitreMl: 2.5, intervalDays: 7, sprays: 3
  },
  {
    crop: "tomato", disease: "late_blight",
    label: "Tomato Late Blight",
    severity: "severe",
    pesticide: "Dimethomorph 50% WP",
    dosePerLitreMl: 1.0, intervalDays: 5, sprays: 4
  },
  {
    crop: "tomato", disease: "leaf_mold",
    label: "Tomato Leaf Mold",
    severity: "mild",
    pesticide: "Copper Oxychloride 50% WP",
    dosePerLitreMl: 2.5, intervalDays: 10, sprays: 2
  },
  {
    crop: "tomato", disease: "septoria_leaf_spot",
    label: "Tomato Septoria Leaf Spot",
    severity: "mild",
    pesticide: "Mancozeb 75% WP",
    dosePerLitreMl: 2.5, intervalDays: 10, sprays: 2
  },
  {
    crop: "tomato", disease: "spider_mites",
    label: "Tomato Spider Mites (Two-Spotted)",
    severity: "mild",
    pesticide: "Abamectin 1.9% EC",
    dosePerLitreMl: 0.5, intervalDays: 7, sprays: 2
  },
  {
    crop: "tomato", disease: "target_spot",
    label: "Tomato Target Spot",
    severity: "mild",
    pesticide: "Azoxystrobin 23% SC",
    dosePerLitreMl: 1.0, intervalDays: 10, sprays: 2
  },
  {
    crop: "tomato", disease: "yellow_leaf_curl_virus",
    label: "Tomato Yellow Leaf Curl Virus",
    severity: "severe",
    pesticide: "Imidacloprid 17.8% SL (for whitefly vector control)",
    dosePerLitreMl: 0.5, intervalDays: 14, sprays: 2
  },
  {
    crop: "tomato", disease: "mosaic_virus",
    label: "Tomato Mosaic Virus",
    severity: "moderate",
    pesticide: "No cure — remove infected plants. Spray Imidacloprid to control aphid vectors.",
    dosePerLitreMl: 0.5, intervalDays: 14, sprays: 2
  },
  {
    crop: "tomato", disease: "healthy",
    label: "Tomato Healthy",
    severity: "mild",
    pesticide: "No treatment needed — plant appears healthy",
    dosePerLitreMl: 0, intervalDays: 0, sprays: 0
  },

  // ─── Rice ────────────────────────────────────────────────────────────────────
  {
    crop: "rice", disease: "blast",
    label: "Rice Blast",
    severity: "mild",
    pesticide: "Tricyclazole 75% WP",
    dosePerLitreMl: 1.0, intervalDays: 10, sprays: 2
  },

  // ─── Fallback ────────────────────────────────────────────────────────────────
  {
    crop: "unknown", disease: "unknown",
    label: "Unknown Leaf Issue",
    severity: "mild",
    pesticide: "Consult an agronomist. Apply broad-spectrum Mancozeb 75% WP as a precaution.",
    dosePerLitreMl: 2.0, intervalDays: 14, sprays: 1
  }
];

/**
 * Normalize a ResNet class name (e.g. "Tomato_Early_blight") to a
 * { crop, disease } pair for lookup in BASE_RECOMMENDATIONS.
 */
export function normalizeDisease(rawDiseaseKey) {
  const key = (rawDiseaseKey || "").toLowerCase().trim();

  // Build a normalisation map from ResNet folder names → { crop, disease }
  const map = {
    // Pepper
    "pepper__bell___bacterial_spot":  { crop: "pepper",  disease: "bacterial_spot" },
    "pepper__bell___healthy":          { crop: "pepper",  disease: "healthy" },
    // Potato
    "potato___early_blight":           { crop: "potato",  disease: "early_blight" },
    "potato___late_blight":            { crop: "potato",  disease: "late_blight" },
    "potato___healthy":                { crop: "potato",  disease: "healthy" },
    // Tomato
    "tomato_early_blight":             { crop: "tomato",  disease: "early_blight" },
    "tomato_late_blight":              { crop: "tomato",  disease: "late_blight" },
    "tomato_leaf_mold":                { crop: "tomato",  disease: "leaf_mold" },
    "tomato_septoria_leaf_spot":       { crop: "tomato",  disease: "septoria_leaf_spot" },
    "tomato_spider_mites_two-spotted_spider_mite": { crop: "tomato", disease: "spider_mites" },
    "tomato_spider_mites_ two-spotted_spider_mite": { crop: "tomato", disease: "spider_mites" },
    "tomato__target_spot":             { crop: "tomato",  disease: "target_spot" },
    "tomato__tomato_yellowleafcurl_virus": { crop: "tomato", disease: "yellow_leaf_curl_virus" },
    "tomato__tomato_mosaic_virus":     { crop: "tomato",  disease: "mosaic_virus" },
    "tomato_healthy":                  { crop: "tomato",  disease: "healthy" },
    // Rice
    "rice_blast":                      { crop: "rice",    disease: "blast" },
  };

  // Exact match first
  if (map[key]) return map[key];

  // Fuzzy fallbacks via substring matching
  if (key.includes("pepper")) {
    if (key.includes("bacterial") || key.includes("spot")) return { crop: "pepper", disease: "bacterial_spot" };
    return { crop: "pepper", disease: "healthy" };
  }
  if (key.includes("potato")) {
    if (key.includes("early")) return { crop: "potato", disease: "early_blight" };
    if (key.includes("late"))  return { crop: "potato", disease: "late_blight" };
    return { crop: "potato", disease: "healthy" };
  }
  if (key.includes("tomato")) {
    if (key.includes("early"))   return { crop: "tomato", disease: "early_blight" };
    if (key.includes("late"))    return { crop: "tomato", disease: "late_blight" };
    if (key.includes("mold"))    return { crop: "tomato", disease: "leaf_mold" };
    if (key.includes("septoria")) return { crop: "tomato", disease: "septoria_leaf_spot" };
    if (key.includes("spider") || key.includes("mite")) return { crop: "tomato", disease: "spider_mites" };
    if (key.includes("target"))  return { crop: "tomato", disease: "target_spot" };
    if (key.includes("yellow") || key.includes("curl")) return { crop: "tomato", disease: "yellow_leaf_curl_virus" };
    if (key.includes("mosaic"))  return { crop: "tomato", disease: "mosaic_virus" };
    if (key.includes("healthy")) return { crop: "tomato", disease: "healthy" };
  }

  return { crop: "unknown", disease: "unknown" };
}


export function buildRecommendation({
  crop,
  disease,
  severity,
  weather,
  soil,
  history
}) {
  // Normalise the raw ResNet disease key before lookup
  const normalised = normalizeDisease(disease);
  const lookupCrop    = normalised.crop    !== "unknown" ? normalised.crop    : (crop || "unknown");
  const lookupDisease = normalised.disease !== "unknown" ? normalised.disease : (disease || "unknown");

  const base =
    BASE_RECOMMENDATIONS.find(
      (r) =>
        r.crop === lookupCrop &&
        r.disease === lookupDisease &&
        (r.severity === severity || r.severity === "mild")
    ) ||
    BASE_RECOMMENDATIONS.find(
      (r) => r.disease === "unknown"
    );

  let intervalDays = base.intervalDays;
  let sprays = base.sprays;

  if (weather && typeof weather.humidity === "number" && weather.humidity > 80) {
    intervalDays = Math.max(5, intervalDays - 3);
  }

  if (weather && weather.rainExpected) {
    intervalDays = Math.max(5, intervalDays - 2);
  }

  const soilMessages = [];
  if (soil) {
    if (soil.nitrogenLevel === "low") {
      soilMessages.push(
        "Nitrogen appears low. Consider applying a nitrogen-rich fertilizer (e.g., urea) as per local recommendation."
      );
    }
    if (typeof soil.ph === "number") {
      if (soil.ph < 5.5) {
        soilMessages.push(
          "Soil pH is acidic. Over time, consider liming to raise pH towards neutral for better nutrient availability."
        );
      } else if (soil.ph > 7.5) {
        soilMessages.push(
          "Soil pH is alkaline. Avoid overuse of alkaline amendments and focus on organic matter to improve structure."
        );
      }
    }
  }

  let resistanceWarning = null;
  if (history && history.length > 0) {
    const last = history[history.length - 1];
    if (last.disease === lookupDisease && last.pesticide === base.pesticide) {
      resistanceWarning =
        "You recently used the same molecule for this disease. If possible, rotate with a different molecule to reduce resistance risk.";
    }
  }

  const explanationParts = [];
  explanationParts.push(
    `Detected disease: ${base.label} on ${lookupCrop}. Severity: ${severity || "mild"}.`
  );
  if (weather) {
    explanationParts.push(
      `Weather at your location: temperature ~${weather.temperature}°C, humidity ~${weather.humidity}%.`
    );
    if (weather.rainExpected) {
      explanationParts.push(
        "Rain is expected soon. Try to spray in a dry window and avoid spraying just before heavy rainfall."
      );
    }
  }
  if (soilMessages.length) {
    explanationParts.push(...soilMessages);
  }
  if (resistanceWarning) {
    explanationParts.push(resistanceWarning);
  }

  const explanation = explanationParts.join(" ");

  return {
    crop: lookupCrop,
    disease: lookupDisease,
    diseaseLabel: base.label,
    severity: severity || base.severity,
    pesticide: base.pesticide,
    dosePerLitreMl: base.dosePerLitreMl,
    intervalDays,
    sprays,
    precautions: [
      "Always wear gloves, mask, and long-sleeved clothing when spraying.",
      "Avoid spraying during strong wind or midday sun.",
      "Do not allow children or animals into the field during spraying.",
      "Respect pre-harvest intervals mentioned on the pesticide label."
    ],
    explanation
  };
}
