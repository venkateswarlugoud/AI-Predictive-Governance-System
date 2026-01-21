import random
import csv
import sys
import os

# Add scripts directory to path to import text_normalizer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from text_normalizer import normalize_text, add_noise_variant

categories = {
    "Sanitation": {
        "high": [
            ("Open sewage overflow", "Sewage overflowing near {place} causing health risk and foul smell"),
            ("Dead animal on road", "Dead animal lying on road near {place} needs immediate removal"),
            ("Garbage not collected", "Garbage not collected for many days near {place} causing health hazard"),
            ("Manhole overflow", "Manhole overflow near {place} spreading foul smell and health risk"),
            ("Sewage entering houses", "Sewage water entering houses near {place} causing property damage")
        ],
        "medium": [
            ("Irregular garbage collection", "Garbage collection irregular near {place} causing inconvenience"),
            ("Bad smell from bins", "Bad smell from waste bins near {place} affecting residents"),
            ("Mosquito breeding", "Mosquito breeding due to stagnant water near {place}"),
            ("Overflowing dustbin", "Overflowing dustbin near {place} needs attention"),
            ("Dirty public toilet", "Public toilet dirty near {place} requires cleaning")
        ],
        "low": [
            ("Minor garbage scattered", "Minor garbage scattered near {place} needs cleanup"),
            ("Broken dustbin lid", "Dustbin lid broken near {place} needs repair"),
            ("Occasional bad smell", "Occasional bad smell near {place} from waste"),
            ("Waste collection delayed", "Waste collection delayed by one day near {place}"),
            ("Dry leaves accumulated", "Dry leaves accumulated near {place} need removal")
        ]
    },

    "Roads": {
        "high": [
            ("Large pothole causing accidents", "Large pothole causing accidents near {place} needs urgent repair"),
            ("Road collapsed", "Road collapsed near {place} causing danger to vehicles"),
            ("Bridge damaged", "Bridge damaged near {place} requires immediate attention"),
            ("Road flooded blocking traffic", "Road flooded near {place} blocking traffic completely"),
            ("Deep pit on road", "Deep pit on road near {place} causing vehicle damage")
        ],
        "medium": [
            ("Uneven road", "Uneven road slowing traffic near {place} needs leveling"),
            ("Broken footpath", "Broken footpath near {place} causing pedestrian inconvenience"),
            ("Loose gravel on road", "Loose gravel on road near {place} causing skidding"),
            ("Damaged speed breaker", "Speed breaker damaged near {place} needs repair"),
            ("Road surface cracks", "Road surface cracks near {place} need patching")
        ],
        "low": [
            ("Faded road markings", "Faded road markings near {place} need repainting"),
            ("Minor road patch damage", "Minor road patch damage near {place} needs attention"),
            ("Small crack on road", "Small crack on road near {place} needs repair"),
            ("Dust on roadside", "Dust on roadside near {place} needs cleaning"),
            ("Bent road sign", "Road sign slightly bent near {place} needs straightening")
        ]
    },

    "Electricity": {
        "high": [
            ("Live wire exposed", "Live electric wire exposed near {place} causing extreme danger"),
            ("Electric pole fallen", "Electric pole fallen near {place} causing power outage and risk"),
            ("Transformer blast", "Transformer blast reported near {place} causing power failure"),
            ("Electric sparks during rain", "Electric sparks during rain near {place} causing fire risk"),
            ("High voltage fluctuation", "High voltage fluctuation damaging appliances near {place}")
        ],
        "medium": [
            ("Street lights not working", "Street lights not working near {place} causing safety concern"),
            ("Frequent power cuts", "Frequent power cuts near {place} affecting daily life"),
            ("Low voltage issue", "Low voltage issue near {place} affecting electrical appliances"),
            ("Electric pole tilted", "Electric pole tilted near {place} needs correction"),
            ("Street light blinking", "Street light blinking near {place} needs repair")
        ],
        "low": [
            ("Street light dim", "Street light dim near {place} needs bulb replacement"),
            ("Electric box rusted", "Electric box rusted near {place} needs maintenance"),
            ("Old electric pole", "Old electric pole near {place} needs replacement"),
            ("Wires tangled", "Wires tangled near pole near {place} need organization"),
            ("Street light covered", "Street light covered by tree branches near {place}")
        ]
    },

    "Water": {
        "high": [
            ("Water pipeline burst", "Water pipeline burst near {place} flooding the area"),
            ("Dirty drinking water", "Dirty drinking water supplied near {place} causing health risk"),
            ("No water supply", "No water supply for several days near {place} causing hardship"),
            ("Water contamination", "Water contamination causing illness near {place}"),
            ("Major leakage flooding", "Major leakage flooding road near {place} blocking traffic")
        ],
        "medium": [
            ("Low water pressure", "Low water pressure near {place} affecting daily use"),
            ("Irregular water supply", "Water supply irregular near {place} causing inconvenience"),
            ("Water leakage", "Water leakage near {place} wasting water"),
            ("Public tap not working", "Public tap not working near {place} needs repair"),
            ("Water overflow from tank", "Water overflow from tank near {place} wasting water")
        ],
        "low": [
            ("Slow water flow", "Slow water flow near {place} needs pressure check"),
            ("Minor tap leakage", "Minor leakage from tap near {place} needs fixing"),
            ("Water meter damaged", "Water meter damaged near {place} needs replacement"),
            ("Water pressure fluctuates", "Water pressure fluctuates slightly near {place}"),
            ("Water timing delay", "Water timing delay near {place} causing minor inconvenience")
        ]
    }
}

