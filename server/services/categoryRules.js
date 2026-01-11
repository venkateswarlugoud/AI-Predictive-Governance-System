// server/services/categoryRules.js
// Permanent, policy-driven category resolution for municipal governance

export const refineCategory = (description, aiCategory) => {
  const text = description.toLowerCase();

  // --------------------------------------------------
  // Keyword dictionaries by department
  // --------------------------------------------------

  const CATEGORY_KEYWORDS = {
    Sanitation: [
      "garbage",
      "waste",
      "trash",
      "dustbin",
      "sewage",
      "drain",
      "drainage",
      "nala",
      "manhole",
      "overflow",
      "bad smell",
      "foul smell",
      "dead animal",
      "unclean",
    ],

    Electricity: [
      "electric",
      "electricity",
      "street light",
      "streetlight",
      "power",
      "power cut",
      "current",
      "voltage",
      "wire",
      "pole",
      "transformer",
      "spark",
      "blackout",
    ],

    Water: [
      "water",
      "pipeline",
      "leakage",
      "leak",
      "tap",
      "tank",
      "supply",
      "drinking water",
      "no water",
      "water logging",
    ],

    Roads: [
      "pothole",
      "road",
      "street",
      "gravel",
      "speed breaker",
      "divider",
      "flyover",
      "bridge",
      "culvert",
      "footpath",
      "asphalt",
      "traffic",
      "road damage",
    ],
  };

  // --------------------------------------------------
  // Score calculation (evidence-based)
  // --------------------------------------------------

  const scores = {
    Sanitation: 0,
    Electricity: 0,
    Water: 0,
    Roads: 0,
  };

  for (const category in CATEGORY_KEYWORDS) {
    CATEGORY_KEYWORDS[category].forEach((keyword) => {
      if (text.includes(keyword)) {
        scores[category]++;
      }
    });
  }

  // --------------------------------------------------
  // Governance dominance order (policy decision)
  // --------------------------------------------------
  // Sanitation > Electricity > Water > Roads

  const DOMINANCE_ORDER = [
    "Sanitation",
    "Electricity",
    "Water",
    "Roads",
  ];

  const MIN_KEYWORD_MATCH = 1; // minimum evidence threshold

  for (const category of DOMINANCE_ORDER) {
    if (scores[category] >= MIN_KEYWORD_MATCH) {
      return category;
    }
  }

  // --------------------------------------------------
  // Fallback to AI (only when text is truly ambiguous)
  // --------------------------------------------------
  return aiCategory;
};
