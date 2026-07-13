import json
import logging
import random
import uuid
from datetime import datetime, timedelta
import os
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LANGUAGES = ["English", "Hindi", "Odia", "Bengali"]

ODISHA_DISTRICTS = ["Khordha", "Cuttack", "Puri", "Ganjam", "Sambalpur", "Balasore", "Mayurbhanj", "Angul", "Dhenkanal"]
WB_DISTRICTS = ["Kolkata", "Howrah", "Hooghly", "North 24 Parganas", "South 24 Parganas", "Nadia", "Murshidabad", "Malda", "Darjeeling"]

CATEGORIES = [
    "Road Infrastructure", "Healthcare", "Education", "Water Supply", "Electricity",
    "Agriculture", "Women's Safety", "Public Transport", "Drainage & Sanitation",
    "Waste Management", "Flood & Disaster Management"
]

CITIZEN_TYPES = ["Student", "Farmer", "Teacher", "Business Owner", "Homemaker", "Senior Citizen", "Government Employee"]
AGE_GROUPS = ["18-25", "26-35", "36-45", "46-60", "60+"]
GENDERS = ["Male", "Female", "Other"]
ATTACHMENT_TYPES = ["image", "audio", "text", "null"]

TEMPLATES = {
    "English": [
        "The {issue} in {location} is getting worse day by day. Please take urgent action.",
        "As a {citizen_type}, I am deeply affected by the {issue}. We need immediate government intervention.",
        "Monsoon season has made the {issue} unbearable in {district}. When will this be fixed?",
        "I want to report a severe problem regarding {issue} near {village}. It poses a huge risk to our community.",
        "Despite multiple complaints, the {issue} remains unresolved in {location}. Kindly look into this matter."
    ],
    "Hindi": [
        "{location} में {issue} की स्थिति दिन-ब-दिन खराब हो रही है। कृपया तत्काल कार्रवाई करें।",
        "एक {citizen_type} के रूप में, मैं {issue} से बहुत प्रभावित हूं। हमें तत्काल सरकारी हस्तक्षेप की आवश्यकता है।",
        "मानसून के मौसम ने {district} में {issue} को असहनीय बना दिया है। इसे कब ठीक किया जाएगा?",
        "मैं {village} के पास {issue} के संबंध में एक गंभीर समस्या की रिपोर्ट करना चाहता हूं। यह हमारे समुदाय के लिए एक बड़ा जोखिम है।",
        "कई शिकायतों के बावजूद, {location} में {issue} अनसुलझा है। कृपया इस मामले को देखें।"
    ],
    "Odia": [
        "{location} ରେ {issue} ର ଅବସ୍ଥା ଦିନକୁ ଦିନ ଖରାପ ହେଉଛି। ଦୟାକରି ତୁରନ୍ତ ପଦକ୍ଷେପ ନିଅନ୍ତୁ।",
        "ଜଣେ {citizen_type} ଭାବରେ, ମୁଁ {issue} ଦ୍ୱାରା ବହୁତ ପ୍ରଭାବିତ | ଆମକୁ ତୁରନ୍ତ ସରକାରୀ ହସ୍ତକ୍ଷେପ ଆବଶ୍ୟକ |",
        "ବର୍ଷା ଦିନେ {district} ରେ {issue} ବହୁତ ଖରାପ ହୋଇଯାଇଛି। ଏହା କେବେ ଠିକ୍ ହେବ?",
        "ମୁଁ {village} ନିକଟରେ ଥିବା {issue} ବିଷୟରେ ଜଣାଇବାକୁ ଚାହୁଁଛି। ଏହା ଆମ ପାଇଁ ବହୁତ ଅସୁବିଧା ସୃଷ୍ଟି କରୁଛି।",
        "ବାରମ୍ବାର ଅଭିଯୋଗ ପରେ ମଧ୍ୟ {location} ରେ {issue} ର ସମାଧାନ ହୋଇନାହିଁ। ଦୟାକରି ଏହା ଉପରେ ଦୃଷ୍ଟି ଦିଅନ୍ତୁ।"
    ],
    "Bengali": [
        "{location} এ {issue} এর অবস্থা দিন দিন খারাপ হচ্ছে। অনুগ্রহ করে দ্রুত ব্যবস্থা নিন।",
        "একজন {citizen_type} হিসেবে আমি {issue} এর কারণে গভীরভাবে প্রভাবিত। আমাদের অবিলম্বে সরকারি হস্তক্ষেপ প্রয়োজন।",
        "বর্ষাকালে {district} এ {issue} অসহনীয় হয়ে উঠেছে। এটি কবে ঠিক হবে?",
        "আমি {village} এর কাছে {issue} সম্পর্কে একটি গুরুতর সমস্যার কথা জানাতে চাই। এটি আমাদের জন্য বিশাল ঝুঁকির কারণ।",
        "একাধিক অভিযোগ সত্ত্বেও {location} এ {issue} এর কোনো সমাধান হয়নি। দয়া করে বিষয়টি দেখুন।"
    ]
}

