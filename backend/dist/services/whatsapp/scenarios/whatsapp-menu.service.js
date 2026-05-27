export function mainMenuCopy(language) {
    const map = {
        en: {
            welcome: 'Welcome to Morbeez Agriculture Assistant 🌱\n\nHow can we help you today?',
            buttonText: 'Choose',
            rows: [
                { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'Send crop photo / symptoms' },
                { id: 'menu.weather', title: 'Weather Alerts', description: 'Rain / humidity / spray suitability' },
                { id: 'menu.prices', title: 'Daily Prices', description: "Today's crop prices" },
                { id: 'menu.soil', title: 'Soil Testing', description: 'Sample + report help' },
                { id: 'menu.expert', title: 'Talk to Expert', description: 'Callback from our team' },
            ],
        },
        ml: {
            welcome: 'മോർബീസ് അഗ്രികൾച്ചർ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം 🌱\n\nഇന്ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
            buttonText: 'തിരഞ്ഞെടുക്കുക',
            rows: [
                { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'വിളയുടെ ഫോട്ടോ / ലക്ഷണങ്ങൾ' },
                { id: 'menu.weather', title: 'Weather Alerts', description: 'മഴ / ഈർപ്പം / സ്പ്രേ' },
                { id: 'menu.prices', title: 'Daily Prices', description: 'ഇന്നത്തെ വില' },
                { id: 'menu.soil', title: 'Soil Testing', description: 'സാമ്പിൾ / റിപ്പോർട്ട്' },
                { id: 'menu.expert', title: 'Talk to Expert', description: 'ടീം കോൾബാക്ക്' },
            ],
        },
        ta: {
            welcome: 'Morbeez Agriculture Assistant-க்கு வரவேற்கிறோம் 🌱\n\nஇன்று எப்படி உதவலாம்?',
            buttonText: 'தேர்ந்தெடுக்கவும்',
            rows: [
                { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'பயிர் புகைப்படம் / அறிகுறிகள்' },
                { id: 'menu.weather', title: 'Weather Alerts', description: 'மழை / ஈரப்பதம் / ஸ்ப்ரே' },
                { id: 'menu.prices', title: 'Daily Prices', description: 'இன்றைய விலை' },
                { id: 'menu.soil', title: 'Soil Testing', description: 'மண் பரிசோதனை' },
                { id: 'menu.expert', title: 'Talk to Expert', description: 'எங்கள் குழு அழைக்கும்' },
            ],
        },
        kn: {
            welcome: 'Morbeez Agriculture Assistantಗೆ ಸ್ವಾಗತ 🌱\n\nಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
            buttonText: 'ಆಯ್ಕೆಮಾಡಿ',
            rows: [
                { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'ಬೆಳೆ ಫೋಟೋ / ಲಕ್ಷಣಗಳು' },
                { id: 'menu.weather', title: 'Weather Alerts', description: 'ಮಳೆ / ತೇವಾಂಶ / ಸ್ಪ್ರೇ' },
                { id: 'menu.prices', title: 'Daily Prices', description: 'ಇಂದಿನ ಬೆಲೆ' },
                { id: 'menu.soil', title: 'Soil Testing', description: 'ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ' },
                { id: 'menu.expert', title: 'Talk to Expert', description: 'ನಮ್ಮ ತಂಡ ಕರೆಮಾಡುತ್ತದೆ' },
            ],
        },
        hi: {
            welcome: 'Morbeez Agriculture Assistant में आपका स्वागत है 🌱\n\nआज हम कैसे मदद कर सकते हैं?',
            buttonText: 'चुनें',
            rows: [
                { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'फसल फोटो / लक्षण' },
                { id: 'menu.weather', title: 'Weather Alerts', description: 'बारिश / नमी / स्प्रे' },
                { id: 'menu.prices', title: 'Daily Prices', description: 'आज के दाम' },
                { id: 'menu.soil', title: 'Soil Testing', description: 'मिट्टी जांच' },
                { id: 'menu.expert', title: 'Talk to Expert', description: 'हमारी टीम कॉल करेगी' },
            ],
        },
    };
    return map[language] ?? map.en;
}
//# sourceMappingURL=whatsapp-menu.service.js.map