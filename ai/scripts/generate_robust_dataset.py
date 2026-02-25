"""
Production-grade synthetic dataset: exactly 10,000 civic complaints.
Generates ai/data/complaints_robust.csv (complaint_text, category, priority).
Overwrites existing file. Balanced categories and noise. Indian citizen style.
"""

import os
import random
import re
from typing import List, Dict, Tuple, Optional

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(DATA_DIR, "complaints_robust.csv")

CATEGORIES = ["Sanitation", "Roads", "Electricity", "Water"]
PRIORITIES = ["Low", "Medium", "High"]
ROWS_PER_CATEGORY = 2500
TOTAL_ROWS = 10000

BUCKETS = {
    "clean": 1000,
    "grammar": 625,
    "spelling": 250,
    "emotional": 250,
    "short": 250,
    "multi_issue": 125,
}
INDIRECT_MIN_RATIO = 0.25
PRIORITY_MAX_RATIO = 0.50


def set_seed(seed: int = 42) -> None:
    random.seed(seed)


# ---------------------------------------------------------------------------
# Duration phrases (varied, non-robotic)
# ---------------------------------------------------------------------------
DURATION_PHRASES = [
    "since 3 days", "from 5 days", "since Monday", "almost a week",
    "more than 10 days", "past 6 days", "2-3 days", "last few days",
    "from many days", "since last week", "from 4 days", "past 2 days",
    "from yesterday", "since morning", "from 2 days", "past one week",
    "more than 5 days", "from 7 days", "since Tuesday", "last 4 days",
    "from 6 days", "almost 2 weeks", "past 3 days", "road damaged from last week",
]

LOCATIONS = [
    "near bus stop", "near temple", "near market", "in our colony",
    "near school", "near hospital", "main street", "ward 5", "ward 12",
    "near panchayat office", "Srinagar Colony", "Dilsukhnagar", "Kukatpally",
    "Ameerpet", "Madhapur", "Banjara Hills", "Secunderabad", "Vijayawada area",
    "Guntur road", "near church", "near mosque", "colony entrance", "lane number 3",
]

OPENINGS = [
    "We are facing", "There is", "Kindly look into", "I want to report",
    "Our area has", "Residents are facing", "Please attend", "Sir we have",
    "In our locality", "Request you to", "Complaint regarding", "Need urgent action",
    "Nobody is attending", "Repeated complaint", "Again reporting", "Kindly do the needful",
]

# Direct vs indirect phrasing (indirect = no direct keyword)
SANITATION_DIRECT = [
    "garbage not cleared", "waste piled up", "sewage overflow", "drainage overflowing",
    "open drain blocked", "garbage not collected", "waste not removed", "sewage leaking",
    "drain choked", "garbage dump", "waste accumulation", "sewage pipe burst",
]
SANITATION_INDIRECT = [
    "Bad smell near house", "Too much smell from 4 days", "Waste piled up near temple",
    "Overflowing drain water", "Foul smell affecting residents", "Stagnant water near colony",
    "Unbearable smell", "Dirty water from drain", "Mosquito breeding due to stagnation",
    "Smell from nullah", "Unhygienic condition", "Cleaning not done",
]

ROADS_DIRECT = [
    "road damaged", "potholes on road", "road full of cracks", "road broken",
    "road condition bad", "pothole near", "road flooded", "road dug", "road blocked",
]
ROADS_INDIRECT = [
    "Big potholes near bus stop", "Vehicles skidding due to surface condition",
    "Main street fully damaged", "Cannot drive properly", "Bike skid due to pit",
    "Car got stuck", "Surface condition very bad", "Street damaged", "Path broken",
]

ELECTRICITY_DIRECT = [
    "power cut", "no electricity", "current gone", "power not there",
    "electricity problem", "voltage fluctuation", "transformer fault", "line cut",
]
ELECTRICITY_INDIRECT = [
    "Current going and coming continuously", "Power cut daily at night",
    "Voltage very low from 3 days", "Lights not working", "Fan not running",
    "Supply very irregular", "Tripping every hour", "No current in morning",
    "Wire fallen", "Spark from pole", "Streetlight not working",
]

