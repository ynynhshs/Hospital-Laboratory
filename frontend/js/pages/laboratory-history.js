
// ==========================================
// MEDILINK LABORATORY
// LABORATORY HISTORY JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const historySearch = document.getElementById('historySearch');

const historyRecordTypeFilter = document.getElementById(
    'historyRecordTypeFilter'
);

const historyStatusFilter = document.getElementById(
    'historyStatusFilter'
);

const historyStartDate = document.getElementById('historyStartDate');
const historyEndDate = document.getElementById('historyEndDate');

const applyHistoryFiltersButton = document.getElementById(
    'applyHistoryFiltersButton'
);

const resetHistoryFiltersButton = document.getElementById(
    'resetHistoryFiltersButton'
);

const refreshHistoryButton = document.getElementById(
    'refreshHistoryButton'
);

const historyTableBody = document.getElementById('historyTableBody');

const historyRecordCount = document.getElementById('historyRecordCount');

// Historical Details Elements

const historyDetailsStatus = document.getElementById(
    'historyDetailsStatus'
);

const historyPatientName = document.getElementById('historyPatientName');
const historyRequestNumber = document.getElementById('historyRequestNumber');
const historyTestName = document.getElementById('historyTestName');
const historySpecimenCode = document.getElementById('historySpecimenCode');

const historyRecordDate = document.getElementById('historyRecordDate');
const historyRecordType = document.getElementById('historyRecordType');

const historyResultComponentsBody = document.getElementById(
    'historyResultComponentsBody'
);

const historyEnteredBy = document.getElementById('historyEnteredBy');
const historyVerifiedBy = document.getElementById('historyVerifiedBy');
const historyReleasedDate = document.getElementById('historyReleasedDate');

const historyAmendmentStatus = document.getElementById(
    'historyAmendmentStatus'
);

const clearHistoryDetailsButton = document.getElementById(
    'clearHistoryDetailsButton'
);

const viewHistoryAmendmentsButton = document.getElementById(
    'viewHistoryAmendmentsButton'
);

// 2. Get Historical Record Rows

function getHistoryRows() {
    if (!historyTableBody) return [];

    return Array.from(
        historyTableBody.querySelectorAll(
            'tr[data-history-row="true"]'
        )
    );
}

// 3. Display No Matching Records Message

function updateEmptyHistoryMessage(shouldShow) {
    if (!historyTableBody) return;

    let emptyRow = historyTableBody.querySelector(
        '[data-filter-empty]'
    );

    if (shouldShow && !emptyRow) {
        emptyRow = document.createElement('tr');

        emptyRow.setAttribute('data-filter-empty', 'true');

        const cell = document.createElement('td');
        cell.colSpan = 8;

        const message = document.createElement('div');
        message.className = 'empty-state';

        const heading = document.createElement('h3');
        heading.className = 'empty-state-title';
        heading.textContent = 'No matching historical records';

        const description = document.createElement('p');
        description.className = 'empty-state-description';
        description.textContent =
            'Try changing your search, record type, status, or date range.';

        message.append(heading, description);
        cell.appendChild(message);
        emptyRow.appendChild(cell);

        historyTableBody.appendChild(emptyRow);
    }

    if (!shouldShow && emptyRow) {
        emptyRow.remove();
    }
}

// 4. Get a Record Date for Filtering

function getHistoryRecordDate(row) {
    // Prefer an ISO date supplied by the backend.
    const storedDate = row.dataset.recordDate;

    if (storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate)) {
        return storedDate;
    }

    // Fallback to parsing the displayed date in column 0.
    const dateText = row.querySelectorAll('td')[0]
        ?.textContent.trim();

    if (!dateText) return '';

    const parsedDate = new Date(dateText);

    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// 5. Filter Historical Records

