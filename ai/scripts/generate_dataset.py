import random
import csv

categories = {
    "Sanitation": {
        "high": [
            "Open sewage overflowing near {place} causing health risk",
            "Dead animal lying on road near {place}",
            "Garbage not collected for many days near {place}",
            "Manhole overflow near {place} spreading foul smell",
            "Sewage water entering houses near {place}"
        ],
        "medium": [
            "Garbage collection irregular near {place}",
            "Bad smell from waste bins near {place}",
            "Mosquito breeding due to stagnant water near {place}",
            "Overflowing dustbin near {place}",
            "Public toilet dirty near {place}"
        ],
        "low": [
            "Minor garbage scattered near {place}",
            "Dustbin lid broken near {place}",
            "Occasional bad smell near {place}",
            "Waste collection delayed by one day near {place}",
            "Dry leaves accumulated near {place}"
        ]
    },

    "Roads": {
        "high": [
            "Large pothole causing accidents near {place}",
            "Road collapsed near {place} causing danger",
            "Bridge damaged near {place}",
            "Road flooded near {place} blocking traffic",
            "Deep pit on road near {place}"
        ],
        "medium": [
            "Uneven road slowing traffic near {place}",
            "Broken footpath near {place}",
            "Loose gravel on road near {place}",
            "Speed breaker damaged near {place}",
            "Road surface cracks near {place}"
        ],
        "low": [
            "Faded road markings near {place}",
            "Minor road patch damage near {place}",
            "Small crack on road near {place}",
            "Dust on roadside near {place}",
            "Road sign slightly bent near {place}"
        ]
    },

    "Electricity": {
        "high": [
            "Live electric wire exposed near {place}",
            "Electric pole fallen near {place}",
            "Transformer blast reported near {place}",
            "Electric sparks during rain near {place}",
            "High voltage fluctuation damaging appliances near {place}"
        ],
        "medium": [
            "Street lights not working near {place}",
            "Frequent power cuts near {place}",
            "Low voltage issue near {place}",
            "Electric pole tilted near {place}",
            "Street light blinking near {place}"
        ],
        "low": [
            "Street light dim near {place}",
            "Electric box rusted near {place}",
            "Old electric pole near {place}",
            "Wires tangled near pole near {place}",
            "Street light covered by tree branches near {place}"
        ]
    },

    "Water": {
        "high": [
            "Water pipeline burst near {place}",
            "Dirty drinking water supplied near {place}",
            "No water supply for several days near {place}",
            "Water contamination causing illness near {place}",
            "Major leakage flooding road near {place}"
        ],
        "medium": [
            "Low water pressure near {place}",
            "Water supply irregular near {place}",
            "Water leakage near {place}",
            "Public tap not working near {place}",
            "Water overflow from tank near {place}"
        ],
        "low": [
            "Slow water flow near {place}",
            "Minor leakage from tap near {place}",
            "Water meter damaged near {place}",
            "Water pressure fluctuates slightly near {place}",
            "Water timing delay near {place}"
        ]
    }
}

places = [
    "Ward 1", "Ward 2", "Ward 3", "Main Road", "Bus Stand",
    "Near School", "Near Hospital", "Market Area",
    "Sector 5", "Sector 7", "Residential Colony"
]

rows = []

TARGET_PER_CATEGORY = 1000  # 4 categories → 3000 rows

for category, priority_groups in categories.items():
    for priority, templates in priority_groups.items():
        for _ in range(TARGET_PER_CATEGORY // 3):
            template = random.choice(templates)
            place = random.choice(places)
            text = template.format(place=place)
            rows.append([text, category, priority.capitalize()])

random.shuffle(rows)

with open("data/complaints.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "category", "priority"])
    writer.writerows(rows)

print(f"Dataset generated with {len(rows)} rows")
