// ==========================================
// MEDILINK LABORATORY
// DASHBOARD JAVASCRIPT
// ==========================================

(function () {
    'use strict';

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
        return roleNames[role] || String(role || 'Laboratory Personnel').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    function displayUserInformation(user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || 'User';
        if (userNameElement) userNameElement.textContent = fullName;
        if (userRoleElement) userRoleElement.textContent = formatUserRole(user.role);
        if (userAvatarElement) userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
    }

    // 4. Load Live Dashboard Data
    async function loadDashboardData() {
        try {
            // Hide the development preview notice since data is now live
            const notice = document.querySelector('.dashboard-notice');
            if (notice) notice.style.display = 'none';

            // Fetch Requests
            const reqResponse = await window.MediLinkAPI.request('/lab-requests?limit=100', { method: 'GET' });
            const allRequests = reqResponse.data.requests || [];
            const totalRequests = reqResponse.data.pagination.total;

            // Fetch Results (to count Awaiting Verification)
            const resResponse = await window.MediLinkAPI.request('/results', { method: 'GET' });
            const allResults = resResponse.data.results || [];

            // Calculate Numbers
            const pendingCount = allRequests.filter(r => ['draft', 'submitted', 'accepted'].includes(r.status)).length;
            const inProgressCount = allRequests.filter(r => ['in_progress', 'partially_completed'].includes(r.status)).length;
            const completedCount = allRequests.filter(r => r.status === 'completed').length;
            const awaitingVerificationCount = allResults.filter(r => r.status === 'pending_verification').length;

            // Update the Summary Cards
            if (document.getElementById('totalRequests')) document.getElementById('totalRequests').textContent = totalRequests;
            if (document.getElementById('pendingRequests')) document.getElementById('pendingRequests').textContent = pendingCount;
            if (document.getElementById('inProgressRequests')) document.getElementById('inProgressRequests').textContent = inProgressCount;
            if (document.getElementById('awaitingVerification')) document.getElementById('awaitingVerification').textContent = awaitingVerificationCount;
            if (document.getElementById('completedRequests')) document.getElementById('completedRequests').textContent = completedCount;

            // Populate the Recent Requests Table (top 5 only)
            populateRecentTable(allRequests.slice(0, 5));

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    // 5. Populate Recent Requests Table
    function populateRecentTable(requests) {
        const tbody = document.getElementById('recentRequestsTableBody');
        if (!tbody) return;

        tbody.replaceChildren();

        if (requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <div class="empty-state-icon">▤</div>
                            <h3 class="empty-state-title">No laboratory requests yet</h3>
                            <p class="empty-state-description">Laboratory request records will appear here when available.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        requests.forEach(req => {
            const tr = document.createElement('tr');
            
            const dateStr = new Date(req.createdAt).toLocaleDateString();
            const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown';
            
            // Priority classes matching your CSS
            const priorityClass = req.priority === 'stat' ? 'priority-stat' : req.priority === 'urgent' ? 'priority-urgent' : 'priority-routine';
            const statusLabel = req.status.replace('_', ' ').toUpperCase();
            
            // Badge styling based on your CSS
            const badgeClass = req.status === 'completed' ? 'badge-success' : req.status === 'in_progress' ? 'badge-progress' : 'badge-pending';

            tr.innerHTML = `
                <td>${req.requestNumber}</td>
                <td>${patientName}</td>
                <td>${dateStr}</td>
                <td>${req.tests ? req.tests.length : 0}</td>
                <td><span class="${priorityClass}">${req.priority.toUpperCase()}</span></td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 6. Verify Session & Initialize
    async function verifyDashboardSession() {
        try {
            const user = await window.MediLinkAuth.getCurrentUser();
            displayUserInformation(user);
            
            // Load the data after verifying the user
            await loadDashboardData();

        } catch (error) {
            console.error('Dashboard authentication failed:', error);
            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }
            alert('Unable to verify your account. Please check your connection and refresh the page.');
        }
    }

    // 7. Sidebar Logic
    function openSidebar() {
        if (!appLayout || !sidebarToggle) return;
        appLayout.classList.add('sidebar-open');
        sidebarToggle.setAttribute('aria-expanded', 'true');
        sidebarToggle.setAttribute('aria-label', 'Close navigation');
    }

    function closeSidebar() {
        if (!appLayout || !sidebarToggle) return;
        appLayout.classList.remove('sidebar-open');
        sidebarToggle.setAttribute('aria-expanded', 'false');
        sidebarToggle.setAttribute('aria-label', 'Open navigation');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isOpen = appLayout.classList.contains('sidebar-open');
            isOpen ? closeSidebar() : openSidebar();
        });
    }

    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.addEventListener('click', closeSidebar));

    // 8. Logout Logic
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const confirmLogout = window.confirm('Are you sure you want to log out of MediLink?');
            if (!confirmLogout) return;
            logoutButton.disabled = true;
            logoutButton.textContent = 'Logging Out...';
            try {
                await window.MediLinkAuth.logout();
                window.location.replace('login.html');
            } catch (error) {
                console.error('Logout failed:', error);
                alert(error.message || 'Unable to log out. Please try again.');
                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }
        });
    }

    // Initialize
    verifyDashboardSession();

})();