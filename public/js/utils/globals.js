/**
 * globals.js
 * 
 * Central registry for global application state events.
 * Provides a shared communication channel for events that affect multiple unrelated modules.
 */

import { Event } from './event.js';

/**
 * Triggered whenever a financial transaction occurs (top-up, event join, etc.).
 * Subscribed to by the navbar and profile pages to refresh balance displays.
 * @type {Event}
 */
const BalanceChangedEvent = new Event();

export { BalanceChangedEvent };