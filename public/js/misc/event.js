/**
 * Lightweight Pub/Sub implementation for decoupled communication.
 */
class Event {
    constructor() {
        this.subscribers = new Set();
    }

    /**
     * Subscribe to the event.
     * @param {Function} callback
     * @returns {Function} Unsubscribe handle.
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Subscribe for a single execution.
     * @param {Function} callback
     * @returns {Function} Unsubscribe handle.
     */
    once(callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.unsubscribe(onceWrapper);
        };
        return this.subscribe(onceWrapper);
    }

    /**
     * Unsubscribe a callback.
     * @param {Function} callback
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    /**
     * Trigger the event, notifying all subscribers.
     * @param {*} data - Payload.
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
     * Remove all subscribers.
     */
    clear() {
        this.subscribers.clear();
    }
}

export { Event };