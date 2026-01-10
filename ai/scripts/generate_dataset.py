import random
import csv

CATEGORIES = {
    "Sanitation": {
        "High": [
            "sewage overflow near houses causing health risk",
            "dead animal lying on road for two days",
            "open drainage spreading foul smell",
            "garbage not collected for a week attracting mosquitoes",
            "manhole overflow near school causing danger"
        ],
        "Medium": [
            "garbage collection irregular in our area",
            "bad smell from waste collection point",
            "open drain needs cleaning",
            "garbage bins are insufficient",
            "waste scattered after rain"
        ],
        "Low": [
            "dustbin lid broken",
            "garbage truck comes late",
            "public toilet needs cleaning",
            "minor smell near garbage area",
            "bin placement is inconvenient"
        ]
    },

    "Roads": {
        "High": [
            "large pothole causing accidents near bus stand",
            "road completely damaged and unsafe",
            "bridge surface broken posing danger",
            "road collapsed after heavy rain",
            "open pit on road without barricade"
        ],
        "Medium": [
            "uneven road causing slow traffic",
            "potholes forming on internal road",
            "speed breaker damaged",
            "road flooding during rain",
            "footpath partially broken"
        ],
        "Low": [
            "road markings faded",
            "small cracks on road surface",
            "dust on road",
            "minor gravel on roadside",
            "signboard needs repainting"
        ]
    },

    "Electricity": {
        "High": [
            "electric wire snapped causing danger",
            "transformer sparking near houses",
            "live wire exposed on street",
            "electric pole about to fall",
            "power outage affecting entire area"
        ],
        "Medium": [
            "street light not working",
            "frequent power cuts at night",
            "voltage fluctuation issue",
            "electric pole tilted slightly",
            "street lights blinking"
        ],
        "Low": [
            "street light dim",
            "street light covered by tree branches",
            "electric box needs maintenance",
            "minor power interruption",
            "old pole needs inspection"
        ]
    },

    "Water": {
        "High": [
            "water pipeline burst flooding road",
            "dirty water supply causing illness",
            "no water supply for three days",
            "contaminated water near school",
            "major leakage wasting water"
        ],
        "Medium": [
            "low water pressure in mornings",
            "water supply irregular",
            "pipeline leakage near street",
            "water tank overflow",
            "public tap not working"
        ],
        "Low": [
            "slow water flow",
            "minor leakage at tap",
            "water meter needs replacement",
            "tap handle broken",
            "water timing inconvenient"
        ]
    }
}

ROWS = []

for category, priorities in CATEGORIES.items():
    for priority, texts in priorities.items():
        for _ in range(150):  # controls dataset size
            text = random.choice(texts)
            ROWS.append([text, category, priority])

random.shuffle(ROWS)

with open("complaints.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "category", "priority"])
    writer.writerows(ROWS)

print("Dataset generated successfully!")
print("Total records:", len(ROWS))
