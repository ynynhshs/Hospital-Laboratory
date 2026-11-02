
// ==========================================
// MEDILINK LABORATORY
// PROCESSING WORKLIST JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const processingSearch = document.getElementById('processingSearch');
const processingStatusFilter = document.getElementById('processingStatusFilter');
const processingPriorityFilter = document.getElementById('processingPriorityFilter');

const resetProcessingFiltersButton = document.getElementById(
    'resetProcessingFiltersButton'
);

const refreshWorklistButton = document.getElementById(
    'refreshWorklistButton'
);

const tableBody = document.getElementById('processingTableBody');
const recordCount = document.getElementById('processingRecordCount');

// 2. Get Processing Records

function getProcessingRows() {
    if (!tableBody) return [];

    return Array.from(
        tableBody.querySelectorAll('tr[data-processing-row="true"]')
    );
}

// 3. Display No Matching Records Message

function updateEmptySearchMessage(shouldShow) {
    if (!tableBody) return;

    let emptyRow = tableBody.querySelector('[data-filter-empty]');

    if (shouldShow && !emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.setAttribute('data-filter-empty', 'true');

        const cell = document.createElement('td');
        cell.colSpan = 9;

        const message = document.createElement('div');
        message.className = 'empty-state';

        const heading = document.createElement('h3');
        heading.className = 'empty-state-title';
        heading.textContent = 'No matching processing records';

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

// 4. Filter Processing Records

function filterProcessingRecords() {
    if (!tableBody) return;

    const rows = getProcessingRows();

    // Preserve the original empty state when no records exist.
    if (rows.length === 0) {
        updateEmptySearchMessage(false);

        if (recordCount) {
            recordCount.textContent =
                'No processing records available.';
        }

        return;
    }

    const searchValue = processingSearch
        ? processingSearch.value.trim().toLowerCase()
        : '';

    const selectedStatus = processingStatusFilter
        ? processingStatusFilter.value.trim().toLowerCase()
        : '';

    const selectedPriority = processingPriorityFilter
        ? processingPriorityFilter.value.trim().toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // Expected table columns:
        // 0 = Request Number
        // 1 = Patient
        // 2 = Laboratory Test
        // 3 = Specimen Code
        // 4 = Assigned Personnel
        // 5 = Started At
        // 6 = Priority
        // 7 = Processing Status
        // 8 = Actions

        const requestNumber = cells[0].textContent.toLowerCase();
        const patientName = cells[1].textContent.toLowerCase();
        const laboratoryTest = cells[2].textContent.toLowerCase();
        const specimenCode = cells[3].textContent.toLowerCase();

        const priority = cells[6].textContent.toLowerCase().trim();
        const status = cells[7].textContent.toLowerCase().trim();

        const matchesSearch =
            requestNumber.includes(searchValue) ||
            patientName.includes(searchValue) ||
            laboratoryTest.includes(searchValue) ||
            specimenCode.includes(searchValue);

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
            `Showing ${visibleCount} of ${rows.length} processing records.`;
    }
}

// 5. Search Processing Records

if (processingSearch) {
    processingSearch.addEventListener(
        'input',
        filterProcessingRecords
    );
}

// 6. Filter by Processing Status

if (processingStatusFilter) {
    processingStatusFilter.addEventListener(
        'change',
        filterProcessingRecords
    );
}

// 7. Filter by Request Priority

if (processingPriorityFilter) {
    processingPriorityFilter.addEventListener(
        'change',
        filterProcessingRecords
    );
}

// 8. Reset All Filters

if (resetProcessingFiltersButton) {
    resetProcessingFiltersButton.addEventListener('click', () => {
        if (processingSearch) processingSearch.value = '';
        if (processingStatusFilter) processingStatusFilter.value = '';
        if (processingPriorityFilter) processingPriorityFilter.value = '';

        filterProcessingRecords();
    });
}

// 9. Refresh Worklist

if (refreshWorklistButton) {
    refreshWorklistButton.addEventListener('click', () => {
        window.alert(
            'The worklist refresh feature will retrieve updated records when the Laboratory Processing API is connected.'
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

if (sidebarToggle && appLayout) {
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

// 17. Initial Worklist Display

filterProcessingRecords();
