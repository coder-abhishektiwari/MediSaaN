import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import 'intl-pluralrules';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import mr from '../locales/mr.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import gu from '../locales/gu.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import pa from '../locales/pa.json';
import or from '../locales/or.json';
import ur from '../locales/ur.json';
import { createMMKV } from 'react-native-mmkv';
console.log('createMMKV function:', createMMKV);

const storage = createMMKV({ id: 'language-store' });

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en }, hi: { translation: hi }, bn: { translation: bn },
      mr: { translation: mr }, ta: { translation: ta }, te: { translation: te },
      gu: { translation: gu }, kn: { translation: kn }, ml: { translation: ml },
      pa: { translation: pa }, or: { translation: or }, ur: { translation: ur },
    },
    lng: storage.getString('app_language') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
