/**
 * event.js
 * 
 * Lightweight Publish/Subscribe pattern.
 * Enables decoupled communication between different parts of the SPA,
 */

type EventCallback = (data?: any) => void;

class Event {
    subscribers: Set<EventCallback>;

    constructor() {
        /** @type {Set<Function>} List of registered callback functions */
        this.subscribers = new Set();
    }

    /**
     * Registers a callback function to be executed when the event is triggered.
     * 
     * @param {EventCallback} callback - The function to run on notification.
     * @returns {Function} - An unsubscribe function to remove this specific callback.
     */
    subscribe(callback: EventCallback): () => void {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    /**
     * Registers a callback that will only run once and then automatically unsubscribe.
     * 
     * @param {EventCallback} callback - The function to run on notification.
     * @returns {Function} - An unsubscribe function.
     */
    once(callback: EventCallback): () => void {
        const onceWrapper = (data?: any) => {
            callback(data);
            this.unsubscribe(onceWrapper);
        };
        return this.subscribe(onceWrapper);
    }

    /**
     * Removes a specific callback from the subscriber list.
     * 
     * @param {EventCallback} callback - The callback to delete.
     */
    unsubscribe(callback: EventCallback): void {
        this.subscribers.delete(callback);
    }

    /**
     * Triggers the event, executing all subscribed callbacks with the provided data.
     * 
     * @param {*} data - The payload to pass to subscribers.
     */
    notify(data?: any): void {
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
    clear(): void {
        this.subscribers.clear();
    }
}

export { Event };