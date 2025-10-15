// src/polyfills.ts

/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 */

import 'zone.js';

// Polyfills para MQTT en el navegador
(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
  version: '',
  nextTick: (fn: Function) => setTimeout(fn, 0)
};
(window as any).Buffer = (window as any).Buffer || require('buffer').Buffer;
