/**
 * api.js
 * 
 * High-level wrapper for fetch providing a Promise-based API.
 */

import { updateConnectionStatus } from '../connection.js';
import { getCookie } from './utils.js';
import { NoInternetEvent } from './events/events.js';
import { notify, NotificationTypes } from '../components/notification';

/**
 * Cache for GET requests to reduce redundant network traffic.
 */
const cache = new Map<string, Promise<any>>();
// ... (rest of imports and cache logic)

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

    let gotResponse = false;
    const requestPromise = (async () => {
        try {
            const response = await fetch(url, options);
            gotResponse = true;
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
                const error = result || { message: 'Request failed with status: ' + response.status };
                
                if (response.status === 401) {
                    // Unauthorized: Redirect to login if not already there
                    if (!window.location.pathname.startsWith('/login')) {
                        if (window.solidNavigate) window.solidNavigate('/login');
                        else window.location.href = '/login';
                    }
                } else if (response.status === 403) {
                    // Forbidden: Redirect to unauthorised page only on GET requests
                    // For other methods (POST, etc.), we assume the caller will handle it (e.g., showing an error in a modal)
                    if (method === 'GET' && !window.location.pathname.startsWith('/unauthorised')) {
                        if (window.solidNavigate) window.solidNavigate('/unauthorised');
                        else window.location.href = '/unauthorised';
                    }
                    notify('Access Denied', error.message || 'You do not have permission to perform this action.', NotificationTypes.WARNING);
                } else if (response.status >= 500) {
                    notify('Server Error', error.message || 'An internal server error occurred.', NotificationTypes.ERROR);
                }

                throw error;
            }
        } catch (error: any) {
            if (error.name === 'AbortError') throw error;
            
            // Only update connection status to false if it's a network error (no response)
            if (!gotResponse) {
                updateConnectionStatus(false);
            }
            
            const finalError = error.message ? error : { message: 'Network error' };
            
            // If it's a generic network error (not a status-based one), notify
            if (!gotResponse || finalError.message === 'Network error') {
                notify('Network Error', 'Check your connection.', NotificationTypes.ERROR, 5000, 'network-error');
            }

            throw finalError;
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
            updateConnectionStatus(true);
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