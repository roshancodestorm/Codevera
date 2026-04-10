import { useState, useEffect } from 'react';

export const useTranslation = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem('codevora_lang') || 'en');

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        codevora_ai: "Codevora AI",
        welcome: "Welcome to Codevora AI",
        dashboard: "Dashboard",
        voice_init: "🎙️ Voice session initialized. How can I assist you?",
        features: "Features",
        pricing: "Pricing",
        login: "Login Gateway",
        get_started: "Initialize System"
      },
      hi: {
        codevora_ai: "कोडेवोरा एआई (Codevora AI)",
        welcome: "कोडेवोरा एआई में आपका स्वागत है",
        dashboard: "डैशबोर्ड",
        voice_init: "🎙️ वॉयस सेशन शुरू हो गया है। मैं आपकी कैसे मदद कर सकता हूँ?",
        features: "विशेषताएं",
        pricing: "कीमतें",
        login: "लॉगिन",
        get_started: "शुरू करें"
      },
      hinglish: {
        codevora_ai: "Codevora AI",
        welcome: "Codevora AI mein aapka swagat hai",
        dashboard: "Dashboard",
        voice_init: "🎙️ Voice session start ho gaya hai. Main aapki kaise madad kar sakta hoon?",
        features: "Features",
        pricing: "Pricing",
        login: "Login Karo",
        get_started: "Shuru Karein"
      }
    };
    return translations[language]?.[key] || key;
  };

  const i18n = {
    language,
    changeLanguage: (lng: string) => {
      setLanguage(lng);
      localStorage.setItem('codevora_lang', lng);
    }
  };

  return { t, i18n };
};
