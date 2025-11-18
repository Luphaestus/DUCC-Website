/**
 * Custom event system.
 */
class Event {
    constructor() {
        this.subscribers = new Set();
    }

    /**
     * Subscribe to the event.
     * @param {Function} callback The function to call when the event is notified.
     * @returns {Function} A function to call to unsubscribe.
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Subscribe to an event for only one notification.
     * @param {Function} callback The function to call when the event is notified.
     * @returns {Function} A function to call to unsubscribe.
     */
    once(callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.unsubscribe(onceWrapper);
        };
        return this.subscribe(onceWrapper);
    }

    /**
     * Unsubscribe from the event.
     * @param {Function} callback The callback to remove.
     * @returns {Function} A function to call to subscribe.
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
        return () => this.subscribe(callback);
    }

    /**
     * Notify all subscribers.
     * @param {*} data The data to pass to the subscribers.
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

export default Event;