WATER_DIRECT = [
    "no water supply", "water not coming", "water supply stopped", "low pressure",
    "water leakage", "pipeline burst", "no water", "water problem",
]
WATER_INDIRECT = [
    "No supply in taps", "Dry taps since morning", "Not getting drinking supply",
    "Taps dry", "Supply only in night", "Pressure very low", "Pipe burst",
    "Borewell not working", "Hand pump dry",
]

DIRECT_KEYWORDS = {
    "Sanitation": ["garbage", "waste", "sewage", "drain", "drainage"],
    "Roads": ["road", "pothole", "street"],
    "Electricity": ["electricity", "power", "current", "voltage", "transformer"],
    "Water": ["water", "supply", "pipeline", "tap"],
}


def _is_direct_phrase(text: str, category: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in DIRECT_KEYWORDS[category])


def _pick_duration() -> str:
    return random.choice(DURATION_PHRASES)


def _pick_location() -> str:
    return random.choice(LOCATIONS)


def _pick_opening() -> str:
    return random.choice(OPENINGS)


# ---------------------------------------------------------------------------
# Priority (context-aware)
# ---------------------------------------------------------------------------
def _assign_priority(category: str, text: str) -> str:
    t = text.lower()
    if any(x in t for x in [
        "live wire", "spark", "electrocution", "transformer burst", "explosion",
        "collapse", "accident", "injured", "danger", "children sick", "hospital",
        "dengue", "contamination", "sewage entering", "flooding entering",
        "more than 10 days", "more than 5 days", "almost 2 weeks", "past 6 days",
        "past one week", "from 7 days", "from 5 days", "since 5 days",
        "very dangerous", "life risk",
    ]):
        return "High"
    if any(x in t for x in [
        "from 3 days", "from 4 days", "since 3 days", "2-3 days", "last few days",
        "from many days", "since last week", "almost a week", "past 2 days",
        "past 3 days", "repeated", "daily", "moderate", "traffic", "smell affecting",
    ]):
        return "Medium"
    if any(x in t for x in ["from yesterday", "since morning", "small", "minor", "slight", "flicker", "occasional"]):
        return "Low"
    return random.choice(["Medium", "Low"]) if random.random() < 0.6 else "Medium"


# ---------------------------------------------------------------------------
# Grammar bucket (Indian English – mandatory patterns)
# ---------------------------------------------------------------------------
def _wrong_tense(text: str) -> str:
    for a, b in [
        ("has not been", "not"), ("have not been", "not"),
        ("water has not come", "water not coming"), ("water is not coming", "water not coming"),
        ("garbage has not been cleared", "garbage not cleared"),
        ("road has been damaged", "road damaged"), ("road is damaged", "road damaged"),
    ]:
        if a in text.lower():
            return text.replace(a, b).replace(a.capitalize(), b)
    return text


def _missing_auxiliary(text: str) -> str:
    for phrase in ["is not working", "are not working", "has not been", "have not been", "is not coming"]:
        text = re.sub(re.escape(phrase), "not", text, flags=re.I, count=1)
    return text


def _word_order_issue(text: str) -> str:
    try:
        first = text.split(".")[0].strip()
        for sep in (" from ", " since "):
            if sep in first.lower():
                idx = first.lower().index(sep)
                before, after = first[:idx].strip(), first[idx:].strip()
                words = after.split()
                dur = " ".join(words[:3]) if len(words) >= 3 else after
                rest = " ".join(words[3:]) if len(words) > 3 else ""
                new_first = (dur + " " + before + " " + rest).strip()
                rest_of = ". ".join(text.split(".")[1:]).strip()
                return new_first + (". " + rest_of if rest_of else ".")
    except (IndexError, AttributeError, ValueError):
        pass
    return text


