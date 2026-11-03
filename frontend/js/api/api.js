// ==========================================
// MEDILINK LABORATORY
// SHARED API CLIENT
// ==========================================

(function () {
    'use strict';

    const API_BASE_URL = '/api/v1';

    async function apiRequest(endpoint, options = {}) {
        const headers = {
            Accept: 'application/json',
            ...(options.headers || {})
        };

        const requestOptions = {
            ...options,
            credentials: 'same-origin',
            headers
        };

        // Automatically convert JavaScript objects into JSON.
        if (
            options.body !== undefined &&
            typeof options.body !== 'string' &&
            !(options.body instanceof FormData)
        ) {
            requestOptions.body = JSON.stringify(options.body);
            headers['Content-Type'] = 'application/json';
        }

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}${endpoint}`,
                requestOptions
            );
        } catch (error) {
            throw new Error(
                'Unable to connect to the MediLink server. Please check your connection.'
            );
        }

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            const apiError = new Error(
                data.message || 'An unexpected server error occurred.'
            );

            apiError.status = response.status;
            apiError.data = data;

            throw apiError;
        }

        return data;
    }

    // Make the API utility available to other frontend scripts.
    window.MediLinkAPI = {
        request: apiRequest
    };

})();