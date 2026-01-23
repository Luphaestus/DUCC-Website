/**
 * ajax.js
 * 
 * High-level wrapper for XMLHttpRequest providing a Promise-based API.
 * Includes support for response caching, automatic connectivity reporting,
 * and standard HTTP method implementations (GET, POST, PUT, DELETE).
 * 
 * Used by all page and component modules to communicate with the backend API.
 */

import { reportConnectionFailure, reportConnectionSuccess } from '../connection.js';

/**
 * Cache for GET requests to reduce redundant network traffic.
 * @type {Map<string, Promise<object>>}
 */
const cache = new Map();

/**
 * Perform an asynchronous HTTP GET request.
 * 
 * @param {string} url - The target API endpoint.
 * @param {boolean} [useCache=false] - If true, returns a cached promise if available.
 * @returns {Promise<object>} - Resolves with the parsed JSON response.
 */
async function ajaxGet(url, useCache = false) {
    // Return from cache if requested and present
    if (useCache && cache.has(url)) {
        return cache.get(url);
    }

    const promise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    // Handle network-level failures (e.g., DNS, connection lost)
                    reportConnectionFailure();
                    cache.delete(url);
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    // Successful response
                    reportConnectionSuccess();
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        cache.delete(url);
                        reject({ message: 'Failed to parse response: ' + e.message });
                    }
                } else {
                    // HTTP error status (4xx, 5xx)
                    cache.delete(url);
                    reject({ message: 'Request failed with status: ' + xhr.status });
                }
            }
        };

        xhr.onerror = function () {
            reportConnectionFailure();
            cache.delete(url);
            reject({ message: 'Network error' });
        };

        xhr.open('GET', url, true);
        xhr.send();
    });

    if (useCache) {
        cache.set(url, promise);
    }

    return promise;
}

/**
 * Manually clear the AJAX GET cache.
 * Generally called after write operations (POST/PUT/DELETE) to ensure data freshness.
 * @param {string} [url] - If provided, clears only the specific URL.
 */
function clearAjaxCache(url) {
    if (url) cache.delete(url);
    else cache.clear();
}

/**
 * Perform an asynchronous HTTP POST request.
 * Clears the entire GET cache to prevent stale data display after state changes.
 * 
 * @param {string} url - Target endpoint.
 * @param {object} data - JSON payload to send in the request body.
 * @returns {Promise<object>}
 */
async function ajaxPost(url, data) {
    clearAjaxCache();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    reportConnectionFailure();
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    reportConnectionSuccess();
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject({ message: 'Failed to parse response: ' + e.message });
                    }
                } else {
                    // Attempt to parse error message from server
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
            reportConnectionFailure();
            reject({ message: 'Network error' });
        };

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(data));
    });
}

/**
 * Perform an asynchronous HTTP DELETE request.
 * @param {string} url - Target endpoint.
 * @returns {Promise<object>}
 */
async function ajaxDelete(url) {
    clearAjaxCache();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    reportConnectionFailure();
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    reportConnectionSuccess();
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
            reportConnectionFailure();
            reject({ message: 'Network error' });
        };

        xhr.open('DELETE', url, true);
        xhr.send();
    });
}

/**
 * Perform an asynchronous HTTP PUT request.
 * @param {string} url - Target endpoint.
 * @param {object} data - JSON update payload.
 * @returns {Promise<object>}
 */
async function ajaxPut(url, data) {
    clearAjaxCache();
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    reportConnectionFailure();
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    reportConnectionSuccess();
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
            reportConnectionFailure();
            reject({ message: 'Network error' });
        };

        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(data));
    });
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
            reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
    });
}


export { ajaxGet, ajaxPost, ajaxDelete, ajaxPut, clearAjaxCache, uploadFile };