def _singular_plural(text: str) -> str:
    if "roads are" in text.lower():
        return text.replace("roads are", "roads is").replace("Roads are", "Roads is")
    if "road is" in text.lower() and "damaged" in text.lower():
        return text.replace("road is", "roads is").replace("Road is", "Roads is")
    if "garbage is" in text.lower():
        return text.replace("garbage is", "garbage are").replace("Garbage is", "Garbage are")
    return text


def _overuse_only(text: str) -> str:
    parts = text.split(".")
    if parts:
        parts[0] = parts[0].strip() + " only"
        return ". ".join(parts)
    return text.strip() + " only"


def _broken_polite(text: str) -> str:
    pre = random.choice([
        "Respected sir kindly ", "I am requesting you to do the needful ",
        "Kindly do the needful ", "Sir please ",
    ])
    return pre + text.lower().replace("please", "").replace("kindly", "").strip() + " urgently"


def _apply_grammar_noise(text: str) -> str:
    funcs = [_wrong_tense, _missing_auxiliary, _word_order_issue, _singular_plural]
    if random.random() < 0.4:
        funcs.append(_overuse_only)
    if random.random() < 0.3:
        funcs.append(_broken_polite)
    for f in random.sample(funcs, k=min(len(funcs), random.randint(2, 4))):
        text = f(text)
    return text


