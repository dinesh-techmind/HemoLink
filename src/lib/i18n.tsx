import React, { createContext, useContext, useState, useEffect } from "react";

export type LanguageCode = "en" | "hi" | "ta" | "te" | "kn" | "ml" | "bn" | "mr";

export interface LanguageInfo {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  flag: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "en",
    nativeName: "English",
    englishName: "English",
    flag: "🌐",
    region: "Global / Default"
  },
  {
    code: "hi",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    flag: "🇮🇳",
    region: "National / North & Central"
  },
  {
    code: "ta",
    nativeName: "தமிழ்",
    englishName: "Tamil",
    flag: "🇮🇳",
    region: "Tamil Nadu & Puducherry"
  },
  {
    code: "te",
    nativeName: "తెలుగు",
    englishName: "Telugu",
    flag: "🇮🇳",
    region: "Andhra Pradesh & Telangana"
  },
  {
    code: "kn",
    nativeName: "ಕನ್ನಡ",
    englishName: "Kannada",
    flag: "🇮🇳",
    region: "Karnataka"
  },
  {
    code: "ml",
    nativeName: "മലയാളം",
    englishName: "Malayalam",
    flag: "🇮🇳",
    region: "Kerala"
  },
  {
    code: "bn",
    nativeName: "বাংলা",
    englishName: "Bengali",
    flag: "🇮🇳",
    region: "West Bengal & East"
  },
  {
    code: "mr",
    nativeName: "मराठी",
    englishName: "Marathi",
    flag: "🇮🇳",
    region: "Maharashtra"
  }
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    app_title: "HEMOLINK",
    app_tagline: "Connecting donors. Saving Lives.",
    total_donors: "Total Donors",
    available_now: "Available Now",
    active_sos: "Active SOS",
    completed_saves: "Completed Saves",
    search_donors: "Search Donors",
    emergency_board: "Emergency Board",
    blood_banks_maps: "Blood Banks (Maps)",
    donor_eligibility: "Donor Eligibility",
    schedule_calendar: "Schedule Calendar",
    donor_pass: "Donor Identity Pass",
    admin_command: "Admin Command",
    emergency_banner: "CRITICAL BLOOD REQUISITIONS ACTIVE IN YOUR LOCATION. SECURE THE FEED NOW.",
    live_signals: "Live Dispatch Signals",
    mark_all_read: "Mark all read",
    clear: "Clear",
    alerts_city: "Alerts City:",
    test_alert: "Test Alert",
    no_notifications: "No active match signals received yet.",
    view_donor_pass: "View Official Donor Pass",
    generate_pass: "Generate Donor Identity Pass",
    request_blood_sos: "Request Blood (SOS)",
    publish_sos: "PUBLISH COMMUNITY SOS EMERGENCY ALERT",
    search_placeholder: "Search by donor name, city, hospital...",
    filter_blood_group: "All Blood Groups",
    filter_city: "All Cities",
    filter_availability: "Availability",
    distance_radius: "Distance Radius",
    donate_now: "Donate Now",
    eligible_now: "Eligible Now",
    logout: "Log Out",
    language: "Language",
    select_language: "Select Language / भाषा चुनें",
    emergency_support: "Emergency Helpline: 1800-123-4567",
    verified_lifesaver: "Verified Lifesaver",
    quick_contact: "Direct Hospital Hotline"
  },
  hi: {
    app_title: "हीमोलिंक",
    app_tagline: "रक्तदाताओं को जोड़ना। जीवन बचाना।",
    total_donors: "कुल रक्तदाता",
    available_now: "अभी उपलब्ध",
    active_sos: "सक्रिय आपातकालीन SOS",
    completed_saves: "सफल सहायता",
    search_donors: "रक्तदाता खोजें",
    emergency_board: "आपातकालीन बोर्ड",
    blood_banks_maps: "ब्लड बैंक (मानचित्र)",
    donor_eligibility: "रक्तदान पात्रता",
    schedule_calendar: "कैलेंडर अनुसूची",
    donor_pass: "दाता पहचान पास",
    admin_command: "एडमिन कंट्रोल",
    emergency_banner: "आपके क्षेत्र में अति-आवश्यक रक्त आवश्यकताएं सक्रिय हैं। तुरंत देखें।",
    live_signals: "लाइव आपातकालीन सूचनाएं",
    mark_all_read: "सभी पढ़ा हुआ मार्क करें",
    clear: "साफ़ करें",
    alerts_city: "अलर्ट शहर:",
    test_alert: "परीक्षण अलर्ट",
    no_notifications: "अभी तक कोई सक्रिय आपातकालीन सिग्नल नहीं मिला।",
    view_donor_pass: "आधिकारिक दाता पास देखें",
    generate_pass: "दाता पहचान पास बनाएं",
    request_blood_sos: "रक्त की तत्काल मांग (SOS)",
    publish_sos: "सामुदायिक आपातकालीन SOS अलर्ट जारी करें",
    search_placeholder: "दाता का नाम, शहर या अस्पताल खोजें...",
    filter_blood_group: "सभी रक्त समूह",
    filter_city: "सभी शहर",
    filter_availability: "उपलब्धता",
    distance_radius: "दूरी का दायरा",
    donate_now: "अभी रक्तदान करें",
    eligible_now: "अभी रक्तदान के लिए पात्र",
    logout: "लॉग आउट",
    language: "भाषा",
    select_language: "भाषा चुनें / Select Language",
    emergency_support: "आपातकालीन हेल्पलाइन: 1800-123-4567",
    verified_lifesaver: "सत्यापित जीवनरक्षक",
    quick_contact: "अस्पताल आपातकालीन संपर्क"
  },
  ta: {
    app_title: "ஹீமோலிங்க்",
    app_tagline: "ரத்த தானாளர்களை இணைக்கிறது. உயிர்களைக் காக்கிறது.",
    total_donors: "மொத்த தானாளர்கள்",
    available_now: "இப்போது கிடைக்கும்",
    active_sos: "செயலில் உள்ள SOS",
    completed_saves: "காப்பாற்றப்பட்ட உயிர்கள்",
    search_donors: "தானாளர்களைத் தேடுங்கள்",
    emergency_board: "அவசர கால பலகை",
    blood_banks_maps: "ரத்த வங்கிகள் (வரைபடம்)",
    donor_eligibility: "தான தகுதி சோதனை",
    schedule_calendar: "தான நாட்காட்டி",
    donor_pass: "தானாளர் அடையாள அட்டை",
    admin_command: "நிர்வாக மையம்",
    emergency_banner: "உங்கள் பகுதியில் அவசர ரத்த தேவைகள் தீவிரமாக உள்ளன. உடனே உதவவும்.",
    live_signals: "நேரடி அவசர அறிவிப்புகள்",
    mark_all_read: "அனைத்தும் படித்ததாகக் குறி",
    clear: "அழி",
    alerts_city: "அறிவிப்பு நகரம்:",
    test_alert: "சோதனை அறிவிப்பு",
    no_notifications: "செயலில் உள்ள அவசர அறிவிப்புகள் எதுவும் இல்லை.",
    view_donor_pass: "அதிகாரப்பூர்வ தானாளர் அட்டை",
    generate_pass: "தானாளர் அட்டை உருவாக்கு",
    request_blood_sos: "அவசர ரத்த உதவி (SOS)",
    publish_sos: "அவசர சமூக SOS ரத்த எச்சரிக்கை வெளியிடவும்",
    search_placeholder: "தானாளர் பெயர், ஊர் அல்லது மருத்துவமனை தேடவும்...",
    filter_blood_group: "அனைத்து ரத்த வகைகள்",
    filter_city: "அனைத்து நகரங்கள்",
    filter_availability: "கிடைக்கும் நிலை",
    distance_radius: "தொலைவு வரம்பு",
    donate_now: "இப்போதே ரத்ததானம் செய்",
    eligible_now: "தானம் செய்ய தகுதியானவர்",
    logout: "வெளியேறு",
    language: "மொழி",
    select_language: "மொழியைத் தேர்ந்தெடுக்கவும்",
    emergency_support: "அவசர உதவி எண்: 1800-123-4567",
    verified_lifesaver: "சரிபார்க்கப்பட்ட உயிர்காப்பாளர்",
    quick_contact: "மருத்துவமனை நேரடித் தொடர்பு"
  },
  te: {
    app_title: "హీమోలింక్",
    app_tagline: "రక్తదాతలను కలపడం. ప్రాణాలను కాపాడటం.",
    total_donors: "మొత్తం దాతలు",
    available_now: "ఇప్పుడు అందుబాటులో",
    active_sos: "యాక్టివ్ SOS",
    completed_saves: "పూర్తయిన సహాయాలు",
    search_donors: "దాతలను శోధించండి",
    emergency_board: "అత్యవసర బోర్డు",
    blood_banks_maps: "బ్లడ్ బ్యాంకులు (మ్యాప్స్)",
    donor_eligibility: "దాత అర్హత",
    schedule_calendar: "రక్తదాన క్యాలెండర్",
    donor_pass: "దాత గుర్తింపు పాస్",
    admin_command: "అడ్మిన్ కంట్రోల్",
    emergency_banner: "మీ ప్రాంతంలో అత్యవసర రక్త అవసరాలు ఉన్నాయి. వెంటనే పరిశీలించండి.",
    live_signals: "ప్రత్యక్ష అత్యవసర సంకేతాలు",
    mark_all_read: "అన్నీ చదివినట్లు గుర్తించు",
    clear: "క్లియర్",
    alerts_city: "హెచ్చరికల నగరం:",
    test_alert: "పరీక్ష హెచ్చరిక",
    no_notifications: "ఇంకా ఎటువంటి అత్యవసర సంకేతాలు రాలేదు.",
    view_donor_pass: "అధికారిక దాత పాస్ చూడండి",
    generate_pass: "దాత పాస్ సృష్టించండి",
    request_blood_sos: "అత్యవసర రక్తం (SOS)",
    publish_sos: "కమ్యూనిటీ అత్యవసర SOS హెచ్చరికను ప్రచురించండి",
    search_placeholder: "దాత పేరు, నగరం లేదా ఆసుపత్రి శోధించండి...",
    filter_blood_group: "అన్ని రక్త సమూహాలు",
    filter_city: "అన్ని నగరాలు",
    filter_availability: "అందుబాటు",
    distance_radius: "దూరం పరిధి",
    donate_now: "ఇప్పుడే దానం చేయండి",
    eligible_now: "ఇప్పుడు దానానికి అర్హులు",
    logout: "లాగ్ అవుట్",
    language: "భాష",
    select_language: "భాషను ఎంచుకోండి",
    emergency_support: "అత్యవసర హెల్ప్‌లైన్: 1800-123-4567",
    verified_lifesaver: "ధృవీకరించబడిన జీవరక్షకుడు",
    quick_contact: "ఆసుపత్రి అత్యవసర సంప్రదింపు"
  },
  kn: {
    app_title: "ಹಿಮೋಲಿಂಕ್",
    app_tagline: "ರಕ್ತದಾನಿಗಳನ್ನು ಸಂಪರ್ಕಿಸುವುದು. ಜೀವಗಳನ್ನು ಉಳಿಸುವುದು.",
    total_donors: "ಒಟ್ಟು ದಾನಿಗಳು",
    available_now: "ಈಗ ಲಭ್ಯವಿದೆ",
    active_sos: "ಸಕ್ರಿಯ SOS",
    completed_saves: "ಪೂರ್ಣಗೊಂಡ ರಕ್ಷಣೆಗಳು",
    search_donors: "ದಾನಿಗಳನ್ನು ಹುಡುಕಿ",
    emergency_board: "ತುರ್ತು ಬೋರ್ಡ್",
    blood_banks_maps: "ರಕ್ತ ಬ್ಯಾಂಕುಗಳು (ನಕ್ಷೆ)",
    donor_eligibility: "ದಾನ ಅರ್ಹತೆ",
    schedule_calendar: "ದಾನ ಕ್ಯಾಲೆಂಡರ್",
    donor_pass: "ದಾನಿ ಗುರುತಿನ ಪಾಸ್",
    admin_command: "ಅಡ್ಮಿನ್ ನಿಯಂತ್ರಣ",
    emergency_banner: "ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ತುರ್ತು ರಕ್ತದ ಅವಶ್ಯಕತೆಗಳು ಸಕ್ರಿಯವಾಗಿವೆ. ತಕ್ಷಣವೇ ಪರಿಶೀಲಿಸಿ.",
    live_signals: "ನೇರ ತುರ್ತು ಸಂದೇಶಗಳು",
    mark_all_read: "ಎಲ್ಲವನ್ನೂ ಓದಿದಂತೆ ಗುರುತಿಸಿ",
    clear: "ತೆರವುಗೊಳಿಸಿ",
    alerts_city: "ಎಚ್ಚರಿಕೆ ನಗರ:",
    test_alert: "ಪರೀಕ್ಷಾ ಎಚ್ಚರಿಕೆ",
    no_notifications: "ಇನ್ನೂ ಯಾವುದೇ ಸಕ್ರಿಯ ಸಂದೇಶಗಳು ಬಂದಿಲ್ಲ.",
    view_donor_pass: "ಅಧಿಕೃತ ದಾನಿ ಪಾಸ್ ವೀಕ್ಷಿಸಿ",
    generate_pass: "ದಾನಿ ಗುರುತಿನ ಪಾಸ್ ರಚಿಸಿ",
    request_blood_sos: "ತುರ್ತು ರಕ್ತ ವಿನಂತಿ (SOS)",
    publish_sos: "ತುರ್ತು ಸಮುದಾಯ SOS ರಕ್ತ ಎಚ್ಚರಿಕೆ ಪ್ರಕಟಿಸಿ",
    search_placeholder: "ದಾನಿ ಹೆಸರು, ನಗರ ಅಥವಾ ಆಸ್ಪತ್ರೆ ಹುಡುಕಿ...",
    filter_blood_group: "ಎಲ್ಲಾ ರಕ್ತ ಗುಂಪುಗಳು",
    filter_city: "ಎಲ್ಲಾ ನಗರಗಳು",
    filter_availability: "ಲಭ್ಯತೆ",
    distance_radius: "ದೂರ ವ್ಯಾಪ್ತಿ",
    donate_now: "ಈಗಲೇ ರಕ್ತದಾನ ಮಾಡಿ",
    eligible_now: "ದಾನಕ್ಕೆ ಅರ್ಹರಾಗಿದ್ದಾರೆ",
    logout: "ಲಾಗ್ ಔಟ್",
    language: "ಭಾಷೆ",
    select_language: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    emergency_support: "ತುರ್ತು ಸಹಾಯವಾಣಿ: 1800-123-4567",
    verified_lifesaver: "ಪರಿಶೀಲಿಸಿದ ಜೀವ ರಕ್ಷಕ",
    quick_contact: "ಆಸ್ಪತ್ರೆ ತುರ್ತು ಸಂಪರ್ಕ"
  },
  ml: {
    app_title: "ഹീമോലിങ്ക്",
    app_tagline: "രക്തദാതാക്കളെ ബന്ധിപ്പിക്കുന്നു. ജീവൻ രക്ഷിക്കുന്നു.",
    total_donors: "ആകെ ദാതാക്കൾ",
    available_now: "ഇപ്പോൾ ലഭ്യമാണ്",
    active_sos: "സജീവ SOS",
    completed_saves: "രക്ഷിച്ച ജീവനുകൾ",
    search_donors: "ദാതാക്കളെ തിരയുക",
    emergency_board: "അടിയന്തര ബോർഡ്",
    blood_banks_maps: "ബ്ലഡ് ബാങ്കുകൾ (മാപ്പ്)",
    donor_eligibility: "ദാതാവിന്റെ യോഗ്യത",
    schedule_calendar: "രക്തദാന കലണ്ടർ",
    donor_pass: "ദാതാവ് തിരിച്ചറിയൽ കാർഡ്",
    admin_command: "അഡ്മിൻ കൺട്രോൾ",
    emergency_banner: "നിങ്ങളുടെ പ്രദേശത്ത് അടിയന്തര രക്ത ആവശ്യങ്ങളുണ്ട്. ഉടൻ പ്രതികരിക്കുക.",
    live_signals: "തത്സമയ അടിയന്തര അറിയിപ്പുകൾ",
    mark_all_read: "എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക",
    clear: "മായ്ക്കുക",
    alerts_city: "അലർട്ട് നഗരം:",
    test_alert: "ടെസ്റ്റ് അലർട്ട്",
    no_notifications: "സജീവ സന്ദേശങ്ങളൊന്നും ലഭിച്ചിട്ടില്ല.",
    view_donor_pass: "ഔദ്യോഗിക ദാതാവ് പാസ് കാണുക",
    generate_pass: "തിരിച്ചറിയൽ കാർഡ് നിർമ്മിക്കുക",
    request_blood_sos: "അടിയന്തര രക്ത ആവശ്യം (SOS)",
    publish_sos: "അടിയന്തര കമ്മ്യൂണിറ്റി SOS അലർട്ട് നൽകുക",
    search_placeholder: "ദാതാവിന്റെ പേര്, നഗരം അല്ലെങ്കിൽ ആശുപത്രി തിരയുക...",
    filter_blood_group: "എല്ലാ രക്തഗ്രൂപ്പുകളും",
    filter_city: "എല്ലാ നഗരങ്ങളും",
    filter_availability: "ലഭ്യത",
    distance_radius: "ദൂരപരിധി",
    donate_now: "ഇപ്പോൾ രക്തം ദാനം ചെയ്യുക",
    eligible_now: "രക്തദാനത്തിന് യോഗ്യൻ",
    logout: "ലോഗ് ഔട്ട്",
    language: "ഭാഷ",
    select_language: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    emergency_support: "അടിയന്തര ഹെൽപ്പ്‌ലൈൻ: 1800-123-4567",
    verified_lifesaver: "സ്ഥിരീകരിച്ച ജീവരക്ഷകൻ",
    quick_contact: "ആശുപത്രി നേരിട്ടുള്ള ഫോൺ"
  },
  bn: {
    app_title: "হিমোলিঙ্ক",
    app_tagline: "রক্তদাতাদের সংযুক্ত করা। জীবন বাঁচানো।",
    total_donors: "মোট রক্তদাতা",
    available_now: "এখন উপলব্ধ",
    active_sos: "সক্রিয় SOS",
    completed_saves: "সম্পন্ন জীবনরক্ষা",
    search_donors: "দাতা অনুসন্ধান",
    emergency_board: "জরুরি বোর্ড",
    blood_banks_maps: "ব্লাড ব্যাঙ্ক (ম্যাপ)",
    donor_eligibility: "রক্তদান যোগ্যতা",
    schedule_calendar: "রক্তদান ক্যালেন্ডার",
    donor_pass: "দাতা পরিচয় পত্র",
    admin_command: "অ্যাডমিন কন্ট্রোল",
    emergency_banner: "আপনার এলাকায় জরুরি রক্তের প্রয়োজন সক্রিয় রয়েছে। অবিলম্বে দেখুন।",
    live_signals: "লাইভ জরুরি সংকেত",
    mark_all_read: "সব পঠিত হিসেবে চিহ্নিত করুন",
    clear: "মুছুন",
    alerts_city: "সতর্কবার্তা শহর:",
    test_alert: "পরীক্ষামূলক সতর্কবার্তা",
    no_notifications: "এখনও কোনো জরুরি সংকেত পাওয়া যায়নি।",
    view_donor_pass: "অফিসিয়াল দাতা পাস দেখুন",
    generate_pass: "দাতা পরিচয় পত্র তৈরি করুন",
    request_blood_sos: "জরুরি রক্তের আবেদন (SOS)",
    publish_sos: "জরুরি কমিউনিটি SOS অ্যালার্ট প্রকাশ করুন",
    search_placeholder: "দাতার নাম, শহর বা হাসপাতাল খুঁজুন...",
    filter_blood_group: "সকল রক্তের গ্রুপ",
    filter_city: "সকল শহর",
    filter_availability: "উপলব্ধতা",
    distance_radius: "দূরত্ব পরিধি",
    donate_now: "এখনই রক্তদান করুন",
    eligible_now: "রক্তদানের জন্য যোগ্য",
    logout: "লগ আউট",
    language: "ভাষা",
    select_language: "ভাষা নির্বাচন করুন",
    emergency_support: "জরুরি হেল্পলাইন: 1800-123-4567",
    verified_lifesaver: "যাচাইকৃত জীবনরক্ষক",
    quick_contact: "হাসপাতাল সরাসরি হেল্পলাইন"
  },
  mr: {
    app_title: "हेमोलिंक",
    app_tagline: "रक्तदात्यांना जोडणे. जीवन वाचवणे.",
    total_donors: "एकूण रक्तदाते",
    available_now: "आता उपलब्ध",
    active_sos: "सक्रिय SOS",
    completed_saves: "वाचवलेले जीव",
    search_donors: "रक्तदाते शोधा",
    emergency_board: "आपत्कालीन बोर्ड",
    blood_banks_maps: "रक्तपेढ्या (नकाशा)",
    donor_eligibility: "रक्तदान पात्रता",
    schedule_calendar: "कॅलेंडर वेळापत्रक",
    donor_pass: "रक्तदाता ओळखपत्र",
    admin_command: "अ‍ॅडमिन नियंत्रण",
    emergency_banner: "तुमच्या भागात तातडीची रक्त आवश्यकता सक्रिय आहे. लगेच तपासा.",
    live_signals: "थेट आपत्कालीन सूचना",
    mark_all_read: "सर्व वाचलेले म्हणून चिन्हांकित करा",
    clear: "साफ करा",
    alerts_city: "सूचना शहर:",
    test_alert: "चाचणी सूचना",
    no_notifications: "अद्याप कोणताही आपत्कालीन संदेश आलेला नाही.",
    view_donor_pass: "अधिकृत रक्तदाता पास पहा",
    generate_pass: "रक्तदाता ओळखपत्र तयार करा",
    request_blood_sos: "तातडीची रक्त मागणी (SOS)",
    publish_sos: "समुदाय आपत्कालीन SOS अलर्ट जारी करा",
    search_placeholder: "दात्याचे नाव, शहर किंवा रुग्णालय शोधा...",
    filter_blood_group: "सर्व रक्तगट",
    filter_city: "सर्व शहरे",
    filter_availability: "उपलब्धता",
    distance_radius: "अंतर त्रिज्या",
    donate_now: "आत्ताच रक्तदान करा",
    eligible_now: "आता रक्तदानासाठी पात्र",
    logout: "लॉग आउट",
    language: "भाषा",
    select_language: "भाषा निवडा",
    emergency_support: "आपत्कालीन हेल्पलाइन: 1800-123-4567",
    verified_lifesaver: "प्रमाणित जीवनरक्षक",
    quick_contact: "रुग्णालय थेट संपर्क"
  }
};

interface LanguageContextType {
  currentLanguage: LanguageCode;
  languageInfo: LanguageInfo;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "hemolink_preferred_lang";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode;
      if (saved && TRANSLATIONS[saved]) {
        return saved;
      }
    } catch {
      // Ignore storage read error
    }
    return "en";
  });

  const setLanguage = (code: LanguageCode) => {
    if (TRANSLATIONS[code]) {
      setCurrentLanguageState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // Ignore storage write error
      }
      document.documentElement.lang = code;
    }
  };

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const languageInfo =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[currentLanguage];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const defaultDict = TRANSLATIONS.en;
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        languageInfo,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    const fallbackLang = SUPPORTED_LANGUAGES[0];
    return {
      currentLanguage: "en",
      languageInfo: fallbackLang,
      setLanguage: () => {},
      t: (key: string, fallback?: string) => TRANSLATIONS.en[key] || fallback || key,
      languages: SUPPORTED_LANGUAGES
    };
  }
  return ctx;
};
