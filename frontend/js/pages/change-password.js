(function () {
    'use strict';

    const form = document.getElementById('changePasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const generatePasswordButton = document.getElementById('generatePassword');
    const strengthMeter = document.getElementById('passwordStrengthMeter');
    const strengthText = document.getElementById('passwordStrengthText');
    const message = document.getElementById('passwordMessage');
    const submitButton = document.getElementById('changePasswordButton');

    if (
        !form ||
        !currentPasswordInput ||
        !newPasswordInput ||
        !generatePasswordButton ||
        !strengthMeter ||
        !strengthText ||
        !message ||
        !submitButton
    ) {
        console.error('Password change page elements could not be found.');
        return;
    }

    const strengthLabels = [
        'No password entered',
        'Getting started',
        'Fair',
        'Good',
        'Strong'
    ];

    function showMessage(text, kind) {
        message.textContent = text;
        message.dataset.kind = kind;
        message.hidden = false;
    }

    function clearMessage() {
        message.textContent = '';
        message.hidden = true;
        delete message.dataset.kind;
    }

    function getPasswordStrength(password) {
        if (!password) return 0;

        let score = 0;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) score += 1;
        return Math.min(score, 4);
    }

    function updateStrength() {
        const score = getPasswordStrength(newPasswordInput.value);
        const label = strengthLabels[score];

        strengthMeter.dataset.strength = String(score);
        newPasswordInput.dataset.strength = String(score);
        strengthMeter.setAttribute('aria-valuenow', String(score));
        strengthMeter.setAttribute('aria-valuetext', label);
        strengthText.textContent = newPasswordInput.value
            ? `Password strength: ${label.toLowerCase()}.`
            : 'Choose a password to see its strength.';
    }

    function randomIndex(max) {
        const range = 0x100000000;
        const limit = range - (range % max);
        const values = new Uint32Array(1);
        let value;

        do {
            window.crypto.getRandomValues(values);
            value = values[0];
        } while (value >= limit);

        return value % max;
    }

    function secureCharacter(characters) {
        return characters[randomIndex(characters.length)];
    }

    function generatePassword() {
        if (!window.crypto || !window.crypto.getRandomValues) {
            showMessage(
                'Secure password generation is not available in this browser.',
                'error'
            );
            return;
        }

        const groups = [
            'abcdefghijkmnopqrstuvwxyz',
            'ABCDEFGHJKLMNPQRSTUVWXYZ',
            '23456789',
            '!@#$%^&*()-_=+[]{}?'
        ];
        const allCharacters = groups.join('');
        const characters = groups.map(secureCharacter);

        while (characters.length < 20) {
            characters.push(secureCharacter(allCharacters));
        }

        for (let index = characters.length - 1; index > 0; index -= 1) {
            const swapIndex = randomIndex(index + 1);
            [characters[index], characters[swapIndex]] = [
                characters[swapIndex],
                characters[index]
            ];
        }

        newPasswordInput.value = characters.join('');
        newPasswordInput.focus();
        updateStrength();
        clearMessage();
    }

    newPasswordInput.addEventListener('input', () => {
        clearMessage();
        updateStrength();
    });

    generatePasswordButton.addEventListener('click', generatePassword);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();

        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        try {
            const response = await window.MediLinkAuth.changePassword(
                currentPasswordInput.value,
                newPasswordInput.value
            );

            form.reset();
            updateStrength();
            showMessage(
                response.message || 'Password updated. Please sign in again.',
                'success'
            );

            window.setTimeout(() => {
                window.location.replace('login.html');
            }, 1800);
        } catch (error) {
            console.error('Password change failed:', error);
            showMessage(
                error.message || 'Unable to update your password. Please try again.',
                'error'
            );
            currentPasswordInput.focus();
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Update password';
        }
    });

    updateStrength();
})();
