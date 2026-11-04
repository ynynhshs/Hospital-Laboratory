
// ==========================================
// MEDILINK LABORATORY
// REQUEST DETAILS JAVASCRIPT
// API-INTEGRATED VERSION
// ==========================================

(function () {
    'use strict';

    // ==========================================
    // 1. ELEMENT REFERENCES
    // ==========================================

    const appLayout = document.querySelector('.app-layout');

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const logoutButton = document.getElementById('logoutButton');

    const requestNumber = document.getElementById('requestNumber');
    const requestStatus = document.getElementById('requestStatus');
    const requestDate = document.getElementById('requestDate');
    const requestPriority = document.getElementById('requestPriority');
    const requestedBy = document.getElementById('requestedBy');
    const requestType = document.getElementById('requestType');

    const requestNotice = document.querySelector(
        '.request-setup-notice'
    );

    const refreshButton = document.getElementById(
        'refreshRequestButton'
    );

    const printButton = document.getElementById(
        'printRequestButton'
    );

    const patientName = document.getElementById('patientName');
    const patientAvatar = document.getElementById('patientAvatar');
    const patientCode = document.getElementById('patientCode');
    const patientBirthDate = document.getElementById('patientBirthDate');
    const patientSex = document.getElementById('patientSex');
    const patientContact = document.getElementById('patientContact');
    const patientRecordType = document.getElementById('patientRecordType');

    const clinicalNotes = document.getElementById('clinicalNotes');

    const requestedTestCount = document.getElementById(
        'requestedTestCount'
    );

    const requestedTestsTableBody = document.getElementById(
        'requestedTestsTableBody'
    );

    const specimenTableBody = document.getElementById(
        'specimenTableBody'
    );

    const processingTimeline = document.getElementById(
        'processingTimeline'
    );

    const requestResultsTableBody = document.getElementById(
        'requestResultsTableBody'
    );

    const requestActivityTimeline = document.getElementById(
        'requestActivityTimeline'
    );

    const userNameElement = document.querySelector(
        '.user-info strong'
    );

    const userRoleElement = document.querySelector(
        '.user-info span'
    );

    const userAvatarElement = document.querySelector(
        '.user-info .user-avatar'
    );

    
    // ==========================================
    // EDIT LABORATORY REQUEST DRAFT ELEMENTS
    // ==========================================

    const editDraftButton = document.getElementById(
        'editDraftButton'
    );

    const requestEditSection = document.getElementById(
        'requestEditSection'
    );

    const requestEditForm = document.getElementById(
        'requestEditForm'
    );

    const editPatientSearch = document.getElementById(
        'editPatientSearch'
    );

    const searchPatientsButton = document.getElementById(
        'searchPatientsButton'
    );

    const patientSearchResults = document.getElementById(
        'patientSearchResults'
    );

    const selectedPatientSummary = document.getElementById(
        'selectedPatientSummary'
    );

    const editTestSearch = document.getElementById(
        'editTestSearch'
    );

    const editTestList = document.getElementById(
        'editTestList'
    );

    const editTestSelectionCount = document.getElementById(
        'editTestSelectionCount'
    );

    const editRequestPriority = document.getElementById(
        'editRequestPriority'
    );

    const editClinicalNotes = document.getElementById(
        'editClinicalNotes'
    );

    const editDraftFeedback = document.getElementById(
        'editDraftFeedback'
    );

    const cancelEditDraftButton = document.getElementById(
        'cancelEditDraftButton'
    );

    const saveEditDraftButton = document.getElementById(
        'saveEditDraftButton'
    );


    // ==========================================
    // 2. REQUEST IDENTIFICATION
    // ==========================================

    const urlParams = new URLSearchParams(
        window.location.search
    );

    const requestId = urlParams.get('requestId');

    let currentRequest = null;


    
    // ==========================================
    // EDIT DRAFT STATE
    // ==========================================

    let authenticatedUser = null;

    let selectedEditPatient = null;

    let activeLaboratoryTests = [];

    let selectedEditTestIds = new Set();

    let originalEditTestIds = [];

    let originalEditValues = null;

    let isEditDraftSaving = false;

    let patientSearchRequestVersion = 0;

    let testsWereModified = false;

    // ==========================================
    // 3. GENERAL DISPLAY HELPERS
    // ==========================================

    function setText(element, value) {
        if (element) {
            element.textContent = value ?? 'Not available';
        }
    }

    function formatUserName(user) {
        if (!user) {
            return 'Unknown User';
        }

        return [
            user.firstName,
            user.lastName
        ].filter(Boolean).join(' ') || user.username || 'Unknown User';
    }

    function formatPatientName(patient) {
        if (!patient) {
            return 'Patient information unavailable';
        }

        return [
            patient.firstName,
            patient.middleName,
            patient.lastName,
            patient.suffix
        ].filter(Boolean).join(' ') || 'Patient information unavailable';
    }

    function formatDate(value) {
        if (!value) {
            return 'Not available';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return 'Not available';
        }

        return date.toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatDateTime(value) {
        if (!value) {
            return 'Not available';
        }

        const date = new Date(value);

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

    function formatLabel(value) {
        return String(value || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => {
                return character.toUpperCase();
            });
    }

    // ==========================================
    // 4. NOTICE HANDLING
    // ==========================================

    function updateRequestNotice(title, message) {
        if (!requestNotice) return;

        const noticeTitle = requestNotice.querySelector('strong');
        const noticeMessage = requestNotice.querySelector('p');

        setText(noticeTitle, title);
        setText(noticeMessage, message);

        requestNotice.hidden = false;
    }

    function hideRequestNotice() {
        if (requestNotice) {
            requestNotice.hidden = true;
        }
    }

    // ==========================================
    // 5. AUTHENTICATED USER INFORMATION
    // ==========================================

    function displayUserInformation(user) {
        const fullName =
            formatUserName(user);

        const roleNames = {
            lab_admin: 'Laboratory Administrator',
            lab_receptionist: 'Laboratory Receptionist',
            lab_technologist: 'Laboratory Technologist',
            result_verifier: 'Result Verifier',
            requesting_clinician: 'Requesting Clinician'
        };

        setText(userNameElement, fullName);

        setText(
            userRoleElement,
            roleNames[user.role] || 'Laboratory Personnel'
        );

        setText(
            userAvatarElement,
            fullName.charAt(0).toUpperCase()
        );
    }

    // ==========================================
    // 6. REQUEST STATUS DISPLAY
    // ==========================================

    function getRequestStatusClass(status) {
        const statusClasses = {
            draft: 'status-pending',
            submitted: 'status-submitted',
            accepted: 'status-accepted',
            in_progress: 'status-in-progress',
            partially_completed: 'status-in-progress',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        };

        return statusClasses[status] || 'status-pending';
    }

    // ==========================================
    // 7. DISPLAY REQUEST OVERVIEW
    // ==========================================

    function displayRequestOverview(request) {
        setText(requestNumber, request.requestNumber);

        setText(
            requestDate,
            formatDate(request.createdAt)
        );

        setText(
            requestPriority,
            String(request.priority || 'routine').toUpperCase()
        );

        setText(
            requestedBy,
            formatUserName(request.requestedBy)
        );

        // These fields do not have corresponding
        // properties in the current backend model.
        setText(requestType, 'Not recorded');

        if (requestStatus) {
            requestStatus.textContent =
                formatLabel(request.status);

            requestStatus.className =
                `status-badge ${getRequestStatusClass(request.status)}`;
        }
    }

    // ==========================================
    // 8. DISPLAY PATIENT INFORMATION
    // ==========================================

    function displayPatientInformation(patient) {
        if (!patient) {
            setText(patientName, 'Patient information unavailable');
            setText(patientCode, 'Patient Code: —');
            setText(patientBirthDate, 'Not available');
            setText(patientSex, 'Not available');
            setText(patientContact, 'Not available');
            setText(patientRecordType, 'Not available');

            return;
        }

        const fullName = formatPatientName(patient);

        setText(patientName, fullName);

        setText(
            patientAvatar,
            fullName.charAt(0).toUpperCase()
        );

        setText(
            patientCode,
            `Patient Code: ${patient.patientCode || 'Not available'}`
        );

        setText(
            patientBirthDate,
            formatDate(patient.dateOfBirth)
        );

        setText(
            patientSex,
            formatLabel(patient.sex)
        );

        setText(
            patientContact,
            patient.contactNumber || 'Not provided'
        );

        // The patient record exists, but a separate
        // patient record type is not defined in the model.
        setText(patientRecordType, 'Not recorded');
    }

    // ==========================================
    // 9. DISPLAY CLINICAL NOTES
    // ==========================================

    function displayClinicalNotes(notes) {
        setText(
            clinicalNotes,
            notes?.trim()
                ? notes.trim()
                : 'No clinical notes available.'
        );
    }

    // ==========================================
    // 10. TABLE EMPTY STATES
    // ==========================================

    function displayTableMessage(
        tableBody,
        message,
        columnCount
    ) {
        if (!tableBody) return;

        tableBody.replaceChildren();

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = columnCount;
        cell.className = 'empty-table-message';
        cell.textContent = message;

        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    // ==========================================
    // 11. REQUESTED TEST STATUS BADGES
    // ==========================================

    function getTestStatusBadgeClass(status) {
        const statusClasses = {
            pending: 'badge-pending',
            in_progress: 'badge-progress',
            completed: 'badge-completed',
            cancelled: 'badge-cancelled'
        };

        return statusClasses[status] || 'badge-neutral';
    }

    // ==========================================
    // 12. DISPLAY REQUESTED LABORATORY TESTS
    // ==========================================

    function displayRequestedTests(tests) {
        if (!requestedTestsTableBody) return;

        requestedTestsTableBody.replaceChildren();

        if (!Array.isArray(tests) || tests.length === 0) {
            displayTableMessage(
                requestedTestsTableBody,
                'No laboratory tests have been added to this request.',
                5
            );

            setText(requestedTestCount, '0 Tests');

            return;
        }

        setText(
            requestedTestCount,
            `${tests.length} ${tests.length === 1 ? 'Test' : 'Tests'}`
        );

        tests.forEach((testItem) => {
            const snapshot = testItem.testSnapshot || {};

            const row = document.createElement('tr');

            const values = [
                snapshot.testCode,
                snapshot.testName,
                snapshot.category,
                snapshot.specimenType
            ];

            values.forEach((value) => {
                const cell = document.createElement('td');

                cell.textContent = value || 'Not available';

                row.appendChild(cell);
            });

            const statusCell = document.createElement('td');

            const statusBadge = document.createElement('span');

            const status = testItem.status || 'pending';

            statusBadge.className =
                `badge ${getTestStatusBadgeClass(status)}`;

            statusBadge.textContent = formatLabel(status);

            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            requestedTestsTableBody.appendChild(row);
        });
    }

    // ==========================================
    // 13. SPECIMEN INFORMATION
    // ==========================================

    function displaySpecimenInformation() {
        displayTableMessage(
            specimenTableBody,
            'No specimen records have been recorded for this request yet.',
            6
        );
    }

    // ==========================================
    // 14. PROCESSING TIMELINE
    // ==========================================

    function displayTimelineEmptyState(
        container,
        title,
        description
    ) {
        if (!container) return;

        container.replaceChildren();

        const emptyState = document.createElement('div');

        emptyState.className = 'timeline-empty-state';

        const icon = document.createElement('span');
        icon.textContent = '◷';

        const heading = document.createElement('strong');
        heading.textContent = title;

        const paragraph = document.createElement('p');
        paragraph.textContent = description;

        emptyState.append(
            icon,
            heading,
            paragraph
        );

        container.appendChild(emptyState);
    }

    function renderTimelineItems(container, activities) {
        if (!container) return;

        container.replaceChildren();

        if (!activities.length) {
            return false;
        }

        const sortedActivities = [...activities].sort(
            (a, b) => {
                return new Date(b.performedAt) -
                    new Date(a.performedAt);
            }
        );

        sortedActivities.forEach((activity) => {
            const item = document.createElement('div');

            item.className = 'timeline-item';

            const marker = document.createElement('div');

            marker.className = 'timeline-marker';

            marker.textContent =
                activity.action === 'completed'
                    ? '✓'
                    : '•';

            const content = document.createElement('div');

            content.className = 'timeline-content';

            const heading = document.createElement('strong');

            heading.textContent =
                formatLabel(activity.action);

            const description = document.createElement('p');

            description.textContent =
                activity.message || 'Activity recorded.';

            const details = document.createElement('span');

            const actor = formatUserName(activity.performedBy);

            details.textContent =
                `${actor} · ${formatDateTime(activity.performedAt)}`;

            content.append(
                heading,
                description,
                details
            );

            item.append(
                marker,
                content
            );

            container.appendChild(item);
        });

        return true;
    }

    function displayProcessingTimeline(activities) {
        // Only display activities that represent actual
        // processing or request workflow transitions.
        const processingActions = [
            'submitted',
            'accepted',
            'processing_started',
            'test_status_updated',
            'partially_completed',
            'completed',
            'cancelled'
        ];

        const processingActivities = (
            Array.isArray(activities) ? activities : []
        ).filter((activity) => {
            return processingActions.includes(activity.action);
        });

        const hasActivities = renderTimelineItems(
            processingTimeline,
            processingActivities
        );

        if (!hasActivities) {
            displayTimelineEmptyState(
                processingTimeline,
                'No processing activity available',
                'Laboratory processing activities will appear here when they are recorded.'
            );
        }
    }

    // ==========================================
    // 15. RESULTS OVERVIEW
    // ==========================================

    function displayResults() {
        // The current LaboratoryRequest model does not
        // contain result records or verification details.
        displayTableMessage(
            requestResultsTableBody,
            'No laboratory results have been recorded yet.',
            5
        );
    }

    // ==========================================
    // 16. REQUEST ACTIVITY TIMELINE
    // ==========================================

    function displayRequestActivities(activities) {
        const validActivities = Array.isArray(activities)
            ? activities
            : [];

        const hasActivities = renderTimelineItems(
            requestActivityTimeline,
            validActivities
        );

        if (!hasActivities) {
            displayTimelineEmptyState(
                requestActivityTimeline,
                'No request activities available',
                'No activity records have been recorded for this request.'
            );
        }
    }

    // ==========================================
    // 17. DISPLAY COMPLETE REQUEST DETAILS
    // ==========================================

    function displayRequestDetails(request) {
        displayRequestOverview(request);

        displayPatientInformation(request.patient);

        displayClinicalNotes(request.clinicalNotes);

        displayRequestedTests(request.tests || []);

        displaySpecimenInformation();

        displayProcessingTimeline(request.activities || []);

        displayResults();

        displayRequestActivities(request.activities || []);

        currentRequest = request;

        updateEditDraftButtonVisibility();

        if (printButton) {
            printButton.disabled = false;
            printButton.title = 'Print laboratory request details.';
        }

        hideRequestNotice();
    }

    
    // ==========================================
    // EDIT DRAFT PERMISSION AND FEEDBACK
    // ==========================================

    function canEditCurrentRequest() {
        if (!currentRequest || !authenticatedUser) {
            return false;
        }

        if (currentRequest.status !== 'draft') {
            return false;
        }

        const allowedRoles = [
            'lab_admin',
            'lab_receptionist',
            'requesting_clinician'
        ];

        if (!allowedRoles.includes(authenticatedUser.role)) {
            return false;
        }

        // Requesting clinicians can only edit their own drafts.
        if (authenticatedUser.role === 'requesting_clinician') {
            const requestingClinicianId =
                currentRequest.requestedBy?._id ||
                currentRequest.requestedBy?.id;

            return String(requestingClinicianId) ===
                String(authenticatedUser.id);
        }

        return true;
    }

    function updateEditDraftButtonVisibility() {
        if (!editDraftButton) return;

        editDraftButton.hidden = !canEditCurrentRequest();
    }

    function showEditDraftFeedback(message, type = '') {
        if (!editDraftFeedback) return;

        editDraftFeedback.textContent = message;

        editDraftFeedback.className =
            'request-edit-feedback';

        if (type) {
            editDraftFeedback.classList.add(`is-${type}`);
        }

        editDraftFeedback.hidden = false;
    }

    function hideEditDraftFeedback() {
        if (!editDraftFeedback) return;

        editDraftFeedback.hidden = true;
        editDraftFeedback.textContent = '';
        editDraftFeedback.className = 'request-edit-feedback';
    }

    
    // ==========================================
    // LOAD ACTIVE LABORATORY TESTS
    // ==========================================

    async function loadActiveLaboratoryTests() {
        const allTests = [];

        const limit = 100;

        const firstResponse = await window.MediLinkAPI.request(
            `/test-catalog?status=active&page=1&limit=${limit}`,
            {
                method: 'GET'
            }
        );

        allTests.push(
            ...(firstResponse.data?.tests || [])
        );

        const totalPages =
            firstResponse.data?.pagination?.totalPages || 1;

        for (let page = 2; page <= totalPages; page++) {
            const response = await window.MediLinkAPI.request(
                `/test-catalog?status=active&page=${page}&limit=${limit}`,
                {
                    method: 'GET'
                }
            );

            allTests.push(
                ...(response.data?.tests || [])
            );
        }

        activeLaboratoryTests = allTests;

        return allTests;
    }

    
    // ==========================================
    // COMPARE LABORATORY TEST SELECTIONS
    // ==========================================

    function haveSameTestIds(firstIds, secondIds) {
        if (firstIds.length !== secondIds.length) {
            return false;
        }

        const secondSet = new Set(
            secondIds.map(String)
        );

        return firstIds.every((id) => {
            return secondSet.has(String(id));
        });
    }


    // ==========================================
    // UPDATE TEST SELECTION COUNT
    // ==========================================

    function updateEditTestSelectionCount() {
        if (!editTestSelectionCount) return;

        const count = selectedEditTestIds.size;

        editTestSelectionCount.textContent =
            `${count} of 50 tests selected`;
    }

    
    // ==========================================
    // IDENTIFY PREVIOUSLY SELECTED INACTIVE TESTS
    // ==========================================

    function getInactiveSelectedTests() {
        const activeTestIds = new Set(
            activeLaboratoryTests.map((test) => {
                return String(test._id || test.id);
            })
        );

        const existingTests = Array.isArray(currentRequest?.tests)
            ? currentRequest.tests
            : [];

        return existingTests.filter((testItem) => {
            const testId = String(
                testItem.test?._id ||
                testItem.test ||
                ''
            );

            return (
                testId &&
                selectedEditTestIds.has(testId) &&
                !activeTestIds.has(testId)
            );
        });
    }


    // ==========================================
    // RENDER ACTIVE LABORATORY TESTS
    // ==========================================


    // ==========================================
    // RENDER ACTIVE LABORATORY TESTS
    // ==========================================

    function renderActiveLaboratoryTests(searchTerm = '') {
        if (!editTestList) return;

        editTestList.replaceChildren();

        const normalizedSearch = searchTerm
            .trim()
            .toLowerCase();

        const filteredTests = activeLaboratoryTests.filter(
            (test) => {
                return [
                    test.testCode,
                    test.testName,
                    test.category,
                    test.specimenType
                ].some((value) => {
                    return String(value || '')
                        .toLowerCase()
                        .includes(normalizedSearch);
                });
            }
        );

        // Display active laboratory tests.
        filteredTests.forEach((test) => {
            const testId = String(test._id || test.id);

            const label = document.createElement('label');

            label.className = 'request-edit-test-option';

            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.value = testId;

            checkbox.checked =
                selectedEditTestIds.has(testId);

            const information = document.createElement('span');

            const testName = document.createElement('strong');

            testName.textContent = test.testName;

            const testDetails = document.createElement('small');

            testDetails.textContent =
                `${test.testCode} | ${test.category} | ${test.specimenType}`;

            information.append(
                testName,
                testDetails
            );

            checkbox.addEventListener('change', () => {

                if (checkbox.checked) {

                    // Previously selected inactive tests must
                    // be removed before replacing the selection.
                    if (getInactiveSelectedTests().length > 0) {
                        checkbox.checked = false;

                        showEditDraftFeedback(
                            'This request contains an inactive test. Remove the inactive test before changing the laboratory test selection.',
                            'error'
                        );

                        return;
                    }

                    if (selectedEditTestIds.size >= 50) {
                        checkbox.checked = false;

                        showEditDraftFeedback(
                            'You can select a maximum of 50 laboratory tests.',
                            'error'
                        );

                        return;
                    }

                    selectedEditTestIds.add(testId);

                } else {
                    selectedEditTestIds.delete(testId);
                }

                testsWereModified = true;

                updateEditTestSelectionCount();

                hideEditDraftFeedback();
            });

            label.append(
                checkbox,
                information
            );

            editTestList.appendChild(label);
        });

        // Display previously selected inactive tests separately.
        const inactiveTests = getInactiveSelectedTests();

        inactiveTests.forEach((testItem) => {
            const snapshot = testItem.testSnapshot || {};

            const testId = String(
                testItem.test?._id ||
                testItem.test
            );

            const label = document.createElement('label');

            label.className =
                'request-edit-test-option request-edit-test-unavailable';

            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.checked = true;

            checkbox.setAttribute(
                'aria-label',
                `Remove inactive test ${snapshot.testName || snapshot.testCode}`
            );

            const information = document.createElement('span');

            const testName = document.createElement('strong');

            testName.textContent =
                snapshot.testName || 'Previously selected test';

            const details = document.createElement('small');

            details.textContent =
                `${snapshot.testCode || 'Unknown Code'} | Inactive or unavailable in catalog. Uncheck to remove this test.`;

            information.append(
                testName,
                details
            );

            checkbox.addEventListener('change', () => {
                if (!checkbox.checked) {
                    selectedEditTestIds.delete(testId);

                    testsWereModified = true;

                    renderActiveLaboratoryTests(
                        editTestSearch?.value || ''
                    );

                    updateEditTestSelectionCount();

                    hideEditDraftFeedback();
                }
            });

            label.append(
                checkbox,
                information
            );

            editTestList.appendChild(label);
        });

        // Show an empty state only when neither category
        // contains anything to display.
        if (
            filteredTests.length === 0 &&
            inactiveTests.length === 0
        ) {
            const emptyMessage = document.createElement('p');

            emptyMessage.className = 'request-edit-loading';

            emptyMessage.textContent = normalizedSearch
                ? 'No matching active laboratory tests found.'
                : 'No active laboratory tests are available.';

            editTestList.appendChild(emptyMessage);
        }

        updateEditTestSelectionCount();
    }


    
    // ==========================================
    // PATIENT SELECTION FOR EDIT DRAFT
    // ==========================================

    function displaySelectedPatientSummary(patient) {
        if (!selectedPatientSummary) return;

        if (!patient) {
            selectedPatientSummary.textContent =
                'No patient selected.';

            return;
        }

        const patientName = formatPatientName(patient);

        selectedPatientSummary.textContent =
            `${patientName} | Patient Code: ${patient.patientCode || 'Not available'}`;
    }

    // ==========================================
    // SELECT PATIENT
    // ==========================================

    function selectEditPatient(patient) {
        if (!patient) return;

        selectedEditPatient = patient;

        displaySelectedPatientSummary(patient);

        if (editPatientSearch) {
            editPatientSearch.value =
                `${formatPatientName(patient)} (${patient.patientCode})`;
        }

        if (patientSearchResults) {
            patientSearchResults.replaceChildren();
            patientSearchResults.hidden = true;
        }

        hideEditDraftFeedback();
    }

    // ==========================================
    // RENDER PATIENT SEARCH RESULTS
    // ==========================================

    function renderPatientSearchResults(patients) {
        if (!patientSearchResults) return;

        patientSearchResults.replaceChildren();

        if (!Array.isArray(patients) || patients.length === 0) {
            const emptyMessage = document.createElement('p');

            emptyMessage.className = 'request-edit-loading';
            emptyMessage.textContent = 'No matching patients found.';

            patientSearchResults.appendChild(emptyMessage);
            patientSearchResults.hidden = false;

            return;
        }

        patients.forEach((patient) => {
            const patientButton = document.createElement('button');

            patientButton.type = 'button';
            patientButton.className = 'request-edit-result';
            patientButton.setAttribute('role', 'option');
            patientButton.setAttribute('aria-selected', 'false');

            const name = document.createElement('strong');

            name.textContent = formatPatientName(patient);

            const details = document.createElement('span');

            details.textContent =
                `Patient Code: ${patient.patientCode || 'Not available'} | Contact: ${patient.contactNumber || 'Not provided'}`;

            patientButton.append(
                name,
                details
            );

            patientButton.addEventListener('click', () => {
                selectEditPatient(patient);
            });

            patientSearchResults.appendChild(patientButton);
        });

        patientSearchResults.hidden = false;
    }

    // ==========================================
    // SEARCH PATIENTS THROUGH BACKEND API
    // ==========================================

    async function searchPatientsForEdit() {
        const searchTerm =
            editPatientSearch?.value.trim() || '';

        if (!searchTerm) {
            showEditDraftFeedback(
                'Enter a patient name, patient code, or contact number.',
                'error'
            );

            return;
        }

        const requestVersion =
            ++patientSearchRequestVersion;

        if (searchPatientsButton) {
            searchPatientsButton.disabled = true;
            searchPatientsButton.textContent = 'Searching...';
        }

        if (patientSearchResults) {
            patientSearchResults.replaceChildren();

            const loadingMessage =
                document.createElement('p');

            loadingMessage.className = 'request-edit-loading';
            loadingMessage.textContent = 'Searching patients...';

            patientSearchResults.appendChild(loadingMessage);
            patientSearchResults.hidden = false;
        }

        try {
            const response = await window.MediLinkAPI.request(
                `/patients?search=${encodeURIComponent(searchTerm)}&page=1&limit=10`,
                {
                    method: 'GET'
                }
            );

            // Ignore results from an older search.
            if (
                requestVersion !== patientSearchRequestVersion
            ) {
                return;
            }

            const patients = response.data?.patients || [];

            renderPatientSearchResults(patients);

        } catch (error) {
            if (
                requestVersion !== patientSearchRequestVersion
            ) {
                return;
            }

            console.error(
                'Patient search failed:',
                error
            );

            patientSearchResults?.replaceChildren();

            if (patientSearchResults) {
                patientSearchResults.hidden = true;
            }

            showEditDraftFeedback(
                error.message || 'Unable to search patients.',
                'error'
            );

        } finally {
            if (
                requestVersion === patientSearchRequestVersion &&
                searchPatientsButton
            ) {
                searchPatientsButton.disabled = false;
                searchPatientsButton.textContent = 'Search';
            }
        }
    }

    // ==========================================
    // PATIENT SEARCH EVENT LISTENERS
    // ==========================================

    if (searchPatientsButton) {
        searchPatientsButton.addEventListener(
            'click',
            searchPatientsForEdit
        );
    }

    if (editPatientSearch) {
        editPatientSearch.addEventListener(
            'keydown',
            (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    searchPatientsForEdit();
                }
            }
        );
    }

    
    // ==========================================
    // OPEN AND POPULATE EDIT DRAFT FORM
    // ==========================================

    async function openEditDraftForm() {
        if (!canEditCurrentRequest()) {
            return;
        }

        hideEditDraftFeedback();

        // Preserve the currently selected patient.
        selectedEditPatient = currentRequest.patient;

        // Prepare the selected patient information.
        displaySelectedPatientSummary(selectedEditPatient);

        if (editPatientSearch) {
            editPatientSearch.value = '';
        }

        // Retrieve the original requested test IDs.
        const existingTestIds = (
            Array.isArray(currentRequest.tests)
                ? currentRequest.tests
                : []
        ).map((testItem) => {
            return String(
                testItem.test?._id ||
                testItem.test ||
                ''
            );
        }).filter(Boolean);

        // Preserve the original selections.
        originalEditTestIds = [...existingTestIds];

        selectedEditTestIds = new Set(existingTestIds);

        testsWereModified = false;

        // Preserve the original form values.
        originalEditValues = {
            patientId: String(
                currentRequest.patient?._id ||
                currentRequest.patient?.id ||
                ''
            ),

            testIds: [...existingTestIds],

            priority: currentRequest.priority || 'routine',

            clinicalNotes: currentRequest.clinicalNotes || ''
        };

        // Populate priority.
        if (editRequestPriority) {
            editRequestPriority.value =
                currentRequest.priority || 'routine';
        }

        // Populate clinical notes.
        if (editClinicalNotes) {
            editClinicalNotes.value =
                currentRequest.clinicalNotes || '';
        }

        // Reset test search.
        if (editTestSearch) {
            editTestSearch.value = '';
        }

        updateEditTestSelectionCount();

        // Display the edit form.
        if (requestEditSection) {
            requestEditSection.hidden = false;
        }

        // Display the test-loading state.
        if (editTestList) {
            editTestList.replaceChildren();

            const loadingMessage =
                document.createElement('p');

            loadingMessage.className = 'request-edit-loading';

            loadingMessage.textContent =
                'Loading active laboratory tests...';

            editTestList.appendChild(loadingMessage);
        }

        // Load active tests from the backend.
        try {
            await loadActiveLaboratoryTests();

            // Display the active tests with existing selections.
            renderActiveLaboratoryTests();

        } catch (error) {
            console.error(
                'Failed to load active laboratory tests:',
                error
            );

            if (editTestList) {
                editTestList.replaceChildren();

                const errorMessage =
                    document.createElement('p');

                errorMessage.className = 'request-edit-loading';

                errorMessage.textContent =
                    'Unable to load active laboratory tests. Please try again later.';

                editTestList.appendChild(errorMessage);
            }

            showEditDraftFeedback(
                error.message ||
                'Unable to retrieve active laboratory tests.',
                'error'
            );
        }

        // Move the user to the edit form.
        requestEditSection?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    // ==========================================
    // CLOSE EDIT DRAFT FORM
    // ==========================================

    function closeEditDraftForm() {
        if (isEditDraftSaving) {
            return;
        }

        if (requestEditSection) {
            requestEditSection.hidden = true;
        }

        if (patientSearchResults) {
            patientSearchResults.replaceChildren();
            patientSearchResults.hidden = true;
        }

        hideEditDraftFeedback();

        editDraftButton?.focus();
    }

    
    // ==========================================
    // SAVE UPDATED LABORATORY REQUEST DRAFT
    // ==========================================

    async function saveEditDraft(event) {
        event.preventDefault();

        if (isEditDraftSaving) {
            return;
        }

        // Verify that the current request remains editable.
        if (!canEditCurrentRequest()) {
            showEditDraftFeedback(
                'This laboratory request can no longer be edited.',
                'error'
            );

            return;
        }

        if (!originalEditValues || !selectedEditPatient) {
            showEditDraftFeedback(
                'Please select a valid patient before saving.',
                'error'
            );

            return;
        }

        const selectedPatientId = String(
            selectedEditPatient._id ||
            selectedEditPatient.id ||
            ''
        );

        if (!selectedPatientId) {
            showEditDraftFeedback(
                'The selected patient has an invalid ID.',
                'error'
            );

            return;
        }

        // Read and validate the selected laboratory tests.
        const selectedTestIds =
            Array.from(selectedEditTestIds);

        if (selectedTestIds.length > 50) {
            showEditDraftFeedback(
                'You can select a maximum of 50 laboratory tests.',
                'error'
            );

            return;
        }

        // Prevent replacing the selection while an
        // existing inactive test is still selected.
        const inactiveTests = getInactiveSelectedTests();

        const testSelectionChanged = !haveSameTestIds(
            selectedTestIds,
            originalEditTestIds
        );

        if (
            testSelectionChanged &&
            inactiveTests.length > 0
        ) {
            showEditDraftFeedback(
                'Please remove previously selected inactive tests before changing the laboratory test selection.',
                'error'
            );

            return;
        }

        const priority = editRequestPriority.value;

        const clinicalNotes = editClinicalNotes.value;

        const allowedPriorities = [
            'routine',
            'urgent',
            'stat'
        ];

        if (!allowedPriorities.includes(priority)) {
            showEditDraftFeedback(
                'Please select a valid request priority.',
                'error'
            );

            return;
        }

        if (clinicalNotes.trim().length > 2000) {
            showEditDraftFeedback(
                'Clinical notes must not exceed 2,000 characters.',
                'error'
            );

            return;
        }

        // Build a PATCH body containing only changed fields.
        const updateData = {};

        if (
            selectedPatientId !==
            originalEditValues.patientId
        ) {
            updateData.patientId = selectedPatientId;
        }

        if (testSelectionChanged) {
            updateData.testIds = selectedTestIds;
        }

        if (priority !== originalEditValues.priority) {
            updateData.priority = priority;
        }

        if (
            clinicalNotes.trim() !==
            originalEditValues.clinicalNotes.trim()
        ) {
            updateData.clinicalNotes = clinicalNotes;
        }

        // Avoid unnecessary API requests.
        if (Object.keys(updateData).length === 0) {
            showEditDraftFeedback(
                'No changes were detected. Your laboratory request remains unchanged.',
                ''
            );

            return;
        }

        isEditDraftSaving = true;

        // Disable the form while saving.
        if (requestEditForm) {
            requestEditForm.querySelectorAll(
                'input, select, textarea, button'
            ).forEach((control) => {
                control.disabled = true;
            });
        }

        if (saveEditDraftButton) {
            saveEditDraftButton.textContent = 'Saving Changes...';
        }

        showEditDraftFeedback(
            'Saving your laboratory request changes...',
            ''
        );

        let updateSucceeded = false;

        try {
            // Send the actual PATCH request.
            const response = await window.MediLinkAPI.request(
                `/lab-requests/${encodeURIComponent(requestId)}`,
                {
                    method: 'PATCH',
                    body: updateData
                }
            );

            const updatedRequest =
                response.data?.laboratoryRequest;

            if (!updatedRequest) {
                throw new Error(
                    'The server did not return the updated laboratory request.'
                );
            }

            // Refresh the displayed request using the
            // populated document returned by the backend.
            displayRequestDetails(updatedRequest);

            updateSucceeded = true;

        } catch (error) {
            console.error(
                'Laboratory request draft update failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            showEditDraftFeedback(
                error.message ||
                'Unable to update the laboratory request. Please try again.',
                'error'
            );

        } finally {
            isEditDraftSaving = false;

            if (requestEditForm) {
                requestEditForm.querySelectorAll(
                    'input, select, textarea, button'
                ).forEach((control) => {
                    control.disabled = false;
                });
            }

            if (saveEditDraftButton) {
                saveEditDraftButton.textContent = 'Save Changes';
            }
        }

        if (updateSucceeded) {
            // Close the form after successful updating.
            closeEditDraftForm();

            // Display confirmation.
            updateRequestNotice(
                'Draft Updated Successfully',
                'Your laboratory request changes have been saved successfully.'
            );

            // Move the user to the updated request details.
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }


    // ==========================================
    // EDIT DRAFT BUTTON EVENTS
    // ==========================================

    if (editDraftButton) {
        editDraftButton.addEventListener(
            'click',
            openEditDraftForm
        );
    }

    if (cancelEditDraftButton) {
        cancelEditDraftButton.addEventListener(
            'click',
            closeEditDraftForm
        );
    }

        // ==========================================
    // SAVE EDIT DRAFT FORM EVENT
    // ==========================================

    if (requestEditForm) {
        requestEditForm.addEventListener(
            'submit',
            saveEditDraft
        );
    }

    // ==========================================
    // FILTER ACTIVE TESTS
    // ==========================================

    if (editTestSearch) {
        editTestSearch.addEventListener(
            'input',
            () => {
                renderActiveLaboratoryTests(
                    editTestSearch.value
                );
            }
        );
    }

    // ==========================================
    // CLEAR PATIENT SELECTION WHEN SEARCH CHANGES
    // ==========================================

    if (editPatientSearch) {
        editPatientSearch.addEventListener(
            'input',
            () => {
                selectedEditPatient = null;

                displaySelectedPatientSummary(null);

                if (patientSearchResults) {
                    patientSearchResults.replaceChildren();
                    patientSearchResults.hidden = true;
                }
            }
        );
    }





    // ==========================================
    // 18. RETRIEVE REQUEST FROM BACKEND API
    // ==========================================

    async function loadRequestDetails() {
        if (!requestId || !requestId.trim()) {
            setText(requestNumber, 'No Request Selected');

            updateRequestNotice(
                'No Request Selected',
                'No laboratory request identifier was supplied. Return to Laboratory Requests and select a record.'
            );

            return;
        }

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = 'Refreshing...';
        }

        if (printButton) {
            printButton.disabled = true;
        }

        updateRequestNotice(
            'Loading Request Details',
            'Retrieving the selected laboratory request from the MediLink database.'
        );

        try {
            const response = await window.MediLinkAPI.request(
                `/lab-requests/${encodeURIComponent(requestId)}`,
                {
                    method: 'GET'
                }
            );

            const laboratoryRequest =
                response.data?.laboratoryRequest;

            if (!laboratoryRequest) {
                throw new Error(
                    'The laboratory request response contains no request information.'
                );
            }

            displayRequestDetails(laboratoryRequest);

        } catch (error) {
            console.error(
                'Laboratory request details retrieval failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            if (error.status === 404) {
                setText(requestNumber, 'Request Not Found');

                updateRequestNotice(
                    'Request Not Found',
                    'The requested laboratory record does not exist or is not available to your account.'
                );

            } else {
                updateRequestNotice(
                    'Unable to Load Request Details',
                    error.message || 'An unexpected error occurred.'
                );
            }

        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = '↻ Refresh';
            }
        }
    }

    // ==========================================
    // 19. REFRESH REQUEST DETAILS
    // ==========================================

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadRequestDetails();
        });
    }

    // ==========================================
    // 20. PRINT REQUEST DETAILS
    // ==========================================

    if (printButton) {
        printButton.disabled = true;

        printButton.addEventListener('click', () => {
            if (!currentRequest) {
                window.alert(
                    'Request information is not available for printing.'
                );

                return;
            }

            window.print();
        });
    }

    // ==========================================
    // 21. MOBILE SIDEBAR
    // ==========================================

    function openSidebar() {
        if (appLayout) {
            appLayout.classList.add('sidebar-open');
        }

        if (sidebarToggle) {
            sidebarToggle.setAttribute(
                'aria-expanded',
                'true'
            );

            sidebarToggle.setAttribute(
                'aria-label',
                'Close navigation menu'
            );
        }
    }

    function closeSidebar() {
        if (appLayout) {
            appLayout.classList.remove('sidebar-open');
        }

        if (sidebarToggle) {
            sidebarToggle.setAttribute(
                'aria-expanded',
                'false'
            );

            sidebarToggle.setAttribute(
                'aria-label',
                'Open navigation menu'
            );
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isOpen =
                appLayout?.classList.contains('sidebar-open');

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

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    document.querySelectorAll(
        '.sidebar-nav .nav-link'
    ).forEach((link) => {
        link.addEventListener('click', closeSidebar);
    });

    // ==========================================
    // 22. LOGOUT
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
    // 23. INITIALIZE REQUEST DETAILS PAGE
    // ==========================================

    async function initializeRequestDetails() {
        try {
            // Verify the authenticated session.
            const user =
    await window.MediLinkAuth.getCurrentUser();

        // Store the authenticated user for role-based permissions.
        authenticatedUser = user;

        // Display the actual authenticated user.
        displayUserInformation(user);

            // Retrieve the selected request.
            await loadRequestDetails();

        } catch (error) {
            console.error(
                'Request Details authentication failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            updateRequestNotice(
                'Unable to Initialize Request Details',
                error.message || 'Unable to verify your account.'
            );
        }
    }

    // ==========================================
    // 24. START PAGE
    // ==========================================

    closeSidebar();

    initializeRequestDetails();

})();
