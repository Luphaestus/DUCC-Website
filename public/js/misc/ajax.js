// AJAX utility functions using XMLHttpRequest

/**
 * Make an AJAX GET request
 * @param {string} url - The URL to fetch
 * @param {function} successCallback - Callback for successful response
 * @param {function} errorCallback - Callback for error
 */
function ajaxGet(url, successCallback, errorCallback) {
    const xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    successCallback(response);
                } catch (e) {
                    console.log('Failed to parse response:', e);
                    errorCallback('Failed to parse response: ' + e.message);
                }
            } else {
                console.log('Request failed with status:', xhr.status);
                errorCallback('Request failed with status: ' + xhr.status);
            }
        }
    };
    
    xhr.open('GET', url, true);
    xhr.send();
}

/**
 * Make an AJAX POST request
 * @param {string} url - The URL to post to
 * @param {object} data - The data to send
 * @param {function} successCallback - Callback for successful response
 * @param {function} errorCallback - Callback for error
 */
function ajaxPost(url, data, successCallback, errorCallback) {
    const xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    successCallback(response);
                } catch (e) {
                    errorCallback('Failed to parse response: ' + e.message);
                }
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    errorCallback(errorResponse.error || 'Request failed');
                } catch (e) {
                    errorCallback('Request failed with status: ' + xhr.status);
                }
            }
        }
    };
    
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
}

export { ajaxGet, ajaxPost };