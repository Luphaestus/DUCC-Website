/**
 * Converts a numeric error code into a standardized error response object.
 * @param {number} code - The error code to convert.
 * @returns {object|boolean} An object containing `status` and `message` if the code is a number and recognized,
 *                           or `false` if the input is not a number.
 */
function errorCodetoResponse(code) {
    if (typeof code !== 'number' || typeof code === 'number' && code < 400 || code > 599) {
        return false;
    }
    switch (code) {
        case 401:
            return { status: 401, message: 'User not authenticated' };
        case 404:
            return { status: 404, message: 'User not found' };
        case 409:
            return { status: 409, message: 'User already exists' };
        case 500:
            return { status: 500, message: 'Internal server error' };
        default:
            return { status: 500, message: 'Unknown error' };
    }
}

module.exports = errorCodetoResponse;