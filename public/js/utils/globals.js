import { Event } from './event.js';

/**
 * Global events for inter-module communication.
 */

// Fired when a transaction occurs and balances need refreshing
const BalanceChangedEvent = new Event();

export { BalanceChangedEvent };