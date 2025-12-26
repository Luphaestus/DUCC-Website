import { checkServerConnection } from '../connection.js';

/**
 * Wrapper for XMLHttpRequest using Promises.
 * @module Ajax
 */

/**
 * HTTP GET request.
 * @param {string} url
 * @returns {Promise<object>}
 */
async function ajaxGet(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject('Failed to parse response: ' + e.message);
                    }
                } else {
                    reject('Request failed with status: ' + xhr.status);
                }
            }
        };

        xhr.open('GET', url, true);
        xhr.send();
    });
}

/**
 * HTTP POST request with JSON body.
 * @param {string} url
 * @param {object} data
 * @returns {Promise<object>}
 */
async function ajaxPost(url, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject('Failed to parse response: ' + e.message);
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(errorResponse.message || 'Request failed');
                    } catch (e) {
                        reject('Request failed with status: ' + xhr.status);
                    }
                }
            }
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
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject('Failed to parse response: ' + e.message);
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(errorResponse.message || 'Request failed');
                    } catch (e) {
                        reject('Request failed with status: ' + xhr.status);
                    }
                }
            }
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
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject('Failed to parse response: ' + e.message);
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(errorResponse.message || 'Request failed');
                    } catch (e) {
                        reject('Request failed with status: ' + xhr.status);
                    }
                }
            }
        };

        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(data));
    });
}
export { ajaxGet, ajaxPost, ajaxDelete, ajaxPut };