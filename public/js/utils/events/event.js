/**
 * event.js
 * 
 * Lightweight Publish/Subscribe pattern.
 * Enables decoupled communication between different parts of the SPA,
 */

class Event {
    constructor() {
        /** @type {Set<Function>} List of registered callback functions */
        this.subscribers = new Set();
    }

    /**
     * Registers a callback function to be executed when the event is triggered.
     * 
     * @param {Function} callback - The function to run on notification.
     * @returns {Function} - An unsubscribe function to remove this specific callback.
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Registers a callback that will only run once and then automatically unsubscribe.
     * 
     * @param {Function} callback - The function to run on notification.
     * @returns {Function} - An unsubscribe function.
     */
    once(callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.unsubscribe(onceWrapper);
        };
        return this.subscribe(onceWrapper);
    }

    /**
     * Removes a specific callback from the subscriber list.
     * 
     * @param {Function} callback - The callback to delete.
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    /**
     * Triggers the event, executing all subscribed callbacks with the provided data.
     * 
     * @param {*} data - The payload to pass to subscribers.
     */
    notify(data) {
        this.subscribers.forEach(sub => {
            try {
                sub(data);
            } catch (error) {
                console.error("Error in event subscriber:", error);
            }
        });
    }

    /**
     * Removes all registered subscribers from this event.
     */
    clear() {
        this.subscribers.clear();
    }
}

export { Event };