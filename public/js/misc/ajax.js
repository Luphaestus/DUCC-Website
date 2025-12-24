import { checkServerConnection } from '../connection.js';

/**
 * Ajax Module.
 * Provides a standardized way to perform asynchronous HTTP requests using XMLHttpRequest.
 * Wraps common HTTP verbs in Promises for easier consumption with async/await.
 */

/**
 * Performs an HTTP GET request.
 * @param {string} url - Target URL.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function ajaxGet(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // Request complete
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
 * Performs an HTTP POST request with a JSON body.
 * @param {string} url - Target URL.
 * @param {object} data - Object to be stringified and sent as body.
 * @returns {Promise<object>} Parsed JSON response.
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
                        console.log(xhr.responseText);
                        reject('Failed to parse response: ' + e.message);
                    }
                } else {
                    // Try to extract error message from response body
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
 * Performs an HTTP DELETE request.
 * @param {string} url - Target URL.
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
 * Performs an HTTP PUT request with a JSON body.
 * @param {string} url - Target URL.
 * @param {object} data - Data to send.
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