function cropLabel(crop, lang) {
    const c = crop.charAt(0).toUpperCase() + crop.slice(1);
    if (lang === 'ml' && crop === 'ginger')
        return 'ഇഞ്ചി';
    if (lang === 'ml' && crop === 'cardamom')
        return 'ഏലക്ക';
    return c;
}
const MESSAGES = {
    cultivation_schedule: {
        en: () => '🌱 *This week\'s field work:*\n\n• drainage cleaning\n• disease scouting\n• weed removal\n• chimb / shoot monitoring\n\nReply with a photo if you see any issue.',
        ml: () => '🌱 *ഈ ആഴ്ചത്തെ കൃഷി ജോലികൾ:*\n\n• നീർനിറയ്ക്കൽ / drainage cleaning\n• രോഗ പരിശോധന\n• കളനീക്കൽ\n• ചിമ്പ് നിരീക്ഷണം\n\nപ്രശ്നമുണ്ടെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.',
        ta: () => '🌱 *இந்த வார பணிகள்:*\n\n• வடிகால் சுத்தம்\n• நோய் ஆய்வு\n• களை நீக்கம்\n• சிம்ப் கண்காணிப்பு\n\nபிரச்சனை இருந்தால் படம் அனுப்பவும்.',
        kn: () => '🌱 *ಈ ವಾರದ ಕೆಲಸ:*\n\n• ನೀರು ನಿಲ್ಲುವಿಕೆ / drainage\n• ರೋಗ ತಪಾಸಣೆ\n• ಕಳೆ ತೆಗೆಯುವಿಕೆ\n• ಚಿಂಬ್ ಮೇಲ್ವಿಚಾರಣೆ\n\nಸಮಸ್ಯೆ ಇದ್ದರೆ ಫೋಟೋ ಕಳುಹಿಸಿ.',
        hi: () => '🌱 *इस सप्ताह का काम:*\n\n• जल निकासी सफाई\n• रोग की जांच\n• निराई\n• चिम्ब / शूट निगरानी\n\nसमस्या हो तो फोटो भेजें।',
    },
    fertigation_reminder: {
        en: (p) => `💧 *Fertigation reminder* — ${cropLabel(p.crop, 'en')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nCalcium nitrate stage may have started.\n\n⚠️ Do not mix with sulphates in the same tank.\n\nReply *menu* for more options.`,
        ml: (p) => `💧 *ഫെർട്ടിഗേഷൻ ഓർമ്മപ്പെടുത്തൽ* — ${cropLabel(p.crop, 'ml')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nകാൽസ്യം നൈട്രേറ്റ് ഘട്ടം ആരംഭിച്ചിരിക്കാം.\n\n⚠️ സൾഫേറ്റുകളുമായി ചേർക്കരുത്.\n\n*menu* ടൈപ്പ് ചെയ്യുക.`,
        ta: (p) => `💧 *உரச்சத்து நினைவூட்டல்* — ${cropLabel(p.crop, 'ta')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nகால்சியம் நைட்ரேட் நிலை தொடங்கியிருக்கலாம்.\n\n⚠️ சல்பேட்டுகளுடன் கலக்க வேண்டாம்.`,
        kn: (p) => `💧 *ಫೆರ್ಟಿಗೇಶನ್ ಜ್ಞಾಪನೆ* — ${cropLabel(p.crop, 'kn')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nಕ್ಯಾಲ್ಸಿಯಂ ನೈಟ್ರೇಟ್ ಹಂತ ಪ್ರಾರಂಭವಾಗಿರಬಹುದು.\n\n⚠️ ಸಲ್ಫೇಟ್‌ಗಳೊಂದಿಗೆ ಮಿಶ್ರಣ ಮಾಡಬೇಡಿ.`,
        hi: (p) => `💧 *फर्टिगेशन अनुस्मारक* — ${cropLabel(p.crop, 'hi')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nकैल्शियम नाइट्रेट चरण शुरू हो सकता है।\n\n⚠️ सल्फेट के साथ मिलाएं नहीं।`,
    },
    pgr_broadcast: {
        en: (p) => `🌿 *Growth stage alert* — ${cropLabel(p.crop, 'en')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nShoot multiplication / vegetative flush stage.\n\nRecommended this week:\n• seaweed spray\n• amino acid spray\n• drainage maintenance`,
        ml: (p) => `🌿 *വളർച്ചാ ഘട്ടം* — ${cropLabel(p.crop, 'ml')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nചിമ്പ് / vegetative flush ഘട്ടം.\n\nഈ ആഴ്ച:\n• seaweed spray\n• amino acid spray\n• drainage maintenance`,
        ta: (p) => `🌿 *வளர்ச்சி நிலை* — ${cropLabel(p.crop, 'ta')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nசிம்ப் / vegetative flush.\n\nஇந்த வாரம்: seaweed, amino acid, drainage.`,
        kn: (p) => `🌿 *ಬೆಳವಣಿಗೆ ಹಂತ* — ${cropLabel(p.crop, 'kn')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nಚಿಂಬ್ / vegetative flush.\n\nಈ ವಾರ: seaweed, amino acid, drainage.`,
        hi: (p) => `🌿 *वृद्धि चरण* — ${cropLabel(p.crop, 'hi')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nचिम्ब / vegetative flush.\n\nइस सप्ताह: seaweed, amino acid, drainage.`,
    },
    cultivation_knowledge: {
        en: (p) => {
            if (p.crop === 'cardamom') {
                return `📚 *Cultivation knowledge* — ${cropLabel(p.crop, 'en')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\n*Vegetative flush stage detected.*\n\nRecommended this week:\n• nitrogen split dose\n• neem cake application\n• drainage maintenance\n• root zone cleaning\n\nReply with a photo if you see disease symptoms.`;
            }
            if (p.crop === 'ginger') {
                return `📚 *Cultivation knowledge* — ${cropLabel(p.crop, 'en')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\n*Active growth stage.*\n\nRecommended:\n• balanced NPK fertigation\n• rhizome rot scouting\n• mulch / drainage check\n• avoid waterlogging`;
            }
            return `📚 *Cultivation knowledge* — ${cropLabel(p.crop, 'en')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nField care tips for your crop stage. Send a photo for disease diagnosis.`;
        },
        ml: (p) => {
            if (p.crop === 'cardamom') {
                return `📚 *കൃഷി അറിവ്* — ${cropLabel(p.crop, 'ml')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\n*Vegetative flush ഘട്ടം.*\n\nഈ ആഴ്ച:\n• നൈട്രജൻ split dose\n• neem cake\n• drainage maintenance\n• root zone cleaning\n\nരോഗമുണ്ടെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.`;
            }
            return `📚 *കൃഷി അറിവ്* — ${cropLabel(p.crop, 'ml')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nനിങ്ങളുടെ ഘട്ടത്തിന് ഫീൽഡ് കെയർ ടിപ്പുകൾ. രോഗത്തിന് ഫോട്ടോ അയയ്ക്കുക.`;
        },
        ta: (p) => `📚 *விவசாய அறிவு* — ${cropLabel(p.crop, 'ta')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nவளர்ச்சி நிலைக்கான பராமரிப்பு. அறிகுறி இருந்தால் படம் அனுப்பவும்.`,
        kn: (p) => `📚 *ಕೃಷಿ ಜ್ಞಾನ* — ${cropLabel(p.crop, 'kn')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nಬೆಳವಣಿಗೆ ಹಂತದ ಸಲಹೆಗಳು. ರೋಗವಿದ್ದರೆ ಫೋಟೋ ಕಳುಹಿಸಿ.`,
        hi: (p) => `📚 *खेती ज्ञान* — ${cropLabel(p.crop, 'hi')}${p.dap ? ` (${p.dap} DAP)` : ''}\n\nवृद्धि चरण की देखभाल। लक्षण हों तो फोटो भेजें।`,
    },
    dap_task: {
        en: (p) => {
            const task = p.crop === 'ginger'
                ? 'Rhizome rot scouting recommended this week.'
                : p.crop === 'cardamom'
                    ? 'Capsule / stem borer scouting recommended this week.'
                    : 'Field scouting recommended this week.';
            return `📅 *${cropLabel(p.crop, 'en')} — ${p.dap ?? '?'} DAP*\n\n${task}\n\nSend a crop photo if you see symptoms. Reply *menu* for help.`;
        },
        ml: (p) => {
            const task = p.crop === 'ginger'
                ? 'ഈ ആഴ്ച റൈസോം റോട്ട് പരിശോധന ശുപാർശ ചെയ്യുന്നു.'
                : 'ഈ ആഴ്ച ഫീൽഡ് സ്കൗട്ടിംഗ് ശുപാർശ ചെയ്യുന്നു.';
            return `📅 *${cropLabel(p.crop, 'ml')} — ${p.dap ?? '?'} DAP*\n\n${task}\n\nലക്ഷണമുണ്ടെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.`;
        },
        ta: (p) => `📅 *${cropLabel(p.crop, 'ta')} — ${p.dap ?? '?'} DAP*\n\nஇந்த வாரம் வயல் ஆய்வு பரிந்துரை.\n\nஅறிகுறி இருந்தால் படம் அனுப்பவும்.`,
        kn: (p) => `📅 *${cropLabel(p.crop, 'kn')} — ${p.dap ?? '?'} DAP*\n\nಈ ವಾರ ಫೀಲ್ಡ್ ಸ್ಕೌಟಿಂಗ್ ಶಿಫಾರಸು.\n\nಲಕ್ಷಣಗಳಿದ್ದರೆ ಫೋಟೋ ಕಳುಹಿಸಿ.`,
        hi: (p) => `📅 *${cropLabel(p.crop, 'hi')} — ${p.dap ?? '?'} DAP*\n\nइस सप्ताह खेत की जांच की सिफारिश।\n\nलक्षण हों तो फोटो भेजें।`,
    },
};
export function formatBroadcastMessage(kind, language, params) {
    const fn = MESSAGES[kind][language] ?? MESSAGES[kind].en;
    return fn(params);
}
//# sourceMappingURL=broadcast-copy.js.map