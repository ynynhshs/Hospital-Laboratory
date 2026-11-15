(function () {
    'use strict';

    document.querySelectorAll('.password-visibility-toggle').forEach((toggle) => {
        const passwordInput = document.getElementById(
            toggle.getAttribute('aria-controls')
        );
        const visibleIcon = toggle.querySelector('.eye-icon-on');
        const hiddenIcon = toggle.querySelector('.eye-icon-off');

        if (!passwordInput || !visibleIcon || !hiddenIcon) {
            console.error('Password visibility toggle is missing a target or icon.');
            return;
        }

        toggle.addEventListener('click', () => {
            const passwordIsVisible = passwordInput.type === 'password';

            passwordInput.type = passwordIsVisible ? 'text' : 'password';
            toggle.setAttribute('aria-pressed', String(passwordIsVisible));
            toggle.setAttribute(
                'aria-label',
                passwordIsVisible ? 'Hide password' : 'Show password'
            );
            visibleIcon.hidden = !passwordIsVisible;
            hiddenIcon.hidden = passwordIsVisible;
            passwordInput.focus();
        });
    });
})();