# Negative contrast samples - keywords that could confuse categories
negative_samples = [
    # "light" keyword confusion: Electricity vs Water
    ("Street light not working", "Street light not working near {place} - this is about electricity not water supply", "Electricity"),
    ("Water light issue", "Water supply issue with light pressure near {place} - this is about water not electricity", "Water"),
    
    # "road" keyword confusion: Roads vs Electricity
    ("Road lighting problem", "Road lighting problem near {place} - this is about electricity infrastructure not road surface", "Electricity"),
    ("Electric pole blocking road", "Electric pole blocking road near {place} - this is about electricity infrastructure not road repair", "Electricity"),
    
    # "water" keyword confusion: Water vs Sanitation
    ("Water overflow from drain", "Water overflow from drain near {place} - this is about sanitation drainage not water supply", "Sanitation"),
    ("Stagnant water breeding", "Stagnant water breeding mosquitoes near {place} - this is about sanitation not water supply", "Sanitation"),
    
    # "pipe" keyword confusion: Water vs Sanitation
    ("Sewage pipe burst", "Sewage pipe burst near {place} - this is about sanitation not water supply", "Sanitation"),
    ("Water pipe repair", "Water pipe repair needed near {place} - this is about water supply not sanitation", "Water"),
    
    # "pole" keyword confusion: Electricity vs Roads
    ("Electric pole damaged", "Electric pole damaged near {place} - this is about electricity not road infrastructure", "Electricity"),
    ("Traffic pole bent", "Traffic pole bent near {place} - this is about road infrastructure not electricity", "Roads"),
    
    # "supply" keyword confusion: Water vs Electricity
    ("Water supply issue", "Water supply issue near {place} - this is about water not electricity", "Water"),
    ("Power supply problem", "Power supply problem near {place} - this is about electricity not water", "Electricity"),
]

places = [
    "Ward 1", "Ward 2", "Ward 3", "Main Road", "Bus Stand",
    "Near School", "Near Hospital", "Market Area",
    "Sector 5", "Sector 7", "Residential Colony"
]

rows = []

TARGET_PER_CATEGORY = 1000  # 4 categories → ~4000 rows

# Generate regular samples with title + description
clean_samples = []
for category, priority_groups in categories.items():
    for priority, templates in priority_groups.items():
        for _ in range(TARGET_PER_CATEGORY // 3):
            title_template, desc_template = random.choice(templates)
            place = random.choice(places)
            title = title_template.format(place=place)
            description = desc_template.format(place=place)
            # Combine title and description for training
            combined_text = f"{title}. {description}"
            # Normalize the text
            normalized_text = normalize_text(combined_text)
            clean_samples.append([title, description, normalized_text, category, priority.capitalize()])

# Add clean samples
rows.extend(clean_samples)

# Add noisy variants (25% of clean samples)
num_noisy = len(clean_samples) // 4
noisy_indices = random.sample(range(len(clean_samples)), num_noisy)
for idx in noisy_indices:
    original_row = clean_samples[idx]
    original_text = original_row[2]  # normalized text
    
    # Create noisy variant
    noisy_text = add_noise_variant(original_text, noise_type='random')
    # Normalize the noisy text too (to handle any edge cases)
    noisy_text = normalize_text(noisy_text)
    
    # Create new row with noisy text but same labels
    noisy_row = [original_row[0], original_row[1], noisy_text, original_row[3], original_row[4]]
    rows.append(noisy_row)

# Add negative contrast samples (20% of clean samples, before noisy variants)
num_negative = len(clean_samples) // 5
for _ in range(num_negative):
    title_template, desc_template, correct_category = random.choice(negative_samples)
    place = random.choice(places)
    title = title_template.format(place=place)
    description = desc_template.format(place=place)
    combined_text = f"{title}. {description}"
    # Normalize the text
    normalized_text = normalize_text(combined_text)
    # Assign priority randomly for negative samples
    priority = random.choice(["High", "Medium", "Low"])
    rows.append([title, description, normalized_text, correct_category, priority])

random.shuffle(rows)

with open("data/complaints.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["title", "description", "text", "category", "priority"])
    writer.writerows(rows)

print(f"Dataset generated with {len(rows)} rows")
print(f"  - Clean samples: {len(clean_samples)}")
print(f"  - Noisy variants: {num_noisy} (25% of clean samples)")
print(f"  - Negative contrast samples: {num_negative}")
print(f"  - Total: {len(rows)}")
print(f"  - All text normalized for robustness")
