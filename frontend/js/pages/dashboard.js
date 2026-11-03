
// ==========================================
// MEDILINK LABORATORY
// DASHBOARD JAVASCRIPT
// ==========================================

// 1. Get Dashboard Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const dashboardDate = document.getElementById('dashboardDate');
const logoutButton = document.getElementById('logoutButton');

const userNameElement = document.getElementById('userName');
const userRoleElement = document.getElementById('userRole');
const userAvatarElement = document.getElementById('userAvatar');

// 2. Display Current Date

function displayDashboardDate() {
    if (!dashboardDate) return;

    const currentDate = new Date();

    const formattedDate = new Intl.DateTimeFormat('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(currentDate);

    dashboardDate.textContent = formattedDate;
}

displayDashboardDate();

// 3. Format User Role

function formatUserRole(role) {
    const roleNames = {
        lab_admin: 'Laboratory Administrator',
        lab_receptionist: 'Laboratory Receptionist',
        lab_technologist: 'Laboratory Technologist',
        result_verifier: 'Result Verifier',
        requesting_clinician: 'Requesting Clinician'
    };

    return roleNames[role] ||
        String(role || 'Laboratory Personnel')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
}

// 4. Display Authenticated User Information

function displayUserInformation(user) {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    const fullName = `${firstName} ${lastName}`.trim()
        || user.username
        || user.email
        || 'User';

    if (userNameElement) {
        userNameElement.textContent = fullName;
    }

    if (userRoleElement) {
        userRoleElement.textContent = formatUserRole(user.role);
    }

    if (userAvatarElement) {
        userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
    }
}

// 5. Verify Authenticated Session

async function verifyDashboardSession() {
    try {
        const user = await window.MediLinkAuth.getCurrentUser();

        displayUserInformation(user);

    } catch (error) {
        console.error('Dashboard authentication failed:', error);

        if (error.status === 401) {
            window.location.replace('login.html');
            return;
        }

        alert(
            'Unable to verify your account. Please check your connection and refresh the page.'
        );
    }
}

// 6. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 7. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 8. Toggle Sidebar

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        const isOpen = appLayout.classList.contains('sidebar-open');

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

// 9. Close Sidebar When Overlay Is Clicked

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 10. Close Sidebar When Escape Is Pressed

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 11. Close Sidebar After Selecting a Navigation Link

const navigationLinks = document.querySelectorAll(
    '.sidebar-nav .nav-link'
);

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 12. Actual Backend Logout

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        const confirmLogout = window.confirm(
            'Are you sure you want to log out of MediLink?'
        );

        if (!confirmLogout) return;

        logoutButton.disabled = true;
        logoutButton.textContent = 'Logging Out...';

        try {
            await window.MediLinkAuth.logout();

            window.location.replace('login.html');

        } catch (error) {
            console.error('Logout failed:', error);

            alert(
                error.message || 'Unable to log out. Please try again.'
            );

            logoutButton.disabled = false;
            logoutButton.textContent = 'Logout';
        }
    });
}

// 13. Initialize Dashboard Authentication

verifyDashboardSession();
