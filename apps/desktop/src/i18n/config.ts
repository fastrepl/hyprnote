import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your translation files
import enTranslations from './locales/en.json';
import koTranslations from './locales/ko.json';
import jaTranslations from './locales/ja.json';
import zhCNTranslations from './locales/zh-CN.json';
import zhTWTranslations from './locales/zh-TW.json';
import esTranslations from './locales/es.json';
import hiTranslations from './locales/hi.json';
import taTranslations from './locales/ta.json';
import ptBRTranslations from './locales/pt-BR.json';
import ptPTTranslations from './locales/pt-PT.json';
import frFRTranslations from './locales/fr-FR.json';
import frCATranslations from './locales/fr-CA.json';
import itTranslations from './locales/it.json';
import deTranslations from './locales/de.json';
import nlTranslations from './locales/nl.json';
import plTranslations from './locales/pl.json';
import svTranslations from './locales/sv.json';
import noTranslations from './locales/no.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      ko: {
        translation: koTranslations,
      },
      ja: {
        translation: jaTranslations,
      },
      'zh-CN': {
        translation: zhCNTranslations,
      },
      'zh-TW': {
        translation: zhTWTranslations,
      },
      es: {
        translation: esTranslations,
      },
      hi: {
        translation: hiTranslations,
      },
      ta: {
        translation: taTranslations,
      },
      'pt-BR': {
        translation: ptBRTranslations,
      },
      'pt-PT': {
        translation: ptPTTranslations,
      },
      'fr-FR': {
        translation: frFRTranslations,
      },
      'fr-CA': {
        translation: frCATranslations,
      },
      it: {
        translation: itTranslations,
      },
      de: {
        translation: deTranslations,
      },
      nl: {
        translation: nlTranslations,
      },
      pl: {
        translation: plTranslations,
      },
      sv: {
        translation: svTranslations,
      },
      no: {
        translation: noTranslations,
      }
    },
    lng: localStorage.getItem('language') || 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
