
// ==========================================
// MEDILINK LABORATORY
// RESULT ENTRY JAVASCRIPT
// ==========================================

// 1. Get Page Elements

const appLayout = document.getElementById('appLayout');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutButton = document.getElementById('logoutButton');

const resultWorklistSearch = document.getElementById(
    'resultWorklistSearch'
);

const resultWorklistStatusFilter = document.getElementById(
    'resultWorklistStatusFilter'
);

const resetResultWorklistFiltersButton = document.getElementById(
    'resetResultWorklistFiltersButton'
);

const refreshResultWorklistButton = document.getElementById(
    'refreshResultWorklistButton'
);

const worklistTableBody = document.getElementById(
    'resultWorklistTableBody'
);

const worklistRecordCount = document.getElementById(
    'resultWorklistRecordCount'
);

// Result Entry Form Elements

const resultEntryForm = document.getElementById('resultEntryForm');
const resultFormStatus = document.getElementById('resultFormStatus');

const resultRequestNumber = document.getElementById('resultRequestNumber');
const resultPatientName = document.getElementById('resultPatientName');
const resultTestName = document.getElementById('resultTestName');
const resultSpecimenCode = document.getElementById('resultSpecimenCode');

const resultSpecimenType = document.getElementById('resultSpecimenType');
const resultCompletedDate = document.getElementById('resultCompletedDate');

const resultValue = document.getElementById('resultValue');
const resultUnit = document.getElementById('resultUnit');
const resultReferenceRange = document.getElementById('resultReferenceRange');
const resultRemarks = document.getElementById('resultRemarks');

const resultGeneralNotes = document.getElementById('resultGeneralNotes');

const clearResultFormButton = document.getElementById(
    'clearResultFormButton'
);

const saveResultDraftButton = document.getElementById(
    'saveResultDraftButton'
);

const submitResultButton = document.getElementById(
    'submitResultButton'
);

// 2. Get Worklist Records

function getResultWorklistRows() {
    if (!worklistTableBody) return [];

    return Array.from(
        worklistTableBody.querySelectorAll(
            'tr[data-result-row="true"]'
        )
    );
}

// 3. Display No Matching Results Message

function updateEmptyWorklistMessage(shouldShow) {
    if (!worklistTableBody) return;

    let emptyRow = worklistTableBody.querySelector(
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
        heading.textContent = 'No matching laboratory tests';

        const description = document.createElement('p');
        description.className = 'empty-state-description';
        description.textContent =
            'Try changing your search or result status filter.';

        message.append(heading, description);
        cell.appendChild(message);
        emptyRow.appendChild(cell);

        worklistTableBody.appendChild(emptyRow);
    }

    if (!shouldShow && emptyRow) {
        emptyRow.remove();
    }
}

// 4. Filter the Result Worklist

function filterResultWorklist() {
    if (!worklistTableBody) return;

    const rows = getResultWorklistRows();

    // Preserve the original empty state when there are no records.
    if (rows.length === 0) {
        updateEmptyWorklistMessage(false);

        if (worklistRecordCount) {
            worklistRecordCount.textContent =
                'No laboratory tests available.';
        }

        return;
    }

    const searchValue = resultWorklistSearch
        ? resultWorklistSearch.value.trim().toLowerCase()
        : '';

    const selectedStatus = resultWorklistStatusFilter
        ? resultWorklistStatusFilter.value.trim().toLowerCase()
        : '';

    let visibleCount = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // Expected columns:
        // 0 = Request Number
        // 1 = Patient
        // 2 = Laboratory Test
        // 3 = Specimen Code
        // 4 = Completed Date
        // 5 = Result Status
        // 6 = Action

        const requestNumber = cells[0].textContent.toLowerCase();
        const patientName = cells[1].textContent.toLowerCase();
        const testName = cells[2].textContent.toLowerCase();
        const resultStatus = cells[5].textContent.toLowerCase().trim();

        const matchesSearch =
            requestNumber.includes(searchValue) ||
            patientName.includes(searchValue) ||
            testName.includes(searchValue);

        const matchesStatus =
            !selectedStatus ||
            resultStatus.includes(selectedStatus);

        const isVisible = matchesSearch && matchesStatus;

        row.hidden = !isVisible;

        if (isVisible) {
            visibleCount++;
        }
    });

    updateEmptyWorklistMessage(visibleCount === 0);

    if (worklistRecordCount) {
        worklistRecordCount.textContent =
            `Showing ${visibleCount} of ${rows.length} laboratory tests.`;
    }
}

// 5. Search Laboratory Tests

if (resultWorklistSearch) {
    resultWorklistSearch.addEventListener(
        'input',
        filterResultWorklist
    );
}

// 6. Filter by Result Status

if (resultWorklistStatusFilter) {
    resultWorklistStatusFilter.addEventListener(
        'change',
        filterResultWorklist
    );
}

// 7. Reset Worklist Filters

if (resetResultWorklistFiltersButton) {
    resetResultWorklistFiltersButton.addEventListener('click', () => {
        if (resultWorklistSearch) {
            resultWorklistSearch.value = '';
        }

        if (resultWorklistStatusFilter) {
            resultWorklistStatusFilter.value = '';
        }

        filterResultWorklist();
    });
}

// 8. Reset Result Entry Form