ISSUE_TRANSLATIONS = {
    "Road Infrastructure": {"English": "broken roads", "Hindi": "टूटी सड़कों", "Odia": "ଭଙ୍ଗା ରାସ୍ତା", "Bengali": "ভাঙ্গা রাস্তা"},
    "Healthcare": {"English": "lack of medicines in PHC", "Hindi": "अस्पताल में दवाओं की कमी", "Odia": "ଡାକ୍ତରଖାନାରେ ଔଷଧ ଅଭାବ", "Bengali": "হাসপাতালে ওষুধের অভাব"},
    "Education": {"English": "teacher shortage in school", "Hindi": "स्कूल में शिक्षकों की कमी", "Odia": "ବିଦ୍ୟାଳୟରେ ଶିକ୍ଷକ ଅଭାବ", "Bengali": "স্কুলে শিক্ষকের অভাব"},
    "Water Supply": {"English": "drinking water shortage", "Hindi": "पीने के पानी की कमी", "Odia": "ପିଇବା ପାଣି ଅଭାବ", "Bengali": "খাবার জলের অভাব"},
    "Electricity": {"English": "frequent power cuts", "Hindi": "लगातार बिजली कटौती", "Odia": "ବାରମ୍ବାର ବିଜୁଳି କାଟ", "Bengali": "ঘন ঘন লোডশেডিং"},
    "Agriculture": {"English": "crop damage due to rain", "Hindi": "बारिश से फसल का नुकसान", "Odia": "ବର୍ଷା ଯୋଗୁଁ ଫସଲ ନଷ୍ଟ", "Bengali": "বৃষ্টিতে ফসলের ক্ষতি"},
    "Women's Safety": {"English": "lack of streetlights and safety", "Hindi": "सड़क बत्ती और सुरक्षा की कमी", "Odia": "ରାସ୍ତା ଆଲୁଅ ଏବଂ ସୁରକ୍ଷା ଅଭାବ", "Bengali": "রাস্তার আলো এবং নিরাপত্তার অভাব"},
    "Public Transport": {"English": "irregular bus service", "Hindi": "अनियमित बस सेवा", "Odia": "ଅନିୟମିତ ବସ୍ ସେବା", "Bengali": "অনিয়মিত বাস পরিষেবা"},
    "Drainage & Sanitation": {"English": "clogged drainage system", "Hindi": "रुकी हुई जल निकासी प्रणाली", "Odia": "ଖରାପ ଡ୍ରେନେଜ୍ ବ୍ୟବସ୍ଥା", "Bengali": "জলাবদ্ধ ড্রেনেজ ব্যবস্থা"},
    "Waste Management": {"English": "garbage dumping on streets", "Hindi": "सड़कों पर कचरा डंपिंग", "Odia": "ରାସ୍ତାରେ ଅଳିଆ ଗଦା", "Bengali": "রাস্তায় আবর্জনা ফেলা"},
    "Flood & Disaster Management": {"English": "severe waterlogging", "Hindi": "भयंकर जलभराव", "Odia": "ପ୍ରବଳ ଜଳବନ୍ଦୀ", "Bengali": "মারাত্মক জলজট"}
}

