
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

// 3. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 4. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 5. Toggle Sidebar

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

// 6. Close Sidebar When Overlay Is Clicked

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 7. Close Sidebar When Escape Is Pressed

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 8. Close Sidebar After Selecting a Navigation Link

const navigationLinks = document.querySelectorAll('.sidebar-nav .nav-link');

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 9. Temporary Logout Navigation

if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        const confirmLogout = window.confirm(
            'Return to the MediLink login page? Actual account logout will be enabled during Phase 4.'
        );

        if (confirmLogout) {
            window.location.href = 'login.html';
        }
    });
}
