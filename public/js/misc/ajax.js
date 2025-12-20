import { checkServerConnection } from '../connection.js';

/**
 * Make an AJAX GET request
 * @param {string} url - The URL to fetch
 * @returns {Promise<object>} A promise that resolves with the response data or rejects with an error.
 */
async function ajaxGet(url) {
    checkServerConnection();
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
 * Make an AJAX POST request
 * @param {string} url - The URL to post to
 * @param {object} data - The data to send
 * @returns {Promise<object>} A promise that resolves with the response data or rejects with an error.
 */
async function ajaxPost(url, data) {
    checkServerConnection();
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

export { ajaxGet, ajaxPost };