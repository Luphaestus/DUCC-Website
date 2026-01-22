import { checkServerConnection, reportConnectionFailure, reportConnectionSuccess } from '../connection.js';

/**
 * Wrapper for XMLHttpRequest using Promises.
 * @module Ajax
 */

const cache = new Map();

/**
 * HTTP GET request with optional caching.
 * @param {string} url
 * @param {boolean} useCache - If true, return cached response if available.
 * @returns {Promise<object>}
 */
async function ajaxGet(url, useCache = false) {
    if (useCache && cache.has(url)) {
        return cache.get(url);
    }

    const promise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 0) {
                    reportConnectionFailure();
                    cache.delete(url); 
                    reject({ message: 'Network error' });
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    reportConnectionSuccess();
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        cache.delete(url);
                        reject({ message: 'Failed to parse response: ' + e.message });
                    }
                } else {
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
 * Clear the AJAX GET cache.
 * @param {string} [url] - If provided, clear only this URL.
 */
function clearAjaxCache(url) {
    if (url) cache.delete(url);
    else cache.clear();
}

/**
 * HTTP POST request with JSON body.
 * @param {string} url
 * @param {object} data
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
 * HTTP DELETE request.
 * @param {string} url
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
 * HTTP PUT request with JSON body.
 * @param {string} url
 * @param {object} data
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
export { ajaxGet, ajaxPost, ajaxDelete, ajaxPut, clearAjaxCache };