
// ==========================================
// MEDILINK LABORATORY
// RESULT VERIFICATION JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const verificationSearch = document.getElementById('verificationSearch');
const verificationStatusFilter = document.getElementById(
    'verificationStatusFilter'
);

const resetVerificationFiltersButton = document.getElementById(
    'resetVerificationFiltersButton'
);

const refreshVerificationButton = document.getElementById(
    'refreshVerificationButton'
);

const verificationTableBody = document.getElementById(
    'verificationTableBody'
);

const verificationRecordCount = document.getElementById(
    'verificationRecordCount'
);

// Review Form Elements

const verificationFormStatus = document.getElementById(
    'verificationFormStatus'
);

const reviewRequestNumber = document.getElementById(
    'reviewRequestNumber'
);

const reviewPatientName = document.getElementById(
    'reviewPatientName'
);

const reviewTestName = document.getElementById(
    'reviewTestName'
);

const reviewEnteredBy = document.getElementById(
    'reviewEnteredBy'
);

const reviewSpecimenCode = document.getElementById(
    'reviewSpecimenCode'
);

const reviewSubmittedDate = document.getElementById(
    'reviewSubmittedDate'
);

const reviewResultComponentsBody = document.getElementById(
    'reviewResultComponentsBody'
);

const verificationRemarks = document.getElementById(
    'verificationRemarks'
);

const clearVerificationButton = document.getElementById(
    'clearVerificationButton'
);

const returnResultButton = document.getElementById(
    'returnResultButton'
);

const verifyResultButton = document.getElementById(
    'verifyResultButton'
);

const releaseResultButton = document.getElementById(
    'releaseResultButton'
);

// 2. Get Verification Worklist Records

function getVerificationRows() {
    if (!verificationTableBody) return [];

    return Array.from(
        verificationTableBody.querySelectorAll(
            'tr[data-verification-row="true"]'
        )
    );
}

// 3. Display No Matching Results Message

function updateEmptyVerificationMessage(shouldShow) {
    if (!verificationTableBody) return;

    let emptyRow = verificationTableBody.querySelector(
        '[data-filter-empty]'
    );

    if (shouldShow && !emptyRow) {
        emptyRow = document.createElement('tr');
        emptyRow.setAttribute('data-filter-empty', 'true');

        const cell = document.createElement('td');
        cell.colSpan = 7;

        const message = document.createElement('div');
        message.className = 'empty-state';

        const heading = document.createElement('h3');
        heading.className = 'empty-state-title';
        heading.textContent = 'No matching laboratory results';

        const description = document.createElement('p');
        description.className = 'empty-state-description';
        description.textContent =
            'Try changing your search or result status filter.';

        message.append(heading, description);
        cell.appendChild(message);
        emptyRow.appendChild(cell);

        verificationTableBody.appendChild(emptyRow);
    }

    if (!shouldShow && emptyRow) {
        emptyRow.remove();
    }
}

// 4. Filter Verification Records

