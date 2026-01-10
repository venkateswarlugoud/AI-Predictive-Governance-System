// server/services/categoryRules.js

export const refineCategory = (description, aiCategory) => {
  const text = description.toLowerCase();

  const has = (...words) => words.some(w => text.includes(w));

  // 🚧 Roads
  if (
    has(
      "pothole",
      "road",
      "gravel",
      "speed breaker",
      "divider",
      "flyover",
      "bridge",
      "culvert",
      "footpath",
      "road damage"
    )
  ) {
    return "Roads";
  }

  // ⚡ Electricity
  if (
    has(
      "electric",
      "wire",
      "pole",
      "transformer",
      "street light",
      "voltage",
      "power cut",
      "current",
      "spark"
    )
  ) {
    return "Electricity";
  }

  // 🚮 Sanitation
  if (
    has(
      "garbage",
      "waste",
      "wastage",
      "sewage",
      "drain",
      "manhole",
      "nala",
      "dead animal",
      "bad smell"
    )
  ) {
    return "Sanitation";
  }

  // 💧 Water
  if (
    has(
      "water",
      "pipeline",
      "leakage",
      "tap",
      "tank",
      "supply",
      "drinking water"
    )
  ) {
    return "Water";
  }

  // 🔁 fallback to AI if nothing matched
  return aiCategory;
};
