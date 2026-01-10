// server/services/priorityRules.js

export const refinePriority = (description, aiPriority) => {
  const text = description.toLowerCase();
  const has = (...words) => words.some(w => text.includes(w));

  /* ===============================
     🚨 FORCE HIGH (LIFE RISK)
  =============================== */
  if (
    has(
      "accident",
      "fatal",
      "death",
      "electrocution",
      "electric shock",
      "fire",
      "blast",
      "explosion",
      "collapsed",
      "fallen pole",
      "exposed wire",
      "live wire",
      "gas leak",
      "severe injury",
      "transformer blast"
    )
  ) {
    return "High";
  }

  /* ===============================
     ⚠️ HEALTH & SAFETY RISK
  =============================== */
  if (
    has(
      "sewage",
      "open drain",
      "garbage overflow",
      "dead animal",
      "mosquito",
      "rats",
      "dirty water",
      "contaminated"
    )
  ) {
    return aiPriority === "Low" ? "Medium" : aiPriority;
  }

  /* ===============================
     🚧 ROAD & INFRA
  =============================== */
  if (
    has(
      "pothole",
      "road damage",
      "footpath broken",
      "signal not working",
      "road flooded"
    )
  ) {
    return aiPriority === "Low" ? "Medium" : aiPriority;
  }

  /* ===============================
     ⚡ UTILITIES
  =============================== */
  if (
    has(
      "power cut",
      "street light not working",
      "voltage fluctuation"
    )
  ) {
    return aiPriority === "Low" ? "Medium" : aiPriority;
  }

  /* ===============================
     ⏱️ TIME ESCALATION
  =============================== */
  if (
    has(
      "for days",
      "for weeks",
      "still not fixed",
      "multiple complaints",
      "no action taken"
    )
  ) {
    return aiPriority === "Low" ? "Medium" : "High";
  }

  /* ===============================
     ✅ FORCE LOW
  =============================== */
  if (
    has(
      "dim light",
      "faded",
      "minor",
      "cosmetic",
      "slow",
      "low pressure",
      "blinking",
      "dust",
      "mud",
      "tree branches"
    )
  ) {
    return "Low";
  }

  return aiPriority;
};