function filterVerificationRecords() {
    if (!verificationTableBody) return;

    const rows = getVerificationRows();

    // Preserve the original empty state when no records exist.
    if (rows.length === 0) {
        updateEmptyVerificationMessage(false);

        if (verificationRecordCount) {
            verificationRecordCount.textContent =
                'No laboratory results available.';
        }

        return;
    }

    const searchValue = verificationSearch
        ? verificationSearch.value.trim().toLowerCase()
        : '';

    const selectedStatus = verificationStatusFilter
        ? verificationStatusFilter.value.trim().toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // Expected columns:
        // 0 = Request Number
        // 1 = Patient
        // 2 = Laboratory Test
        // 3 = Entered By
        // 4 = Submitted Date
        // 5 = Result Status
        // 6 = Action

        const requestNumber = cells[0].textContent.toLowerCase();
        const patientName = cells[1].textContent.toLowerCase();
        const testName = cells[2].textContent.toLowerCase();
        const status = cells[5].textContent.toLowerCase().trim();

        const matchesSearch =
            requestNumber.includes(searchValue) ||
            patientName.includes(searchValue) ||
            testName.includes(searchValue);

        const matchesStatus =
            !selectedStatus || status.includes(selectedStatus);

        const isVisible = matchesSearch && matchesStatus;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    updateEmptyVerificationMessage(visibleCount === 0);

    if (verificationRecordCount) {
        verificationRecordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} laboratory results.`;
    }
}

// 5. Search Verification Records

if (verificationSearch) {
    verificationSearch.addEventListener(
        'input',
        filterVerificationRecords
    );
}

// 6. Filter by Result Status

if (verificationStatusFilter) {
    verificationStatusFilter.addEventListener(
        'change',
        filterVerificationRecords
    );
}

// 7. Reset Worklist Filters

if (resetVerificationFiltersButton) {
    resetVerificationFiltersButton.addEventListener('click', () => {
        if (verificationSearch) {
            verificationSearch.value = '';
        }

        if (verificationStatusFilter) {
            verificationStatusFilter.value = '';
        }

        filterVerificationRecords();
    });
}

// 8. Display Result Components

function displayResultComponents(row) {
    if (!reviewResultComponentsBody) return;

    reviewResultComponentsBody.replaceChildren();

    // Component information will be supplied by the backend
    // using the saved result records.
    const componentsData = row.dataset.resultComponents;

    let components = [];

    if (componentsData) {
        try {
            components = JSON.parse(componentsData);

            if (!Array.isArray(components)) {
                components = [];
            }
        } catch (error) {
            console.error('Invalid result component data:', error);
            components = [];
        }
    }

    if (components.length === 0) {
        const rowElement = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent =
            'Detailed result components will be displayed when result data is connected.';

        rowElement.appendChild(cell);
        reviewResultComponentsBody.appendChild(rowElement);

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
            cell.textContent = value ?? '—';
            componentRow.appendChild(cell);
        });

        reviewResultComponentsBody.appendChild(componentRow);
    });
}

// 9. Select a Result for Review

function selectVerificationRecord(row) {
    if (!row) return;

    const cells = row.querySelectorAll('td');

    // The backend must provide all seven expected columns.
    if (cells.length !== 7) {
        window.alert(
            'The selected laboratory result has incomplete information.'
        );
        return;
    }

    const selectedRequestNumber = cells[0].textContent.trim();
    const selectedPatientName = cells[1].textContent.trim();
    const selectedTestName = cells[2].textContent.trim();
    const selectedEnteredBy = cells[3].textContent.trim();
    const selectedSubmittedDate = cells[4].textContent.trim();
    const selectedStatus = cells[5].textContent.trim();

    const selectedSpecimenCode =
        row.dataset.specimenCode || '';

    // Populate request and patient information.
    if (reviewRequestNumber) {
        reviewRequestNumber.value = selectedRequestNumber;
    }

    if (reviewPatientName) {
        reviewPatientName.value = selectedPatientName;
    }

    if (reviewTestName) {
        reviewTestName.value = selectedTestName;
    }

    if (reviewEnteredBy) {
        reviewEnteredBy.value = selectedEnteredBy;
    }

    if (reviewSpecimenCode) {
        reviewSpecimenCode.value = selectedSpecimenCode;
    }

    if (reviewSubmittedDate) {
        reviewSubmittedDate.value = selectedSubmittedDate;
    }

    // Display the result component information.
    displayResultComponents(row);

    // Enable the remarks field for review preparation.
    if (verificationRemarks) {
        verificationRemarks.disabled = false;
    }

    // Keep verification and release actions disabled until
    // backend authorization and audit logging are implemented.
    if (returnResultButton) {
        returnResultButton.disabled = true;
    }

    if (verifyResultButton) {
        verifyResultButton.disabled = true;
    }

    if (releaseResultButton) {
        releaseResultButton.disabled = true;
    }

    // Update the selected result status.
    if (verificationFormStatus) {
        verificationFormStatus.textContent = selectedStatus;
        verificationFormStatus.className = 'badge badge-info';
    }

    // Bring the review form into view.
    const reviewCard = document.querySelector(
        '.verification-review-card'
    );

    if (reviewCard) {
        reviewCard.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 10. Handle Worklist Selection

if (verificationTableBody) {
    verificationTableBody.addEventListener('click', (event) => {
        const selectButton = event.target.closest(
            '[data-action="select-verification"]'
        );

        if (!selectButton) return;

        const selectedRow = selectButton.closest('tr');

        if (!selectedRow) return;

        selectVerificationRecord(selectedRow);
    });
}

// 11. Clear Verification Selection

function clearVerificationSelection() {
    const fields = [
        reviewRequestNumber,
        reviewPatientName,
        reviewTestName,
        reviewEnteredBy,
        reviewSpecimenCode,
        reviewSubmittedDate
    ];

    fields.forEach((field) => {
        if (field) field.value = '';
    });

    if (verificationRemarks) {
        verificationRemarks.value = '';
        verificationRemarks.disabled = true;
    }

    if (reviewResultComponentsBody) {
        reviewResultComponentsBody.replaceChildren();

        const emptyRow = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent = 'No result details available.';

        emptyRow.appendChild(cell);
        reviewResultComponentsBody.appendChild(emptyRow);
    }

    if (verificationFormStatus) {
        verificationFormStatus.textContent = 'No Result Selected';
        verificationFormStatus.className = 'badge badge-neutral';
    }

    // Keep all review actions disabled.
    if (returnResultButton) {
        returnResultButton.disabled = true;
    }

    if (verifyResultButton) {
        verifyResultButton.disabled = true;
    }

    if (releaseResultButton) {
        releaseResultButton.disabled = true;
    }
}

if (clearVerificationButton) {
    clearVerificationButton.addEventListener(
        'click',
        clearVerificationSelection
    );
}

// 12. Refresh Verification Worklist

if (refreshVerificationButton) {
    refreshVerificationButton.addEventListener('click', () => {
        window.alert(
            'The verification worklist will retrieve updated results when the Results API is connected.'
        );
    });
}

// 13. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 14. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 15. Toggle Sidebar

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

// 16. Close Sidebar Using Overlay

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 17. Close Sidebar Using Escape Key

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 18. Close Sidebar After Selecting Navigation

const navigationLinks = document.querySelectorAll(
    '.sidebar-nav .nav-link'
);

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 19. Temporary Logout Navigation

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

// 20. Initial Page State

clearVerificationSelection();
filterVerificationRecords();