def _spelling_errors(text: str) -> str:
    chars = list(text)
    n = max(1, len(chars) // 45)
    letters = "abcdefghijklmnopqrstuvwxyz"
    for _ in range(n):
        i = random.randint(0, len(chars) - 1) if len(chars) > 1 else 0
        if i >= len(chars) or chars[i].isspace() or chars[i].isdigit():
            continue
        op = random.choice(["replace", "swap", "delete"])
        if op == "replace":
            chars[i] = random.choice(letters)
        elif op == "swap" and i < len(chars) - 1 and not chars[i + 1].isspace():
            chars[i], chars[i + 1] = chars[i + 1], chars[i]
        elif op == "delete" and len(chars) > 4:
            chars.pop(i)
    return "".join(chars)


EMOTIONAL_SUFFIX = [
    " This is very frustrating. No one is listening.",
    " We have complained so many times. When will this be fixed?",
    " Very angry with the situation. Request immediate action.",
    " Fed up with this. Please do something.",
    " Unbearable situation. Kindly act fast.",
]


def _add_emotional(text: str) -> str:
    return text.rstrip(". ") + random.choice(EMOTIONAL_SUFFIX)


def _make_short(text: str) -> str:
    s = text.split(".")[0].strip()
    if len(s.split()) > 10:
        s = " ".join(s.split()[:random.randint(5, 10)])
    return s + "."


SECOND_ISSUES = {
    "Sanitation": ["water not coming", "road damaged", "power cut", "drainage overflowing"],
    "Roads": ["waste not cleared", "water logging", "pole bent"],
    "Electricity": ["voltage fluctuation", "power cut", "wire hanging"],
    "Water": ["drainage overflowing", "pipeline burst", "no supply"],
}


def _add_multi_issue(text: str, category: str) -> str:
    other_cat = random.choice([c for c in CATEGORIES if c != category])
    second = random.choice(SECOND_ISSUES.get(other_cat, ["issue in same area"]))
    return text.rstrip(". ") + random.choice([" and ", ". Also "]) + second + "."


# ---------------------------------------------------------------------------
# Build one complaint (direct or indirect)
# ---------------------------------------------------------------------------
BANKS = {
    "Sanitation": (SANITATION_DIRECT, SANITATION_INDIRECT),
    "Roads": (ROADS_DIRECT, ROADS_INDIRECT),
    "Electricity": (ELECTRICITY_DIRECT, ELECTRICITY_INDIRECT),
    "Water": (WATER_DIRECT, WATER_INDIRECT),
}


def _build_complaint(category: str, force_indirect: Optional[bool] = None) -> str:
    direct_bank, indirect_bank = BANKS[category]
    use_indirect = force_indirect if force_indirect is not None else (random.random() < 0.28)
    core = random.choice(indirect_bank) if use_indirect else random.choice(direct_bank)
    loc = _pick_location()
    dur = _pick_duration() if random.random() < 0.7 else ""
    opening = _pick_opening()
    if dur:
        body = f"{core} {dur} {loc}. Please look into this."
    else:
        body = f"{core} {loc}. Please look into this."
    return f"{opening} {body}"


def _generate_category_rows(category: str) -> Tuple[List[Dict[str, str]], List[str]]:
    rows: List[Dict[str, str]] = []
    bucket_tags: List[str] = []
    used: set = set()
    n_clean, n_grammar, n_spelling, n_emotional, n_short, n_multi = (
        BUCKETS["clean"], BUCKETS["grammar"], BUCKETS["spelling"],
        BUCKETS["emotional"], BUCKETS["short"], BUCKETS["multi_issue"],
    )

    def add(text: str, pri: str, tag: str) -> bool:
        key = (text.strip().lower()[:120], pri)
        if key in used:
            return False
        used.add(key)
        rows.append({"complaint_text": text, "category": category, "priority": pri})
        bucket_tags.append(tag)
        return True

    # Clean
    while len(rows) < n_clean:
        text = _build_complaint(category)
        add(text, _assign_priority(category, text), "clean")

    # Grammar
    while len(rows) < n_clean + n_grammar:
        text = _build_complaint(category)
        text = _apply_grammar_noise(text)
        add(text, _assign_priority(category, text), "grammar")

    # Spelling
    while len(rows) < n_clean + n_grammar + n_spelling:
        text = _build_complaint(category)
        text = _spelling_errors(text)
        add(text, _assign_priority(category, text), "spelling")

    # Emotional
    while len(rows) < n_clean + n_grammar + n_spelling + n_emotional:
        text = _build_complaint(category)
        text = _add_emotional(text)
        add(text, _assign_priority(category, text), "emotional")

    # Short
    while len(rows) < n_clean + n_grammar + n_spelling + n_emotional + n_short:
        text = _build_complaint(category)
        text = _make_short(text)
        add(text, _assign_priority(category, text), "short")

    # Multi-issue
    while len(rows) < ROWS_PER_CATEGORY:
        text = _build_complaint(category)
        text = _add_multi_issue(text, category)
        add(text, _assign_priority(category, text), "multi_issue")

    return rows, bucket_tags


def _ensure_indirect_ratio(rows: List[Dict], bucket_tags: List[str], category: str) -> List[Dict]:
    """Ensure at least INDIRECT_MIN_RATIO of rows (by complaint_text) are indirect. Regenerate clean rows if needed."""
    need_indirect = int(ROWS_PER_CATEGORY * INDIRECT_MIN_RATIO)
    direct_count = sum(1 for r, tag in zip(rows, bucket_tags) if tag == "clean" and _is_direct_phrase(r["complaint_text"], category))
    indirect_clean = sum(1 for r, tag in zip(rows, bucket_tags) if tag == "clean" and not _is_direct_phrase(r["complaint_text"], category))
    if indirect_clean >= need_indirect:
        return rows
    # Replace some clean direct rows with indirect
    out = list(rows)
    tags_out = list(bucket_tags)
    replaced = 0
    for i in range(len(out)):
        if replaced >= (need_indirect - indirect_clean):
            break
        if tags_out[i] != "clean":
            continue
        if _is_direct_phrase(out[i]["complaint_text"], category):
            new_text = _build_complaint(category, force_indirect=True)
            out[i] = {"complaint_text": new_text, "category": category, "priority": _assign_priority(category, new_text)}
            replaced += 1
    return out


def _rebalance_priority(rows: List[Dict]) -> List[Dict]:
    pri_counts = pd.Series([r["priority"] for r in rows]).value_counts()
    if (pri_counts / len(rows)).max() <= PRIORITY_MAX_RATIO:
        return rows
    # Lower the dominant priority by swapping some to others
    dominant = pri_counts.index[0]
    n_dominant = pri_counts.iloc[0]
    target_max = int(len(rows) * PRIORITY_MAX_RATIO)
    to_swap = n_dominant - target_max
    if to_swap <= 0:
        return rows
    other_pri = [p for p in PRIORITIES if p != dominant]
    indices = [i for i, r in enumerate(rows) if r["priority"] == dominant]
    swap_idx = random.sample(indices, min(to_swap, len(indices)))
    for i in swap_idx:
        rows[i]["priority"] = random.choice(other_pri)
    return rows


def generate_dataset() -> None:
    set_seed(42)
    all_rows: List[Dict[str, str]] = []
    all_bucket_tags: List[str] = []
    category_buckets: Dict[str, Dict[str, int]] = {c: {} for c in CATEGORIES}

    for cat in CATEGORIES:
        rows, tags = _generate_category_rows(cat)
        rows = _ensure_indirect_ratio(rows, tags, cat)
        rows = _rebalance_priority(rows)
        for r, t in zip(rows, tags):
            category_buckets[cat][t] = category_buckets[cat].get(t, 0) + 1
        all_rows.extend(rows)
        all_bucket_tags.extend(tags)

    # Duplicate prevention: regenerate until unique
    seen_text: set = set()
    dup_count = 0
    for i in range(len(all_rows)):
        r = all_rows[i]
        text = r["complaint_text"].strip().lower()
        if text in seen_text:
            dup_count += 1
            cat = r["category"]
            tag = all_bucket_tags[i]
            for _ in range(100):
                if tag == "clean":
                    new_text = _build_complaint(cat)
                elif tag == "grammar":
                    new_text = _apply_grammar_noise(_build_complaint(cat))
                elif tag == "spelling":
                    new_text = _spelling_errors(_build_complaint(cat))
                elif tag == "emotional":
                    new_text = _add_emotional(_build_complaint(cat))
                elif tag == "short":
                    new_text = _make_short(_build_complaint(cat))
                else:
                    new_text = _add_multi_issue(_build_complaint(cat), cat)
                key_new = new_text.strip().lower()
                if key_new not in seen_text:
                    all_rows[i] = {"complaint_text": new_text, "category": cat, "priority": _assign_priority(cat, new_text)}
                    seen_text.add(key_new)
                    break
            else:
                all_rows[i] = {"complaint_text": new_text, "category": cat, "priority": _assign_priority(cat, new_text)}
                seen_text.add(new_text.strip().lower())
        else:
            seen_text.add(text)

    # Global priority sanity: no single priority > 50%
    all_rows = _rebalance_priority(all_rows)

    random.shuffle(all_rows)
    df = pd.DataFrame(all_rows)[["complaint_text", "category", "priority"]]

    # Assert category counts
    cat_counts = df["category"].value_counts()
    for c in CATEGORIES:
        if cat_counts.get(c, 0) != ROWS_PER_CATEGORY:
            raise AssertionError(
                f"Category {c} has {cat_counts.get(c, 0)} rows; required exactly {ROWS_PER_CATEGORY}."
            )

    if len(df) != TOTAL_ROWS:
        raise AssertionError(f"Total rows {len(df)} != {TOTAL_ROWS}.")

    # Overwrite file
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

    # Indirect ratio per category (approximate from first 2500 each)
    indirect_ratios = {}
    for c in CATEGORIES:
        sub = df[df["category"] == c]["complaint_text"]
        indirect = sum(1 for _, text in sub.items() if not _is_direct_phrase(str(text), c))
        indirect_ratios[c] = indirect / len(sub) if len(sub) else 0

    # Report
    print("Total rows:", len(df))
    print("Category distribution:")
    print(df["category"].value_counts().sort_index())
    print("Noise bucket distribution (per category):")
    for c in CATEGORIES:
        print(f"  {c}: {category_buckets[c]}")
    print("Priority distribution:")
    print(df["priority"].value_counts().sort_index())
    print("Indirect ratio per category:")
    for c in CATEGORIES:
        print(f"  {c}: {indirect_ratios[c]:.2%}")
    print("Duplicate count (regenerated):", dup_count)
    print("\nFile saved successfully: ai/data/complaints_robust.csv")


if __name__ == "__main__":
    generate_dataset()
