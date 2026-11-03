// ==========================================
// MEDILINK LABORATORY
// LOGIN PAGE
// ==========================================

(function () {
    'use strict';

    const loginForm = document.getElementById('loginForm');
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('loginMessage');

    if (
        !loginForm ||
        !identifierInput ||
        !passwordInput ||
        !loginMessage
    ) {
        console.error('Login page elements could not be found.');
        return;
    }

    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    // Display a login message.
    function showMessage(message) {
        loginMessage.textContent = message;
        loginMessage.hidden = false;
    }

    // Hide the login message.
    function hideMessage() {
        loginMessage.textContent = '';
        loginMessage.hidden = true;
    }

    // Handle login form submission.
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        hideMessage();

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            showMessage('Please enter your username/email and password.');
            return;
        }

        // Prevent repeated submissions.
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Signing In...';
        }

        try {
            // Authenticate using the backend.
            await window.MediLinkAuth.login(
                identifier,
                password
            );

            // Redirect after successful login.
            window.location.replace('dashboard.html');

        } catch (error) {
            console.error('Login failed:', error);

            showMessage(
                error.message || 'Unable to sign in. Please try again.'
            );

            passwordInput.value = '';
            passwordInput.focus();

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
            }
        }
    });

})();