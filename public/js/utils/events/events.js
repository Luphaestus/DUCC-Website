/**
 * events.js
 * 
 * File defining all events. ( Saves time looking for them! )
 */

import { Event } from './event.js';

/**
 * Triggered whenever a financial transaction occurs.
 * @type {Event}
 */
const BalanceChangedEvent = new Event();


/** 
 * Fired when the user's first name is changed in the profile.
 * @type {Event} 
 */
const FirstNameChangedEvent = new Event();

/** 
 * Fired when the legal waiver is saved. 
 * @type {Event} 
 */
const LegalEvent = new Event();


/** 
 * Fired when the user logs in
 * @type {Event}
 */
const LoginEvent = new Event();

/**
 * Event fired whenever the view successfully changes.
 * @type {Event}
 */
const ViewChangedEvent = new Event();

/**
 * Event fired when the user changes their attendance / waitlist status.
 * @type {Event}
 */
const EventAttendanceChangedEvent = new Event();

/**
 * Event fired when the connection to the server is lost.
 * @type {Event}
 */
const NoInternetEvent = new Event();

export { BalanceChangedEvent, FirstNameChangedEvent, LegalEvent, LoginEvent, ViewChangedEvent, EventAttendanceChangedEvent, NoInternetEvent };