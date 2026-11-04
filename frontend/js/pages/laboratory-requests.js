
 
// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUESTS JAVASCRIPT
// API-INTEGRATED VERSION
// ==========================================

(function () {
    'use strict';

    // ==========================================
    // 1. GET PAGE ELEMENTS
    // ==========================================

    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const requestSearch = document.getElementById('requestSearch');
    const requestStatusFilter = document.getElementById('requestStatusFilter');
    const requestPriorityFilter = document.getElementById('requestPriorityFilter');
    const resetRequestFiltersButton =
        document.getElementById('resetRequestFiltersButton');

    const createRequestButton =
        document.getElementById('createRequestButton');

    const tableBody =
        document.getElementById('laboratoryRequestsTableBody');

    const recordCount =
        document.getElementById('requestRecordCount');

    const requestNotice =
        document.querySelector('.request-notice');

    const totalRequestsCount =
        document.getElementById('totalRequestsCount');

    const pendingRequestsCount =
        document.getElementById('pendingRequestsCount');

    const inProgressRequestsCount =
        document.getElementById('inProgressRequestsCount');

    const completedRequestsCount =
        document.getElementById('completedRequestsCount');

    const userNameElement =
        document.querySelector('.topbar-user .user-name');

    const userRoleElement =
        document.querySelector('.topbar-user .user-role');

    const userAvatarElement =
        document.querySelector('.topbar-user .user-avatar');

    // Create pagination container.
    let paginationContainer =
        document.getElementById('requestPagination');

    if (!paginationContainer && recordCount?.parentElement) {
        paginationContainer = document.createElement('div');

        paginationContainer.id = 'requestPagination';
        paginationContainer.className = 'pagination';

        recordCount.parentElement.insertAdjacentElement(
            'afterend',
            paginationContainer
        );
    }

    // ==========================================
    // 2. PAGE STATE
    // ==========================================

    const PAGE_LIMIT = 10;

    let currentUser = null;
    let currentPage = 1;
    let currentTotalPages = 0;
    let searchTimer = null;
    let latestLoadId = 0;

    // ==========================================
    // 3. USER INFORMATION
    // ==========================================

    function formatUserRole(role) {
        const roleNames = {
            lab_admin: 'Laboratory Administrator',
            lab_receptionist: 'Laboratory Receptionist',
            lab_technologist: 'Laboratory Technologist',
            result_verifier: 'Result Verifier',
            requesting_clinician: 'Requesting Clinician'
        };

        return roleNames[role] || 'Laboratory Personnel';
    }

    function displayUserInformation(user) {
        const fullName = [
            user.firstName,
            user.lastName
        ].filter(Boolean).join(' ') || user.username || user.email;

        if (userNameElement) {
            userNameElement.textContent = fullName;
        }

        if (userRoleElement) {
            userRoleElement.textContent =
                formatUserRole(user.role);
        }

        if (userAvatarElement) {
            userAvatarElement.textContent =
                fullName.charAt(0).toUpperCase();
        }
    }

    // ==========================================
    // 4. TABLE DISPLAY HELPERS
    // ==========================================

    function createTableCell(value) {
        const cell = document.createElement('td');

        cell.textContent = value ?? 'Not available';

        return cell;
    }

    function displayTableMessage(message, description = '') {
        if (!tableBody) return;

        tableBody.replaceChildren();

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 8;

        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';

        const heading = document.createElement('h3');

        heading.className = 'empty-state-title';
        heading.textContent = message;

        emptyState.appendChild(heading);

        if (description) {
            const paragraph = document.createElement('p');

            paragraph.className = 'empty-state-description';
            paragraph.textContent = description;

            emptyState.appendChild(paragraph);
        }

        cell.appendChild(emptyState);
        row.appendChild(cell);

        tableBody.appendChild(row);
    }

    function formatPatientName(patient) {
        if (!patient) {
            return 'Unknown Patient';
        }

        if (patient.fullName) {
            return patient.fullName;
        }

        return [
            patient.firstName,
            patient.middleName,
            patient.lastName,
            patient.suffix
        ].filter(Boolean).join(' ') || 'Unknown Patient';
    }

    function formatRequestedBy(user) {
        if (!user) {
            return 'Unknown User';
        }

        return [
            user.firstName,
            user.lastName
        ].filter(Boolean).join(' ') || user.username || 'Unknown User';
    }

    function formatRequestDate(dateValue) {
        if (!dateValue) {
            return 'Not available';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return 'Not available';
        }

        return date.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatStatus(status) {
        return String(status || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase());
    }

    // ==========================================
    // 5. STATUS AND PRIORITY STYLING
    // ==========================================

    function getStatusBadgeClass(status) {
        const statusClasses = {
            draft: 'badge-neutral',
            submitted: 'badge-pending',
            accepted: 'badge-info',
            in_progress: 'badge-progress',
            partially_completed: 'badge-progress',
            completed: 'badge-completed',
            cancelled: 'badge-cancelled'
        };

        return statusClasses[status] || 'badge-neutral';
    }

    function getPriorityClass(priority) {
        const allowedPriorities = [
            'routine',
            'urgent',
            'stat'
        ];

        if (!allowedPriorities.includes(priority)) {
            return 'priority-routine';
        }

        return `priority-${priority}`;
    }

    // ==========================================
    // 6. DISPLAY LABORATORY REQUESTS
    // ==========================================

    function displayRequests(requests) {
        if (!tableBody) return;

        tableBody.replaceChildren();

        if (!requests.length) {
            displayTableMessage(
                'No laboratory requests found.',
                'Try changing your search or filter selections.'
            );

            return;
        }

        requests.forEach((request) => {
            const row = document.createElement('tr');

            row.dataset.requestRow = 'true';

            // Request Number
            row.appendChild(
                createTableCell(request.requestNumber)
            );

            // Patient
            row.appendChild(
                createTableCell(
                    formatPatientName(request.patient)
                )
            );

            // Requesting Clinician
            row.appendChild(
                createTableCell(
                    formatRequestedBy(request.requestedBy)
                )
            );

            // Requested Date
            row.appendChild(
                createTableCell(
                    formatRequestDate(request.createdAt)
                )
            );

            // Number of Tests
            row.appendChild(
                createTableCell(
                    Array.isArray(request.tests)
                        ? request.tests.length
                        : 0
                )
            );

            // Priority
            const priorityCell = document.createElement('td');

            const priorityLabel = document.createElement('span');

            priorityLabel.className =
                getPriorityClass(request.priority);

            priorityLabel.textContent =
                String(request.priority || 'routine').toUpperCase();

            priorityCell.appendChild(priorityLabel);
            row.appendChild(priorityCell);

            // Request Status
            const statusCell = document.createElement('td');

            const statusBadge = document.createElement('span');

            statusBadge.className =
                `badge ${getStatusBadgeClass(request.status)}`;

            statusBadge.textContent =
                formatStatus(request.status);

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            // Actions
            const actionCell = document.createElement('td');

            const actionGroup = document.createElement('div');

            actionGroup.className = 'request-action-group';

            const viewButton = document.createElement('button');

            viewButton.type = 'button';

            viewButton.className =
                'request-action-button request-action-view';

            viewButton.textContent = 'View Details';

            viewButton.dataset.action = 'view-details';
            viewButton.dataset.requestId = request._id;

            actionGroup.appendChild(viewButton);
            actionCell.appendChild(actionGroup);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // ==========================================
    // 7. REQUEST PAGINATION
    // ==========================================

    function createPaginationButton(
        label,
        page,
        disabled,
        active = false
    ) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'btn btn-secondary btn-small';
        button.textContent = label;
        button.disabled = disabled;

        if (active) {
            button.classList.add('active');

            button.setAttribute(
                'aria-current',
                'page'
            );
        }

        button.addEventListener('click', () => {
            loadRequests(page);
        });

        return button;
    }

    function displayPagination() {
        if (!paginationContainer) return;

        paginationContainer.replaceChildren();

        if (currentTotalPages <= 1) {
            return;
        }

        paginationContainer.appendChild(
            createPaginationButton(
                'Previous',
                currentPage - 1,
                currentPage <= 1
            )
        );

        let startPage = Math.max(
            1,
            currentPage - 2
        );

        let endPage = Math.min(
            currentTotalPages,
            startPage + 4
        );

        startPage = Math.max(
            1,
            endPage - 4
        );

        for (
            let page = startPage;
            page <= endPage;
            page++
        ) {
            paginationContainer.appendChild(
                createPaginationButton(
                    String(page),
                    page,
                    false,
                    page === currentPage
                )
            );
        }

        paginationContainer.appendChild(
            createPaginationButton(
                'Next',
                currentPage + 1,
                currentPage >= currentTotalPages
            )
        );
    }

    // ==========================================
    // 8. LOAD LABORATORY REQUESTS FROM API
    // ==========================================

    async function loadRequests(page = 1) {
        const loadId = ++latestLoadId;

        currentPage = page;

        displayTableMessage(
            'Loading laboratory requests...',
            'Retrieving records from the MediLink database.'
        );

        if (recordCount) {
            recordCount.textContent = 'Loading records...';
        }

        if (paginationContainer) {
            paginationContainer.replaceChildren();
        }

        const query = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_LIMIT)
        });

        const search = requestSearch?.value.trim() || '';
        const status = requestStatusFilter?.value || '';
        const priority = requestPriorityFilter?.value || '';

        if (search) {
            query.set('search', search);
        }

        if (status) {
            query.set('status', status);
        }

        if (priority) {
            query.set('priority', priority);
        }

        try {
            const response = await window.MediLinkAPI.request(
                `/lab-requests?${query.toString()}`,
                {
                    method: 'GET'
                }
            );

            // Ignore outdated search requests.
            if (loadId !== latestLoadId) {
                return;
            }

            const result = response.data;

            const requests = result.requests || [];
            const pagination = result.pagination;

            displayRequests(requests);

            currentPage = pagination.page;
            currentTotalPages = pagination.totalPages;

            if (recordCount) {
                recordCount.textContent =
                    pagination.total === 0
                        ? 'No laboratory requests found.'
                        : `${pagination.total} laboratory request(s) found. ` +
                          `Page ${pagination.page} of ${pagination.totalPages}.`;
            }

            displayPagination();

            if (requestNotice) {
                requestNotice.hidden = true;
            }

        } catch (error) {
            if (loadId !== latestLoadId) {
                return;
            }

            console.error(
                'Laboratory request loading failed:',
                error
            );

            displayTableMessage(
                'Unable to load laboratory requests.',
                error.message
            );

            if (recordCount) {
                recordCount.textContent =
                    'Unable to retrieve laboratory requests.';
            }

            if (error.status === 401) {
                window.location.replace('login.html');
            }
        }
    }

    // ==========================================
    // 9. SUMMARY CARD COUNTS
    // ==========================================

    async function getRequestCount(status = '') {
        const query = new URLSearchParams({
            page: '1',
            limit: '1'
        });

        if (status) {
            query.set('status', status);
        }

        const response = await window.MediLinkAPI.request(
            `/lab-requests?${query.toString()}`,
            {
                method: 'GET'
            }
        );

        return response.data.pagination.total;
    }

    async function refreshSummaryCards() {
        try {
            const [
                total,
                drafts,
                submitted,
                accepted,
                inProgress,
                partiallyCompleted,
                completed
            ] = await Promise.all([
                getRequestCount(),
                getRequestCount('draft'),
                getRequestCount('submitted'),
                getRequestCount('accepted'),
                getRequestCount('in_progress'),
                getRequestCount('partially_completed'),
                getRequestCount('completed')
            ]);

            if (totalRequestsCount) {
                totalRequestsCount.textContent = total;
            }

            if (pendingRequestsCount) {
                pendingRequestsCount.textContent =
                    drafts + submitted + accepted;
            }

            if (inProgressRequestsCount) {
                inProgressRequestsCount.textContent =
                    inProgress + partiallyCompleted;
            }

            if (completedRequestsCount) {
                completedRequestsCount.textContent = completed;
            }

        } catch (error) {
            console.error(
                'Laboratory request summary loading failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            if (totalRequestsCount) totalRequestsCount.textContent = '—';
            if (pendingRequestsCount) pendingRequestsCount.textContent = '—';
            if (inProgressRequestsCount) inProgressRequestsCount.textContent = '—';
            if (completedRequestsCount) completedRequestsCount.textContent = '—';
        }
    }

    // ==========================================
    // 10. SEARCH AND FILTER EVENTS
    // ==========================================

    if (requestSearch) {
        requestSearch.addEventListener('input', () => {
            clearTimeout(searchTimer);

            searchTimer = setTimeout(() => {
                loadRequests(1);
            }, 350);
        });
    }

    if (requestStatusFilter) {
        requestStatusFilter.addEventListener(
            'change',
            () => loadRequests(1)
        );
    }

    if (requestPriorityFilter) {
        requestPriorityFilter.addEventListener(
            'change',
            () => loadRequests(1)
        );
    }

    // ==========================================
    // 11. RESET SEARCH AND FILTERS
    // ==========================================

    if (resetRequestFiltersButton) {
        resetRequestFiltersButton.addEventListener('click', () => {
            if (requestSearch) {
                requestSearch.value = '';
            }

            if (requestStatusFilter) {
                requestStatusFilter.value = '';
            }

            if (requestPriorityFilter) {
                requestPriorityFilter.value = '';
            }

            clearTimeout(searchTimer);

            loadRequests(1);
        });
    }

    // ==========================================
    // 12. CREATE REQUEST BUTTON
    // ==========================================

    if (createRequestButton) {
        createRequestButton.addEventListener('click', () => {
            window.alert(
                'The laboratory request creation form is not yet connected. ' +
                'The backend draft creation API is already available.'
            );
        });
    }

    // ==========================================
    // 13. VIEW REQUEST DETAILS
    // ==========================================

    if (tableBody) {
        tableBody.addEventListener('click', (event) => {

            const viewButton = event.target.closest(
                '[data-action="view-details"]'
            );

            if (
                !viewButton ||
                !tableBody.contains(viewButton)
            ) {
                return;
            }

            const requestId =
                viewButton.dataset.requestId?.trim();

            if (!requestId) {
                window.alert(
                    'The laboratory request identifier is missing.'
                );

                return;
            }

            window.location.href =
                `request-details.html?requestId=${encodeURIComponent(requestId)}`;
        });
    }

    // ==========================================
    // 14. MOBILE SIDEBAR
    // ==========================================

    function openSidebar() {
        if (!appLayout || !sidebarToggle) return;

        appLayout.classList.add('sidebar-open');

        sidebarToggle.setAttribute(
            'aria-expanded',
            'true'
        );

        sidebarToggle.setAttribute(
            'aria-label',
            'Close navigation'
        );
    }

    function closeSidebar() {
        if (!appLayout || !sidebarToggle) return;

        appLayout.classList.remove('sidebar-open');

        sidebarToggle.setAttribute(
            'aria-expanded',
            'false'
        );

        sidebarToggle.setAttribute(
            'aria-label',
            'Open navigation'
        );
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isOpen =
                appLayout.classList.contains('sidebar-open');

            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener(
            'click',
            closeSidebar
        );
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    document.querySelectorAll(
        '.sidebar-nav .nav-link'
    ).forEach((link) => {
        link.addEventListener('click', closeSidebar);
    });

    // ==========================================
    // 15. LOGOUT
    // ==========================================

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {

            const confirmed = window.confirm(
                'Are you sure you want to log out of MediLink?'
            );

            if (!confirmed) return;

            logoutButton.disabled = true;
            logoutButton.textContent = 'Logging Out...';

            try {
                await window.MediLinkAuth.logout();

                window.location.replace('login.html');

            } catch (error) {
                console.error('Logout failed:', error);

                window.alert(
                    error.message || 'Unable to log out.'
                );

                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }
        });
    }

    // ==========================================
    // 16. INITIALIZE LABORATORY REQUESTS PAGE
    // ==========================================

    async function initializeLaboratoryRequestsPage() {
        try {
            // Verify the authenticated session.
            currentUser =
                await window.MediLinkAuth.getCurrentUser();

            // Display actual user information.
            displayUserInformation(currentUser);

            // Retrieve database records and summary counts.
            await Promise.all([
                loadRequests(1),
                refreshSummaryCards()
            ]);

        } catch (error) {
            console.error(
                'Laboratory Requests authentication failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            window.alert(
                error.message ||
                'Unable to initialize the Laboratory Requests page.'
            );
        }
    }

    initializeLaboratoryRequestsPage();

})();
