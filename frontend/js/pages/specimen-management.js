
// ==========================================
// MEDILINK LABORATORY
// SPECIMEN MANAGEMENT JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const specimenSearch = document.getElementById('specimenSearch');
const specimenStatusFilter = document.getElementById('specimenStatusFilter');
const specimenTypeFilter = document.getElementById('specimenTypeFilter');

const resetSpecimenFiltersButton = document.getElementById(
    'resetSpecimenFiltersButton'
);

const registerSpecimenButton = document.getElementById(
    'registerSpecimenButton'
);

const tableBody = document.getElementById('specimenTableBody');
const recordCount = document.getElementById('specimenRecordCount');

// 2. Get Specimen Records

function getSpecimenRows() {
    if (!tableBody) return [];

    return Array.from(
        tableBody.querySelectorAll('tr[data-specimen-row="true"]')
    );
}

// 3. Display No Matching Specimens Message

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
        heading.textContent = 'No matching specimen records';

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

// 4. Filter Specimen Records

function filterSpecimens() {
    if (!tableBody) return;

    const rows = getSpecimenRows();

    // Keep the original empty state when no records exist.
    if (rows.length === 0) {
        updateEmptySearchMessage(false);

        if (recordCount) {
            recordCount.textContent =
                'No specimen records available.';
        }

        return;
    }

    const searchValue = specimenSearch
        ? specimenSearch.value.trim().toLowerCase()
        : '';

    const selectedStatus = specimenStatusFilter
        ? specimenStatusFilter.value.trim().toLowerCase()
        : '';

    const selectedType = specimenTypeFilter
        ? specimenTypeFilter.value.trim().toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // Expected column positions:
        // 0 = Specimen Code
        // 1 = Request Number
        // 2 = Patient
        // 3 = Specimen Type
        // 4 = Collection Date
        // 5 = Received Date
        // 6 = Specimen Status
        // 7 = Actions

        const specimenCode = cells[0].textContent.toLowerCase();
        const requestNumber = cells[1].textContent.toLowerCase();
        const patientName = cells[2].textContent.toLowerCase();
        const specimenType = cells[3].textContent.toLowerCase().trim();
        const specimenStatus = cells[6].textContent.toLowerCase().trim();

        const matchesSearch =
            specimenCode.includes(searchValue) ||
            requestNumber.includes(searchValue) ||
            patientName.includes(searchValue);

        const matchesStatus =
            !selectedStatus ||
            specimenStatus.includes(selectedStatus);

        const matchesType =
            !selectedType ||
            specimenType.includes(selectedType);

        const isVisible =
            matchesSearch &&
            matchesStatus &&
            matchesType;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    // Show a message if no records match.
    updateEmptySearchMessage(visibleCount === 0);

    // Update visible record count.
    if (recordCount) {
        recordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} specimen records.`;
    }
}

// 5. Search Specimens

if (specimenSearch) {
    specimenSearch.addEventListener('input', filterSpecimens);
}

// 6. Filter by Specimen Status

if (specimenStatusFilter) {
    specimenStatusFilter.addEventListener(
        'change',
        filterSpecimens
    );
}

// 7. Filter by Specimen Type

if (specimenTypeFilter) {
    specimenTypeFilter.addEventListener(
        'change',
        filterSpecimens
    );
}

// 8. Reset All Specimen Filters

if (resetSpecimenFiltersButton) {
    resetSpecimenFiltersButton.addEventListener('click', () => {
        if (specimenSearch) specimenSearch.value = '';
        if (specimenStatusFilter) specimenStatusFilter.value = '';
        if (specimenTypeFilter) specimenTypeFilter.value = '';

        filterSpecimens();
    });
}

// 9. Register Specimen Button

if (registerSpecimenButton) {
    registerSpecimenButton.addEventListener('click', () => {
        window.alert(
            'Specimen registration will be enabled when the Specimen Management backend module is implemented.'
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

// 17. Initial Specimen Display

filterSpecimens();
