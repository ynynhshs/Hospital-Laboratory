// ==========================================
// MEDILINK LABORATORY
// FRONTEND AUTHENTICATION UTILITY
// ==========================================

(function () {
    'use strict';

    // Authenticate a user using username/email and password.
    async function login(identifier, password) {
        const response = await window.MediLinkAPI.request(
            '/auth/login',
            {
                method: 'POST',
                body: {
                    identifier,
                    password
                }
            }
        );

        return response.data.user;
    }

    // Retrieve the currently authenticated user.
    async function getCurrentUser() {
        const response = await window.MediLinkAPI.request(
            '/auth/me',
            {
                method: 'GET'
            }
        );

        return response.data.user;
    }

    // End the current authenticated session.
    async function logout() {
        return await window.MediLinkAPI.request(
            '/auth/logout',
            {
                method: 'POST'
            }
        );
    }

    // Make authentication functions available to other scripts.
    window.MediLinkAuth = {
        login,
        getCurrentUser,
        logout
    };

})();