/**
 * Event Module.
 * Implements a lightweight Observer (Pub/Sub) pattern.
 * This is used for decoupled communication between different parts of the frontend
 * (e.g., notifying the navbar when a login occurs).
 */
class Event {
    constructor() {
        /** @type {Set<Function>} Stores the unique callback functions for this event */
        this.subscribers = new Set();
    }

    /**
     * Registers a callback function to be executed when the event is notified.
     * @param {Function} callback - The function to call.
     * @returns {Function} An unsubscribe function that removes the callback when called.
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Registers a callback that will be executed only ONCE.
     * Automatically unsubscribes after the first execution.
     * @param {Function} callback - The function to call.
     * @returns {Function} An unsubscribe function.
     */
    once(callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.unsubscribe(onceWrapper);
        };
        return this.subscribe(onceWrapper);
    }

    /**
     * Removes a specific callback from the subscription list.
     * @param {Function} callback - The callback to remove.
     * @returns {Function} A reference back to subscribe for chaining (optional).
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
        return () => this.subscribe(callback);
    }

    /**
     * Executes all registered callback functions with the provided data.
     * Wraps calls in try-catch to ensure one failing subscriber doesn't break others.
     * @param {*} data - Payload to pass to each subscriber.
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
     * Removes all registered subscribers for this event.
     */
    clear() {
        this.subscribers.clear();
    }
}

export { Event };