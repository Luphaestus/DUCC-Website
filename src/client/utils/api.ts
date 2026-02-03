/**
 * api.js
 * 
 * High-level wrapper for XMLHttpRequest providing a Promise-based API.
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
function apiRequest(method: string, url: string, data: any = null): Promise<any> {

    if (method === 'GET') {
        if (data === true) {
            if (cache.has(url)) return cache.get(url)!;
        } else {
            clearApiCache(data);
        }
    } else {
        clearApiCache();
    }


    const requestPromise = new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    updateConnectionStatus(false);
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    updateConnectionStatus(true);
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e: any) {
                        const snippet = xhr.responseText.slice(0, 50);
                        console.error(`API Parse Error [${method} ${url}]:`, xhr.responseText);
                        reject({ message: `Failed to parse response: ${e.message}. Content: ${snippet}...` });
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(errorResponse);
                    } catch (e) {
                        reject({ message: 'Request failed with status: ' + xhr.status });
                    }
                }
            }
        };

        xhr.onerror = function () {
            updateConnectionStatus(false);
            reject({ message: 'Network error' });
        };

        xhr.open(method, url, true);

        if (method !== 'GET') {
            const csrfToken = getCookie('XSRF-TOKEN');
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            }
        }

        if (method !== 'GET' && data) {
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    });

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
 * Uploads a file to the server using XHR to support progress tracking.
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