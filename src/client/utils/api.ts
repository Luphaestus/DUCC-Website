/**
 * api.js
 * 
 * High-level wrapper for fetch providing a Promise-based API.
 */

import { updateConnectionStatus } from '../connection.js';
import { getCookie } from './utils.js';
import { NoInternetEvent } from './events/events.js';

/**
 * Cache for GET requests to reduce redundant network traffic.
 */
const cache = new Map<string, Promise<any>>();

/**
 * Manually clear the API GET cache.
 */
function clearApiCache(url?: string | boolean): void {
    if (url && typeof url === 'string') cache.delete(url);
    else cache.clear();
}

NoInternetEvent.subscribe(() => {
    clearApiCache();
});

/**
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
 * @param {string} url - Target URL.
 * @param {any} [data=null] - Json Payload, or cache controls for GET requests.
 * @returns {Promise<any>}
 */
async function apiRequest(method: string, url: string, data: any = null): Promise<any> {
    if (method === 'GET') {
        if (data === true) {
            if (cache.has(url)) return cache.get(url)!;
        } else if (data !== undefined && data !== null) {
            clearApiCache(data);
        }
    } else {
        clearApiCache();
    }

    const options: RequestInit = {
        method,
        headers: {}
    };

    if (method !== 'GET') {
        const csrfToken = getCookie('XSRF-TOKEN');
        if (csrfToken) {
            (options.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
        }
        if (data) {
            (options.headers as Record<string, string>)['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
    }

    const requestPromise = (async () => {
        try {
            const response = await fetch(url, options);
            updateConnectionStatus(true);
            
            const text = await response.text();
            if (!text && response.status >= 200 && response.status < 300) {
                return {};
            }

            let result;
            try {
                result = JSON.parse(text);
            } catch (e: any) {
                if (response.ok) {
                    console.error(`API Parse Error [${method} ${url}]:`, text);
                    throw { message: `Failed to parse response: ${e.message}. Content: ${text.slice(0, 50)}...` };
                } else {
                    throw { message: `Request failed with status ${response.status}: ${text.slice(0, 100)}` };
                }
            }

            if (response.ok) {
                return result;
            } else {
                // If the server responded with an error, it's NOT a connection loss
                throw result || { message: 'Request failed with status: ' + response.status };
            }
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            
            // Only update connection status to false if it's a network error (no response)
            // If the error has a 'message' that starts with 'Request failed with status', it's a server response.
            if (!error.message || !error.message.startsWith('Request failed with status')) {
                updateConnectionStatus(false);
            }
            
            throw error.message ? error : { message: 'Network error' };
        }
    })();

    if (method === 'GET' && data === true) {
        const cachedPromise = requestPromise.catch(err => {
            cache.delete(url);
            throw err;
        });
        cache.set(url, cachedPromise);
        return cachedPromise;
    }

    return requestPromise;
}

interface UploadOptions {
    visibility?: string;
    title?: string;
    categoryId?: string;
    onProgress?: (percent: number) => void;
}

/**
 * Uploads a file to the server using XMLHttpRequest to support progress tracking.
 */
async function uploadFile(file: File, options: UploadOptions = {}): Promise<number | null> {
    if (!file) return null;

    const visibility = options.visibility || 'events';
    const title = options.title || `${file.name.split('.')[0]} - ${Date.now()}`;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('visibility', visibility);
    formData.append('title', title);
    if (options.categoryId) {
        formData.append('categoryId', options.categoryId);
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files', true);

        const csrfToken = getCookie('XSRF-TOKEN');
        if (csrfToken) {
            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        }

        if (options.onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    options.onProgress!(percent);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status === 201) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success && result.ids.length > 0) {
                        resolve(result.ids[0]);
                    } else {
                        reject(new Error('Upload succeeded but no ID returned'));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse upload response'));
                }
            } else {
                reject(new Error('Upload failed: ' + xhr.status));
            }
        };

        xhr.onerror = () => {
            updateConnectionStatus(false);
            reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
    });
}


export { apiRequest, clearApiCache, uploadFile };