function filterHistoryRecords() {
    if (!historyTableBody) return;

    const rows = getHistoryRows();

    const searchValue = historySearch
        ? historySearch.value.trim().toLowerCase()
        : '';

    const selectedRecordType = historyRecordTypeFilter
        ? historyRecordTypeFilter.value.trim().toLowerCase()
        : '';

    const selectedStatus = historyStatusFilter
        ? historyStatusFilter.value.trim().toLowerCase()
        : '';

    const startDate = historyStartDate
        ? historyStartDate.value
        : '';

    const endDate = historyEndDate
        ? historyEndDate.value
        : '';

    // Validate the date range.
    if (startDate && endDate && startDate > endDate) {
        historyStartDate.setAttribute('aria-invalid', 'true');
        historyEndDate.setAttribute('aria-invalid', 'true');

        if (historyRecordCount) {
            historyRecordCount.textContent =
                'Invalid date range. Start Date must not be after End Date.';
        }

        return;
    }

    if (historyStartDate) {
        historyStartDate.removeAttribute('aria-invalid');
    }

    if (historyEndDate) {
        historyEndDate.removeAttribute('aria-invalid');
    }

    // Preserve the original empty state when there are no records.
    if (rows.length === 0) {
        updateEmptyHistoryMessage(false);

        if (historyRecordCount) {
            historyRecordCount.textContent =
                'No historical records available.';
        }

        return;
    }

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // Expected columns:
        // 0 = Record Date
        // 1 = Record Type
        // 2 = Patient
        // 3 = Request Number
        // 4 = Laboratory Test
        // 5 = Specimen Code
        // 6 = Record Status
        // 7 = Actions

        const recordType = cells[1].textContent.toLowerCase().trim();
        const patientName = cells[2].textContent.toLowerCase();
        const requestNumber = cells[3].textContent.toLowerCase();
        const testName = cells[4].textContent.toLowerCase();
        const status = cells[6].textContent.toLowerCase().trim();

        const recordDate = getHistoryRecordDate(row);

        const matchesSearch =
            patientName.includes(searchValue) ||
            requestNumber.includes(searchValue) ||
            testName.includes(searchValue);

        const matchesRecordType =
            !selectedRecordType ||
            recordType.includes(selectedRecordType);

        const matchesStatus =
            !selectedStatus ||
            status.includes(selectedStatus);

        const matchesStartDate =
            !startDate ||
            (recordDate && recordDate >= startDate);

        const matchesEndDate =
            !endDate ||
            (recordDate && recordDate <= endDate);

        const isVisible =
            matchesSearch &&
            matchesRecordType &&
            matchesStatus &&
            matchesStartDate &&
            matchesEndDate;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    updateEmptyHistoryMessage(visibleCount === 0);

    if (historyRecordCount) {
        historyRecordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} historical records.`;
    }
}

// 6. Search Records

if (historySearch) {
    historySearch.addEventListener('input', filterHistoryRecords);
}

// 7. Apply Filters

if (applyHistoryFiltersButton) {
    applyHistoryFiltersButton.addEventListener(
        'click',
        filterHistoryRecords
    );
}

// 8. Reset All Filters

if (resetHistoryFiltersButton) {
    resetHistoryFiltersButton.addEventListener('click', () => {
        if (historySearch) historySearch.value = '';

        if (historyRecordTypeFilter) {
            historyRecordTypeFilter.value = '';
        }

        if (historyStatusFilter) {
            historyStatusFilter.value = '';
        }

        if (historyStartDate) {
            historyStartDate.value = '';
            historyStartDate.removeAttribute('aria-invalid');
        }

        if (historyEndDate) {
            historyEndDate.value = '';
            historyEndDate.removeAttribute('aria-invalid');
        }

        filterHistoryRecords();
    });
}

// 9. Display Historical Result Components

function displayHistoricalComponents(row) {
    if (!historyResultComponentsBody) return;

    historyResultComponentsBody.replaceChildren();

    const componentsData = row.dataset.resultComponents;

    let components = [];

    if (componentsData) {
        try {
            components = JSON.parse(componentsData);

            if (!Array.isArray(components)) {
                components = [];
            }
        } catch (error) {
            console.error(
                'Unable to read historical result components:',
                error
            );

            components = [];
        }
    }

    if (components.length === 0) {
        const emptyRow = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent =
            'No historical result component details available.';

        emptyRow.appendChild(cell);
        historyResultComponentsBody.appendChild(emptyRow);

        return;
    }

    components.forEach((component) => {
        const componentRow = document.createElement('tr');

        const values = [
            component.name,
            component.value,
            component.unit,
            component.referenceRange,
            component.flag
        ];

        values.forEach((value) => {
            const cell = document.createElement('td');

            // textContent prevents supplied values from being treated as HTML.
            cell.textContent = value ?? '—';

            componentRow.appendChild(cell);
        });

        historyResultComponentsBody.appendChild(componentRow);
    });
}

// 10. Select a Historical Record

function selectHistoricalRecord(row) {
    if (!row) return;

    const cells = row.querySelectorAll('td');

    if (cells.length !== 8) {
        window.alert(
            'The selected historical record has incomplete information.'
        );

        return;
    }

    // Read the selected historical record.
    const selectedRecordDate = cells[0].textContent.trim();
    const selectedRecordType = cells[1].textContent.trim();
    const selectedPatientName = cells[2].textContent.trim();
    const selectedRequestNumber = cells[3].textContent.trim();
    const selectedTestName = cells[4].textContent.trim();
    const selectedSpecimenCode = cells[5].textContent.trim();
    const selectedStatus = cells[6].textContent.trim();

    // Populate historical information.
    if (historyPatientName) {
        historyPatientName.value = selectedPatientName;
    }

    if (historyRequestNumber) {
        historyRequestNumber.value = selectedRequestNumber;
    }

    if (historyTestName) {
        historyTestName.value = selectedTestName;
    }

    if (historySpecimenCode) {
        historySpecimenCode.value = selectedSpecimenCode;
    }

    if (historyRecordDate) {
        historyRecordDate.value = selectedRecordDate;
    }

    if (historyRecordType) {
        historyRecordType.value = selectedRecordType;
    }

    // Populate verification and release information.
    if (historyEnteredBy) {
        historyEnteredBy.value = row.dataset.enteredBy || '';
    }

    if (historyVerifiedBy) {
        historyVerifiedBy.value = row.dataset.verifiedBy || '';
    }

    if (historyReleasedDate) {
        historyReleasedDate.value = row.dataset.releasedDate || '';
    }

    if (historyAmendmentStatus) {
        historyAmendmentStatus.value =
            row.dataset.amendmentStatus || 'No amendment information';
    }

    // Display historical result components.
    displayHistoricalComponents(row);

    // Update selected record status.
    if (historyDetailsStatus) {
        historyDetailsStatus.textContent = selectedStatus;
        historyDetailsStatus.className = 'badge badge-info';
    }

    // Enable amendment history only when the record has amendments.
    const hasAmendments = row.dataset.hasAmendments === 'true';

    if (viewHistoryAmendmentsButton) {
        viewHistoryAmendmentsButton.disabled = !hasAmendments;
    }

    // Bring the details section into view.
    const detailsCard = document.querySelector('.history-details-card');

    if (detailsCard) {
        detailsCard.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 11. Handle Historical Record Selection

if (historyTableBody) {
    historyTableBody.addEventListener('click', (event) => {
        const selectButton = event.target.closest(
            '[data-action="view-history"]'
        );

        if (!selectButton) return;

        const selectedRow = selectButton.closest('tr');

        if (!selectedRow) return;

        selectHistoricalRecord(selectedRow);
    });
}

// 12. Clear Historical Record Details

function clearHistoryDetails() {
    const fields = [
        historyPatientName,
        historyRequestNumber,
        historyTestName,
        historySpecimenCode,
        historyRecordDate,
        historyRecordType,
        historyEnteredBy,
        historyVerifiedBy,
        historyReleasedDate,
        historyAmendmentStatus
    ];

    fields.forEach((field) => {
        if (field) field.value = '';
    });

    if (historyResultComponentsBody) {
        historyResultComponentsBody.replaceChildren();

        const emptyRow = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent = 'No historical result details available.';

        emptyRow.appendChild(cell);
        historyResultComponentsBody.appendChild(emptyRow);
    }

    if (historyDetailsStatus) {
        historyDetailsStatus.textContent = 'No Record Selected';
        historyDetailsStatus.className = 'badge badge-neutral';
    }

    if (viewHistoryAmendmentsButton) {
        viewHistoryAmendmentsButton.disabled = true;
    }
}

// 13. Clear Selection Button

if (clearHistoryDetailsButton) {
    clearHistoryDetailsButton.addEventListener(
        'click',
        clearHistoryDetails
    );
}

// 14. View Amendment History

if (viewHistoryAmendmentsButton) {
    viewHistoryAmendmentsButton.addEventListener('click', () => {
        window.alert(
            'Detailed amendment history will be retrieved when the backend amendment history feature is implemented.'
        );
    });
}

// 15. Refresh History

if (refreshHistoryButton) {
    refreshHistoryButton.addEventListener('click', () => {
        window.alert(
            'Historical records will be refreshed when the Laboratory History API is connected.'
        );
    });
}

// 16. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 17. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 18. Toggle Sidebar

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

// 19. Close Sidebar Using Overlay

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 20. Close Sidebar Using Escape Key

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 21. Close Sidebar After Selecting Navigation

const navigationLinks = document.querySelectorAll(
    '.sidebar-nav .nav-link'
);

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 22. Temporary Logout Navigation

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

// 23. Initial Page State

clearHistoryDetails();
filterHistoryRecords();
