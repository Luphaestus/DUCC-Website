function errorCodetoResponse(code) {
    if (typeof code !== 'number') {
        return false;
    }
    switch (code) {
        case 401:
            return { status: 401, message: 'User not authenticated' };
        case 404:
            return { status: 404, message: 'User not found' };
        case 500:
            return { status: 500, message: 'Internal server error' };
        default:
            return { status: 500, message: 'Unknown error' };
    }
}

module.exports = errorCodetoResponse;