
// ==========================================
// MEDILINK LABORATORY
// TEST CATALOG JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const testSearch = document.getElementById('testSearch');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const resetFiltersButton = document.getElementById('resetFiltersButton');

const addTestButton = document.getElementById('addTestButton');
const tableBody = document.getElementById('testCatalogTableBody');
const recordCount = document.getElementById('catalogRecordCount');

// 2. Get Actual Test Records from the Table

function getTestRows() {
    if (!tableBody) return [];

    return Array.from(tableBody.querySelectorAll('tr')).filter((row) => {
        return row.querySelectorAll('td').length === 8;
    });
}

// 3. Create an Empty Search Result Message

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
        heading.textContent = 'No matching laboratory tests';

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

// 4. Filter Laboratory Tests

function filterTestCatalog() {
    if (!tableBody) return;

    const rows = getTestRows();

    // Keep the original empty state when there are no records.
    if (rows.length === 0) {
        updateEmptySearchMessage(false);

        if (recordCount) {
            recordCount.textContent =
                'No laboratory test records available.';
        }

        return;
    }

    const searchValue = testSearch
        ? testSearch.value.trim().toLowerCase()
        : '';

    const selectedCategory = categoryFilter
        ? categoryFilter.value.toLowerCase()
        : '';

    const selectedStatus = statusFilter
        ? statusFilter.value.toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        const testCode = cells[0].textContent.toLowerCase();
        const testName = cells[1].textContent.toLowerCase();
        const category = cells[2].textContent.toLowerCase();
        const status = cells[6].textContent.toLowerCase().trim();

        const matchesSearch =
            testCode.includes(searchValue) ||
            testName.includes(searchValue);

        const matchesCategory =
            !selectedCategory ||
            category.includes(selectedCategory);

        const matchesStatus =
            !selectedStatus ||
            status.includes(selectedStatus);

        const isVisible =
            matchesSearch &&
            matchesCategory &&
            matchesStatus;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    // Show a message when filters return no records.
    updateEmptySearchMessage(visibleCount === 0);

    // Update the record count.
    if (recordCount) {
        recordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} laboratory tests.`;
    }
}

// 5. Search Event

if (testSearch) {
    testSearch.addEventListener('input', filterTestCatalog);
}

// 6. Category Filter Event

if (categoryFilter) {
    categoryFilter.addEventListener('change', filterTestCatalog);
}

// 7. Status Filter Event

if (statusFilter) {
    statusFilter.addEventListener('change', filterTestCatalog);
}

// 8. Reset Filters

if (resetFiltersButton) {
    resetFiltersButton.addEventListener('click', () => {
        if (testSearch) testSearch.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        filterTestCatalog();
    });
}

// 9. Add Laboratory Test Button

if (addTestButton) {
    addTestButton.addEventListener('click', () => {
        window.alert(
            'The Add Laboratory Test feature will be implemented when the Test Catalog backend module is ready.'
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

// 15. Close Sidebar After Navigation

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

// 17. Initial Catalog Display

filterTestCatalog();
