import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App'; // Changed from './App'
import { ARABIC_STRINGS as AR } from './constants'; // For icsService.ts, though not directly used here.

// Add a polyfill for crypto.randomUUID if it's not available (e.g. older browsers or non-secure contexts)
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  // @ts-ignore
  crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Localization for date-fns if needed directly (App.tsx already imports ar-SA for format)
// Although format function in App.tsx directly uses specific locale,
// setting global locale can be done if many other date-fns functions are used without explicit locale.
// import { setDefaultOptions } from 'date-fns';
// import { arSA } from 'date-fns/locale';
// setDefaultOptions({ locale: arSA });


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);