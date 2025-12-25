import { Event } from './event.js';

/**
 * Global Events for decoupled communication.
 */

// Notifies when a transaction has occurred and balances need to be refreshed
const BalanceChangedEvent = new Event();

export { BalanceChangedEvent };
