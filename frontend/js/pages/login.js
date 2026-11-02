
// MediLink Login Page
// Authentication will be connected during Phase 4.

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    loginMessage.textContent =
        'Authentication is not yet enabled. It will be connected during Phase 4.';

    loginMessage.hidden = false;
});