NAMES_DB = {
    "Odisha": ["Ramesh Mohanty", "Priyanka Dash", "Susant Sahoo", "Anil Behera", "Sunita Pradhan", "Tapan Nayak", "Manas Rout", "Bikash Patra", "Jyoti Mishra", "Sasmita Panda"],
    "West Bengal": ["Amit Banerjee", "Riya Das", "Sourav Ghosh", "Pooja Chatterjee", "Debashis Sen", "Sudipta Mukherjee", "Arindam Bose", "Moumita Saha", "Ayan Biswas", "Rupa Roy"]
}

def get_random_location(state):
    if state == "Odisha":
        dist = random.choice(ODISHA_DISTRICTS)
        lat = round(random.uniform(19.0, 22.0), 5)
        lon = round(random.uniform(82.0, 87.0), 5)
    else:
        dist = random.choice(WB_DISTRICTS)
        lat = round(random.uniform(22.0, 27.0), 5)
        lon = round(random.uniform(86.0, 89.0), 5)
    return dist, lat, lon

def generate_text(lang, state, category, citizen_type, dist, village):
    template = random.choice(TEMPLATES[lang])
    issue = ISSUE_TRANSLATIONS.get(category, ISSUE_TRANSLATIONS["Road Infrastructure"])[lang]
    
    # Simple citizen type translation mapping for template consistency
    type_trans = {
        "Student": {"English": "student", "Hindi": "छात्र", "Odia": "ଛାତ୍ର", "Bengali": "ছাত্র"},
        "Farmer": {"English": "farmer", "Hindi": "किसान", "Odia": "କୃଷକ", "Bengali": "কৃষক"}
    }
    ct_lang = type_trans.get(citizen_type, type_trans["Student"])[lang] if citizen_type in type_trans else citizen_type
    
    return template.format(issue=issue, citizen_type=ct_lang, location=village, district=dist, village=village)

def generate_base_records(n=300):
    records = []
    for _ in range(n):
        lang = random.choice(LANGUAGES)
        
        if lang == "Odia":
            state = "Odisha"
        elif lang == "Bengali":
            state = "West Bengal"
        else:
            state = random.choice(["Odisha", "West Bengal"])
            
        dist, lat, lon = get_random_location(state)
        
        has_attachment = random.random() > 0.4
        att_type = random.choice(["image", "audio", "text"]) if has_attachment else "null"
        
        days_ago = random.randint(0, 180)
        timestamp = (datetime.now() - timedelta(days=days_ago)).isoformat()
        
        req_id = f"REQ-{datetime.now().year}{datetime.now().month:02d}-{uuid.uuid4().hex[:6].upper()}"
        citizen_type = random.choice(CITIZEN_TYPES)
        category = random.choice(CATEGORIES)
        village = f"Ward-{random.randint(1, 50)}"
        
        citizen_text = generate_text(lang, state, category, citizen_type, dist, village)
        citizen_name = random.choice(NAMES_DB[state])
        
        records.append({
            "request_id": req_id,
            "citizen_name": citizen_name,
            "citizen_type": citizen_type,
            "age_group": random.choice(AGE_GROUPS),
            "gender": random.choice(GENDERS),
            "language": lang,
            "state": state,
            "district": dist,
            "block_or_city": f"Block-{random.randint(1, 20)}",
            "ward_or_village": village,
            "issue_category": category,
            "citizen_text": citizen_text,
            "timestamp": timestamp,
            "latitude": lat,
            "longitude": lon,
            "attachment_available": has_attachment,
            "attachment_type": att_type
        })
    return records

def main():
    logger.info("Generating 300 highly realistic local records natively...")
    dataset = generate_base_records(300)
    
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "janniti_mock_dataset.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
        
    logger.info(f"Successfully generated {len(dataset)} records.")
    logger.info(f"Dataset saved to {out_path}")

if __name__ == "__main__":
    main()
