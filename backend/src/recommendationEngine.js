// Simple rule-based recommendation engine for hackathon use.
// In a real deployment, these rules should be validated by agronomists.

const BASE_RECOMMENDATIONS = [
  {
    crop: "tomato",
    disease: "early_blight",
    label: "Tomato Early Blight",
    severity: "mild",
    pesticide: "Mancozeb 75% WP",
    dosePerLitreMl: 2.5,
    intervalDays: 10,
    sprays: 2
  },
  {
    crop: "tomato",
    disease: "early_blight",
    label: "Tomato Early Blight",
    severity: "severe",
    pesticide: "Chlorothalonil 75% WP",
    dosePerLitreMl: 2.0,
    intervalDays: 7,
    sprays: 3
  },
  {
    crop: "rice",
    disease: "blast",
    label: "Rice Blast",
    severity: "mild",
    pesticide: "Tricyclazole 75% WP",
    dosePerLitreMl: 1.0,
    intervalDays: 10,
    sprays: 2
  },
  {
    crop: "unknown",
    disease: "unknown",
    label: "Unknown Issue",
    severity: "mild",
    pesticide: "Broad-spectrum Fungicide/Consult Expert",
    dosePerLitreMl: 1.5,
    intervalDays: 14,
    sprays: 1
  }
];

export function buildRecommendation({
  crop,
  disease,
  severity,
  weather,
  soil,
  history
}) {
  const base =
    BASE_RECOMMENDATIONS.find(
      (r) =>
        r.crop === crop &&
        r.disease === disease &&
        (r.severity === severity || r.severity === "mild")
    ) ||
    BASE_RECOMMENDATIONS[0];

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
    if (last.disease === disease && last.pesticide === base.pesticide) {
      resistanceWarning =
        "You recently used the same molecule for this disease. If possible, rotate with a different molecule to reduce resistance risk.";
    }
  }

  const explanationParts = [];
  explanationParts.push(
    `Detected disease: ${base.label} on ${crop}. Severity: ${severity || "mild"}.`
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
    crop,
    disease: base.disease,
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

