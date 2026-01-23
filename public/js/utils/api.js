//todo refine
/**
 * api.js
 * 
 * High-level wrapper for XMLHttpRequest providing a Promise-based API.
 * Includes support for response caching, automatic connectivity reporting,
 * and standard HTTP method implementations (GET, POST, PUT, DELETE).
 * 
 * Used by all page and component modules to communicate with the backend API.
 */

import { updateConnectionStatus } from '../connection.js';

/**
 * Cache for GET requests to reduce redundant network traffic.
 * @type {Map<string, Promise<object>>}
 */
const cache = new Map();

/**
 * Manually clear the API GET cache.
 * Generally called after write operations (POST/PUT/DELETE) to ensure data freshness.
 * @param {string|boolean} [url] - If a string, clears only that specific URL. 
 *                                 If false or omitted, clears the entire cache.
 */
function clearApiCache(url) {
    if (url && typeof url === 'string') cache.delete(url);
    else cache.clear();
}

/**
 * Universal function to perform XHR requests.
 * Encapsulates common logic for connection status updates, error handling, and response parsing.
 * 
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
 * @param {string} url - Target URL.
 * @param {any} [data=null] - Json Payload, or cache controls for GET requests.
* @returns {Promise<object>}
 */
function apiRequest(method, url, data = null) {
    
    if (method === 'GET') {
        if (data === true) if (cache.has(url)) return cache.get(url);
        else clearApiCache(data);
    } else clearApiCache();


    const requestPromise = new Promise((resolve, reject) => {
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
                    } catch (e) {
                        reject({ message: 'Failed to parse response: ' + e.message });
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

/**
 * Uploads a file to the server using XHR to support progress tracking.
 * 
 * @param {File} file - The file object to upload.
 * @param {object} options - Upload options.
 * @param {string} [options.visibility='events'] - Visibility of the uploaded file.
 * @param {string} [options.title] - Title for the uploaded file metadata.
 * @param {string} [options.categoryId] - Optional category ID.
 * @param {Function} [options.onProgress] - Callback for upload progress (0-100).
 * @returns {Promise<number>} - The ID of the uploaded file.
 */
async function uploadFile(file, options = {}) {
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

        if (options.onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    options.onProgress(percent);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status === 201) {
                const result = JSON.parse(xhr.responseText);
                if (result.success && result.ids.length > 0) {
                    resolve(result.ids[0]);
                } else {
                    reject(new Error('Upload succeeded but no ID returned'));
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