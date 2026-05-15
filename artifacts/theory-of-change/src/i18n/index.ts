import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import pt from "./locales/pt.json";
import es from "./locales/es.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";
import nl from "./locales/nl.json";

const SUPPORTED = ["en", "pt", "es", "it", "fr", "nl"];

const saved = localStorage.getItem("pathways_lang");
const browser = navigator.language.split("-")[0];
const defaultLng =
  saved && SUPPORTED.includes(saved)
    ? saved
    : SUPPORTED.includes(browser)
    ? browser
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
    es: { translation: es },
    it: { translation: it },
    fr: { translation: fr },
    nl: { translation: nl },
  },
  lng: defaultLng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
