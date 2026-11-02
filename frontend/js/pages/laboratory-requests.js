
// ==========================================
// MEDILINK LABORATORY
// LABORATORY REQUESTS JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const requestSearch = document.getElementById('requestSearch');
const requestStatusFilter = document.getElementById('requestStatusFilter');
const requestPriorityFilter = document.getElementById('requestPriorityFilter');
const resetRequestFiltersButton = document.getElementById('resetRequestFiltersButton');

const createRequestButton = document.getElementById('createRequestButton');
const tableBody = document.getElementById('laboratoryRequestsTableBody');
const recordCount = document.getElementById('requestRecordCount');

// 2. Get Laboratory Request Rows

function getRequestRows() {
    if (!tableBody) return [];

    return Array.from(
        tableBody.querySelectorAll('tr[data-request-row="true"]')
    );
}

// 3. Display No Matching Requests Message

function updateEmptySearchMessage(shouldShow) {
    if (!tableBody) return;

    let emptyRow = tableBody.querySelector('[data-filter-empty]');

    if (shouldShow && !emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.setAttribute('data-filter-empty', 'true');

        const cell = document.createElement('td');
        cell.colSpan = 8;

        const message = document.createElement('div');
        message.className = 'empty-state';

        const heading = document.createElement('h3');
        heading.className = 'empty-state-title';
        heading.textContent = 'No matching laboratory requests';

        const description = document.createElement('p');
        description.className = 'empty-state-description';
        description.textContent =
            'Try changing your search or filter selections.';

        message.append(heading, description);
        cell.appendChild(message);
        emptyRow.appendChild(cell);
        tableBody.appendChild(emptyRow);
    }

    if (!shouldShow && emptyRow) {
        emptyRow.remove();
    }
}

// 4. Filter Laboratory Requests

function filterLaboratoryRequests() {
    if (!tableBody) return;

    const rows = getRequestRows();

    // Keep the original empty state when no records exist.
    if (rows.length === 0) {
        updateEmptySearchMessage(false);

        if (recordCount) {
            recordCount.textContent =
                'No laboratory requests available.';
        }

        return;
    }

    const searchValue = requestSearch
        ? requestSearch.value.trim().toLowerCase()
        : '';

    const selectedStatus = requestStatusFilter
        ? requestStatusFilter.value.trim().toLowerCase()
        : '';

    const selectedPriority = requestPriorityFilter
        ? requestPriorityFilter.value.trim().toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        const requestNumber = cells[0].textContent.toLowerCase();
        const patientName = cells[1].textContent.toLowerCase();
        const priority = cells[5].textContent.toLowerCase().trim();
        const status = cells[6].textContent.toLowerCase().trim();

        const matchesSearch =
            requestNumber.includes(searchValue) ||
            patientName.includes(searchValue);

        const matchesStatus =
            !selectedStatus || status.includes(selectedStatus);

        const matchesPriority =
            !selectedPriority || priority.includes(selectedPriority);

        const isVisible =
            matchesSearch &&
            matchesStatus &&
            matchesPriority;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    updateEmptySearchMessage(visibleCount === 0);

    if (recordCount) {
        recordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} laboratory requests.`;
    }
}

// 5. Search Requests

if (requestSearch) {
    requestSearch.addEventListener('input', filterLaboratoryRequests);
}

// 6. Filter by Request Status

if (requestStatusFilter) {
    requestStatusFilter.addEventListener(
        'change',
        filterLaboratoryRequests
    );
}

// 7. Filter by Priority

if (requestPriorityFilter) {
    requestPriorityFilter.addEventListener(
        'change',
        filterLaboratoryRequests
    );
}

// 8. Reset Search and Filters

if (resetRequestFiltersButton) {
    resetRequestFiltersButton.addEventListener('click', () => {
        if (requestSearch) requestSearch.value = '';
        if (requestStatusFilter) requestStatusFilter.value = '';
        if (requestPriorityFilter) requestPriorityFilter.value = '';

        filterLaboratoryRequests();
    });
}

// 9. Create Laboratory Request Button

if (createRequestButton) {
    createRequestButton.addEventListener('click', () => {
        window.alert(
            'Laboratory request creation will be implemented when the Laboratory Request backend module is ready.'
        );
    });
}

// 10. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 11. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 12. Toggle Sidebar

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

// 13. Close Sidebar Using Overlay

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 14. Close Sidebar Using Escape Key

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 15. Close Sidebar After Selecting Navigation

const navigationLinks = document.querySelectorAll(
    '.sidebar-nav .nav-link'
);

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 16. Temporary Logout Navigation

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

// 17. Initial Request Display

filterLaboratoryRequests();