function clearResultForm() {
    if (resultEntryForm) {
        resultEntryForm.reset();
    }

    // Clear selected request and patient information.
    if (resultRequestNumber) resultRequestNumber.value = '';
    if (resultPatientName) resultPatientName.value = '';
    if (resultTestName) resultTestName.value = '';
    if (resultSpecimenCode) resultSpecimenCode.value = '';

    // Clear specimen information.
    if (resultSpecimenType) resultSpecimenType.value = '';
    if (resultCompletedDate) resultCompletedDate.value = '';

    // Clear result details.
    if (resultValue) resultValue.value = '';
    if (resultUnit) resultUnit.value = '';
    if (resultReferenceRange) resultReferenceRange.value = '';
    if (resultRemarks) resultRemarks.value = '';

    if (resultGeneralNotes) {
        resultGeneralNotes.value = '';
    }

    // Disable result entry fields until a test is selected.
    if (resultValue) resultValue.disabled = true;
    if (resultRemarks) resultRemarks.disabled = true;

    if (resultGeneralNotes) {
        resultGeneralNotes.disabled = true;
    }

    // Keep saving and submission disabled until API integration.
    if (saveResultDraftButton) {
        saveResultDraftButton.disabled = true;
    }

    if (submitResultButton) {
        submitResultButton.disabled = true;
    }

    if (resultFormStatus) {
        resultFormStatus.textContent = 'No Test Selected';
        resultFormStatus.className = 'badge badge-neutral';
    }
}

// 9. Select a Laboratory Test for Result Entry

function selectResultWorklistItem(row) {
    if (!row) return;

    const cells = row.querySelectorAll('td');

    // The backend must eventually provide these seven columns.
    if (cells.length !== 7) {
        window.alert('The selected laboratory test has incomplete information.');
        return;
    }

    const selectedRequestNumber = cells[0].textContent.trim();
    const selectedPatientName = cells[1].textContent.trim();
    const selectedTestName = cells[2].textContent.trim();
    const selectedSpecimenCode = cells[3].textContent.trim();
    const selectedCompletedDate = cells[4].textContent.trim();
    const selectedResultStatus = cells[5].textContent.trim();

    // Populate the result entry form.
    if (resultRequestNumber) {
        resultRequestNumber.value = selectedRequestNumber;
    }

    if (resultPatientName) {
        resultPatientName.value = selectedPatientName;
    }

    if (resultTestName) {
        resultTestName.value = selectedTestName;
    }

    if (resultSpecimenCode) {
        resultSpecimenCode.value = selectedSpecimenCode;
    }

    if (resultCompletedDate) {
        resultCompletedDate.value = selectedCompletedDate;
    }

    // Additional information must come from the selected record.
    // These values must be supplied by the backend using approved
    // catalog configuration and result snapshots.
    if (resultSpecimenType) {
        resultSpecimenType.value = row.dataset.specimenType || '';
    }

    if (resultUnit) {
        resultUnit.value = row.dataset.unit || '';
    }

    if (resultReferenceRange) {
        resultReferenceRange.value =
            row.dataset.referenceRange || '';
    }

    // Enable the result entry fields after selecting a test.
    if (resultValue) resultValue.disabled = false;
    if (resultRemarks) resultRemarks.disabled = false;

    if (resultGeneralNotes) {
        resultGeneralNotes.disabled = false;
    }

    // Saving and submission remain disabled until backend integration.
    if (saveResultDraftButton) {
        saveResultDraftButton.disabled = true;
    }

    if (submitResultButton) {
        submitResultButton.disabled = true;
    }

    if (resultFormStatus) {
        resultFormStatus.textContent = selectedResultStatus || 'Selected';
        resultFormStatus.className = 'badge badge-info';
    }

    // Bring the result form into view.
    const resultEntryCard = document.querySelector('.result-entry-card');

    if (resultEntryCard) {
        resultEntryCard.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 10. Handle Result Worklist Selection

if (worklistTableBody) {
    worklistTableBody.addEventListener('click', (event) => {
        const selectButton = event.target.closest(
            '[data-action="select-result"]'
        );

        if (!selectButton) return;

        const selectedRow = selectButton.closest('tr');

        if (!selectedRow) return;

        selectResultWorklistItem(selectedRow);
    });
}

// 11. Clear Form Button

if (clearResultFormButton) {
    clearResultFormButton.addEventListener('click', () => {
        clearResultForm();
    });
}

// 12. Prevent Unconnected Form Submission

if (resultEntryForm) {
    resultEntryForm.addEventListener('submit', (event) => {
        event.preventDefault();

        window.alert(
            'Result submission is not yet connected to the backend.'
        );
    });
}

// 13. Refresh Worklist

if (refreshResultWorklistButton) {
    refreshResultWorklistButton.addEventListener('click', () => {
        window.alert(
            'The result worklist will retrieve updated laboratory tests once the Results API is connected.'
        );
    });
}

// 14. Open Mobile Sidebar

function openSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.add('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation');
}

// 15. Close Mobile Sidebar

function closeSidebar() {
    if (!appLayout || !sidebarToggle) return;

    appLayout.classList.remove('sidebar-open');

    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation');
}

// 16. Toggle Sidebar

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

// 17. Close Sidebar Using Overlay

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// 18. Close Sidebar Using Escape Key

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebar();
    }
});

// 19. Close Sidebar After Selecting Navigation

const navigationLinks = document.querySelectorAll(
    '.sidebar-nav .nav-link'
);

navigationLinks.forEach((link) => {
    link.addEventListener('click', closeSidebar);
});

// 20. Temporary Logout Navigation

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

// 21. Initial Page State

clearResultForm();
filterResultWorklist();
