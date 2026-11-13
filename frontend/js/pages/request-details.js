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

    const requestNotice = document.querySelector('.request-setup-notice');
    const refreshButton = document.getElementById('refreshRequestButton');
    const printButton = document.getElementById('printRequestButton');

    const patientName = document.getElementById('patientName');
    const patientAvatar = document.getElementById('patientAvatar');
    const patientCode = document.getElementById('patientCode');
    const patientBirthDate = document.getElementById('patientBirthDate');
    const patientSex = document.getElementById('patientSex');
    const patientContact = document.getElementById('patientContact');
    const patientRecordType = document.getElementById('patientRecordType');

    const clinicalNotes = document.getElementById('clinicalNotes');
    const requestedTestCount = document.getElementById('requestedTestCount');
    const requestedTestsTableBody = document.getElementById('requestedTestsTableBody');
    const specimenTableBody = document.getElementById('specimenTableBody');
    const processingTimeline = document.getElementById('processingTimeline');
    const requestResultsTableBody = document.getElementById('requestResultsTableBody');
    const requestActivityTimeline = document.getElementById('requestActivityTimeline');

    const userNameElement = document.querySelector('.topbar-user .user-name');
    const userRoleElement = document.querySelector('.topbar-user .user-role');
    const userAvatarElement = document.querySelector('.topbar-user .user-avatar');

    // EDIT DRAFT ELEMENTS
    const editDraftButton = document.getElementById('editDraftButton');
    const submitRequestButton = document.getElementById('submitRequestButton');
    const requestEditSection = document.getElementById('requestEditSection');
    const requestEditForm = document.getElementById('requestEditForm');
    const editPatientSearch = document.getElementById('editPatientSearch');
    const searchPatientsButton = document.getElementById('searchPatientsButton');
    const patientSearchResults = document.getElementById('patientSearchResults');
    const selectedPatientSummary = document.getElementById('selectedPatientSummary');
    const editTestSearch = document.getElementById('editTestSearch');
    const editTestList = document.getElementById('editTestList');
    const editTestSelectionCount = document.getElementById('editTestSelectionCount');
    const editRequestPriority = document.getElementById('editRequestPriority');
    const editClinicalNotes = document.getElementById('editClinicalNotes');
    const editDraftFeedback = document.getElementById('editDraftFeedback');
    const cancelEditDraftButton = document.getElementById('cancelEditDraftButton');
    const saveEditDraftButton = document.getElementById('saveEditDraftButton');

    // ==========================================
    // 2. STATE
    // ==========================================

    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('requestId');

    let currentRequest = null;
    let authenticatedUser = null;
    let selectedEditPatient = null;
    let activeLaboratoryTests = [];
    let selectedEditTestIds = new Set();
    let originalEditTestIds = [];
    let originalEditValues = null;
    let isEditDraftSaving = false;
    let isSubmittingRequest = false;
    let patientSearchRequestVersion = 0;
    let testsWereModified = false;

    // ==========================================
    // 3. HELPERS
    // ==========================================

    function setText(element, value) {
        if (element) element.textContent = value ?? 'Not available';
    }

    function formatUserName(user) {
        if (!user) return 'Unknown User';
        return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown User';
    }

    function formatPatientName(patient) {
        if (!patient) return 'Patient information unavailable';
        return [patient.firstName, patient.middleName, patient.lastName, patient.suffix].filter(Boolean).join(' ') || 'Patient information unavailable';
    }

    function formatDate(value) {
        if (!value) return 'Not available';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not available';
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatDateTime(value) {
        if (!value) return 'Not available';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not available';
        return date.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function formatLabel(value) {
        return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function updateRequestNotice(title, message) {
        if (!requestNotice) return;
        const noticeTitle = requestNotice.querySelector('strong');
        const noticeMessage = requestNotice.querySelector('p');
        setText(noticeTitle, title);
        setText(noticeMessage, message);
        requestNotice.hidden = false;
    }

    function hideRequestNotice() {
        if (requestNotice) requestNotice.hidden = true;
    }

    function displayUserInformation(user) {
        const fullName = formatUserName(user);
        const roleNames = {
            lab_admin: 'Laboratory Administrator',
            lab_receptionist: 'Laboratory Receptionist',
            lab_technologist: 'Laboratory Technologist',
            result_verifier: 'Result Verifier',
            requesting_clinician: 'Requesting Clinician'
        };
        setText(userNameElement, fullName);
        setText(userRoleElement, roleNames[user.role] || 'Laboratory Personnel');
        setText(userAvatarElement, fullName.charAt(0).toUpperCase());
    }

    function getRequestStatusClass(status) {
        const statusClasses = {
            draft: 'status-pending', submitted: 'status-submitted', accepted: 'status-accepted',
            in_progress: 'status-in-progress', partially_completed: 'status-in-progress',
            completed: 'status-completed', cancelled: 'status-cancelled'
        };
        return statusClasses[status] || 'status-pending';
    }

    // ==========================================
    // 4. DISPLAY LOGIC
    // ==========================================

    function displayRequestOverview(request) {
        setText(requestNumber, request.requestNumber);
        setText(requestDate, formatDate(request.createdAt));
        setText(requestPriority, String(request.priority || 'routine').toUpperCase());
        setText(requestedBy, formatUserName(request.requestedBy));
        setText(requestType, 'Not recorded');

        if (requestStatus) {
            requestStatus.textContent = formatLabel(request.status);
            requestStatus.className = `status-badge ${getRequestStatusClass(request.status)}`;
        }
    }

    function displayPatientInformation(patient) {
        if (!patient) {
            setText(patientName, 'Patient information unavailable');
            setText(patientCode, 'Patient ID: —');
            setText(patientBirthDate, 'Not available');
            setText(patientSex, 'Not available');
            setText(patientContact, 'Not available');
            setText(patientRecordType, 'Not available');
            return;
        }
        const fullName = formatPatientName(patient);
        setText(patientName, fullName);
        setText(patientAvatar, fullName.charAt(0).toUpperCase());
        setText(patientCode, `Patient ID: ${patient.patientId || 'Not available'}`);
        setText(patientBirthDate, formatDate(patient.birthDate));
        setText(patientSex, formatLabel(patient.sex));
        setText(patientContact, patient.contactNo || 'Not provided');
        setText(patientRecordType, 'Not recorded');
    }

    function displayClinicalNotes(notes) {
        setText(clinicalNotes, notes?.trim() ? notes.trim() : 'No clinical notes available.');
    }

    function displayTableMessage(tableBody, message, columnCount) {
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

    function getTestStatusBadgeClass(status) {
        const statusClasses = { pending: 'badge-pending', in_progress: 'badge-progress', completed: 'badge-completed', cancelled: 'badge-cancelled' };
        return statusClasses[status] || 'badge-neutral';
    }

    function displayRequestedTests(tests) {
        if (!requestedTestsTableBody) return;
        requestedTestsTableBody.replaceChildren();

        if (!Array.isArray(tests) || tests.length === 0) {
            displayTableMessage(requestedTestsTableBody, 'No laboratory tests have been added to this request.', 5);
            setText(requestedTestCount, '0 Tests');
            return;
        }

        setText(requestedTestCount, `${tests.length} ${tests.length === 1 ? 'Test' : 'Tests'}`);

        tests.forEach((testItem) => {
            const snapshot = testItem.testSnapshot || {};
            const row = document.createElement('tr');

            [snapshot.testCode, snapshot.testName, snapshot.category, snapshot.specimenType].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || 'Not available';
                row.appendChild(cell);
            });

            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');
            const status = testItem.status || 'pending';
            statusBadge.className = `badge ${getTestStatusBadgeClass(status)}`;
            statusBadge.textContent = formatLabel(status);
            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            requestedTestsTableBody.appendChild(row);
        });
    }

    function displaySpecimenInformation() {
        displayTableMessage(specimenTableBody, 'No specimen records have been recorded for this request yet.', 6);
    }

    function displayTimelineEmptyState(container, title, description) {
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
        emptyState.append(icon, heading, paragraph);
        container.appendChild(emptyState);
    }

    function renderTimelineItems(container, activities) {
        if (!container) return false;
        container.replaceChildren();
        if (!activities.length) return false;

        const sortedActivities = [...activities].sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));

        sortedActivities.forEach((activity) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.textContent = activity.action === 'completed' ? '✓' : '•';

            const content = document.createElement('div');
            content.className = 'timeline-content';

            const heading = document.createElement('strong');
            heading.textContent = formatLabel(activity.action);

            const description = document.createElement('p');
            description.textContent = activity.message || 'Activity recorded.';

            const details = document.createElement('span');
            const actor = formatUserName(activity.performedBy);
            details.textContent = `${actor} · ${formatDateTime(activity.performedAt)}`;

            content.append(heading, description, details);
            item.append(marker, content);
            container.appendChild(item);
        });

        return true;
    }

    function displayProcessingTimeline(activities) {
        const processingActions = ['submitted', 'accepted', 'processing_started', 'test_status_updated', 'partially_completed', 'completed', 'cancelled'];
        const processingActivities = (Array.isArray(activities) ? activities : []).filter(a => processingActions.includes(a.action));
        const hasActivities = renderTimelineItems(processingTimeline, processingActivities);
        if (!hasActivities) {
            displayTimelineEmptyState(processingTimeline, 'No processing activity available', 'Laboratory processing activities will appear here when they are recorded.');
        }
    }

    function displayResults() {
        displayTableMessage(requestResultsTableBody, 'No laboratory results have been recorded yet.', 5);
    }

    function displayRequestActivities(activities) {
        const validActivities = Array.isArray(activities) ? activities : [];
        const hasActivities = renderTimelineItems(requestActivityTimeline, validActivities);
        if (!hasActivities) {
            displayTimelineEmptyState(requestActivityTimeline, 'No request activities available', 'No activity records have been recorded for this request.');
        }
    }

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
        updateSubmitRequestButtonVisibility();

        if (printButton) {
            printButton.disabled = false;
            printButton.title = 'Print laboratory request details.';
        }

        hideRequestNotice();
    }

    // ==========================================
    // 5. PERMISSIONS & VISIBILITY
    // ==========================================

    function canEditCurrentRequest() {
        if (!currentRequest || !authenticatedUser) return false;
        if (currentRequest.status !== 'draft') return false;

        const allowedRoles = ['lab_admin', 'lab_receptionist', 'requesting_clinician'];
        if (!allowedRoles.includes(authenticatedUser.role)) return false;

        if (authenticatedUser.role === 'requesting_clinician') {
            const requestingClinicianId = currentRequest.requestedBy?._id || currentRequest.requestedBy?.id;
            return String(requestingClinicianId) === String(authenticatedUser.id);
        }

        return true;
    }

    function updateEditDraftButtonVisibility() {
        if (!editDraftButton) return;
        if (canEditCurrentRequest()) {
            editDraftButton.hidden = false;
            editDraftButton.style.display = 'inline-flex';
        } else {
            editDraftButton.hidden = true;
            editDraftButton.style.display = 'none';
        }
    }

    function canSubmitCurrentRequest() {
        return canEditCurrentRequest();
    }

    function updateSubmitRequestButtonVisibility() {
        if (!submitRequestButton) return;
        if (canSubmitCurrentRequest()) {
            submitRequestButton.hidden = false;
            submitRequestButton.style.display = 'inline-flex';
        } else {
            submitRequestButton.hidden = true;
            submitRequestButton.style.display = 'none';
        }
    }

    function showEditDraftFeedback(message, type = '') {
        if (!editDraftFeedback) return;
        editDraftFeedback.textContent = message;
        editDraftFeedback.className = 'request-edit-feedback';
        if (type) editDraftFeedback.classList.add(`is-${type}`);
        editDraftFeedback.hidden = false;
    }

    function hideEditDraftFeedback() {
        if (!editDraftFeedback) return;
        editDraftFeedback.hidden = true;
        editDraftFeedback.textContent = '';
        editDraftFeedback.className = 'request-edit-feedback';
    }

    // ==========================================
    // 6. EDIT DRAFT LOGIC
    // ==========================================

    async function loadActiveLaboratoryTests() {
        const allTests = [];
        const limit = 100;
        const firstResponse = await window.MediLinkAPI.request(`/test-catalog?status=active&page=1&limit=${limit}`, { method: 'GET' });
        allTests.push(...(firstResponse.data?.tests || []));
        const totalPages = firstResponse.data?.pagination?.totalPages || 1;
        for (let page = 2; page <= totalPages; page++) {
            const response = await window.MediLinkAPI.request(`/test-catalog?status=active&page=${page}&limit=${limit}`, { method: 'GET' });
            allTests.push(...(response.data?.tests || []));
        }
        activeLaboratoryTests = allTests;
        return allTests;
    }

    function haveSameTestIds(firstIds, secondIds) {
        if (firstIds.length !== secondIds.length) return false;
        const secondSet = new Set(secondIds.map(String));
        return firstIds.every((id) => secondSet.has(String(id)));
    }

    function updateEditTestSelectionCount() {
        if (!editTestSelectionCount) return;
        editTestSelectionCount.textContent = `${selectedEditTestIds.size} of 50 tests selected`;
    }

    function getInactiveSelectedTests() {
        const activeTestIds = new Set(activeLaboratoryTests.map((test) => String(test._id || test.id)));
        const existingTests = Array.isArray(currentRequest?.tests) ? currentRequest.tests : [];
        return existingTests.filter((testItem) => {
            const testId = String(testItem.test?._id || testItem.test || '');
            return testId && selectedEditTestIds.has(testId) && !activeTestIds.has(testId);
        });
    }

    function renderActiveLaboratoryTests(searchTerm = '') {
        if (!editTestList) return;
        editTestList.replaceChildren();
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filteredTests = activeLaboratoryTests.filter((test) => {
            return [test.testCode, test.testName, test.category, test.specimenType].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
        });

        filteredTests.forEach((test) => {
            const testId = String(test._id || test.id);
            const label = document.createElement('label');
            label.className = 'request-edit-test-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = testId;
            checkbox.checked = selectedEditTestIds.has(testId);

            const information = document.createElement('span');
            const testName = document.createElement('strong');
            testName.textContent = test.testName;
            const testDetails = document.createElement('small');
            testDetails.textContent = `${test.testCode} | ${test.category} | ${test.specimenType}`;
            information.append(testName, testDetails);

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (getInactiveSelectedTests().length > 0) {
                        checkbox.checked = false;
                        showEditDraftFeedback('This request contains an inactive test. Remove the inactive test before changing the laboratory test selection.', 'error');
                        return;
                    }
                    if (selectedEditTestIds.size >= 50) {
                        checkbox.checked = false;
                        showEditDraftFeedback('You can select a maximum of 50 laboratory tests.', 'error');
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

            label.append(checkbox, information);
            editTestList.appendChild(label);
        });

        const inactiveTests = getInactiveSelectedTests();
        inactiveTests.forEach((testItem) => {
            const snapshot = testItem.testSnapshot || {};
            const testId = String(testItem.test?._id || testItem.test);
            const label = document.createElement('label');
            label.className = 'request-edit-test-option request-edit-test-unavailable';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.setAttribute('aria-label', `Remove inactive test ${snapshot.testName || snapshot.testCode}`);

            const information = document.createElement('span');
            const testName = document.createElement('strong');
            testName.textContent = snapshot.testName || 'Previously selected test';
            const details = document.createElement('small');
            details.textContent = `${snapshot.testCode || 'Unknown Code'} | Inactive or unavailable in catalog. Uncheck to remove this test.`;
            information.append(testName, details);

            checkbox.addEventListener('change', () => {
                if (!checkbox.checked) {
                    selectedEditTestIds.delete(testId);
                    testsWereModified = true;
                    renderActiveLaboratoryTests(editTestSearch?.value || '');
                    updateEditTestSelectionCount();
                    hideEditDraftFeedback();
                }
            });

            label.append(checkbox, information);
            editTestList.appendChild(label);
        });

        if (filteredTests.length === 0 && inactiveTests.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'request-edit-loading';
            emptyMessage.textContent = normalizedSearch ? 'No matching active laboratory tests found.' : 'No active laboratory tests are available.';
            editTestList.appendChild(emptyMessage);
        }
        updateEditTestSelectionCount();
    }

    function displaySelectedPatientSummary(patient) {
        if (!selectedPatientSummary) return;
        if (!patient) {
            selectedPatientSummary.textContent = 'No patient selected.';
            return;
        }
        selectedPatientSummary.textContent = `${formatPatientName(patient)} | Patient ID: ${patient.patientId || 'Not available'}`;
    }

    function selectEditPatient(patient) {
        if (!patient) return;
        selectedEditPatient = patient;
        displaySelectedPatientSummary(patient);
        if (editPatientSearch) editPatientSearch.value = `${formatPatientName(patient)} (${patient.patientId})`;
        if (patientSearchResults) {
            patientSearchResults.replaceChildren();
            patientSearchResults.hidden = true;
        }
        hideEditDraftFeedback();
    }

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
            details.textContent = `Patient ID: ${patient.patientId || 'Not available'} | Contact: ${patient.contactNo || 'Not provided'}`;
            patientButton.append(name, details);
            patientButton.addEventListener('click', () => selectEditPatient(patient));
            patientSearchResults.appendChild(patientButton);
        });
        patientSearchResults.hidden = false;
    }

    async function searchPatientsForEdit() {
        const searchTerm = editPatientSearch?.value.trim() || '';
        if (!searchTerm) {
            showEditDraftFeedback('Enter a patient name, patient ID, or contact number.', 'error');
            return;
        }
        const requestVersion = ++patientSearchRequestVersion;
        if (searchPatientsButton) {
            searchPatientsButton.disabled = true;
            searchPatientsButton.textContent = 'Searching...';
        }
        if (patientSearchResults) {
            patientSearchResults.replaceChildren();
            const loadingMessage = document.createElement('p');
            loadingMessage.className = 'request-edit-loading';
            loadingMessage.textContent = 'Searching patients...';
            patientSearchResults.appendChild(loadingMessage);
            patientSearchResults.hidden = false;
        }
        try {
            const response = await window.MediLinkAPI.request(`/patients?search=${encodeURIComponent(searchTerm)}&page=1&limit=10`, { method: 'GET' });
            if (requestVersion !== patientSearchRequestVersion) return;
            renderPatientSearchResults(response.data?.patients || []);
        } catch (error) {
            if (requestVersion !== patientSearchRequestVersion) return;
            console.error('Patient search failed:', error);
            patientSearchResults?.replaceChildren();
            if (patientSearchResults) patientSearchResults.hidden = true;
            showEditDraftFeedback(error.message || 'Unable to search patients.', 'error');
        } finally {
            if (requestVersion === patientSearchRequestVersion && searchPatientsButton) {
                searchPatientsButton.disabled = false;
                searchPatientsButton.textContent = 'Search';
            }
        }
    }

    async function openEditDraftForm() {
        if (!canEditCurrentRequest()) return;
        hideEditDraftFeedback();
        selectedEditPatient = currentRequest.patient;
        displaySelectedPatientSummary(selectedEditPatient);
        if (editPatientSearch) editPatientSearch.value = '';
        const existingTestIds = (Array.isArray(currentRequest.tests) ? currentRequest.tests : []).map((testItem) => String(testItem.test?._id || testItem.test || '')).filter(Boolean);
        originalEditTestIds = [...existingTestIds];
        selectedEditTestIds = new Set(existingTestIds);
        testsWereModified = false;
        originalEditValues = {
            patientId: String(currentRequest.patient?._id || currentRequest.patient?.id || ''),
            testIds: [...existingTestIds],
            priority: currentRequest.priority || 'routine',
            clinicalNotes: currentRequest.clinicalNotes || ''
        };
        if (editRequestPriority) editRequestPriority.value = currentRequest.priority || 'routine';
        if (editClinicalNotes) editClinicalNotes.value = currentRequest.clinicalNotes || '';
        if (editTestSearch) editTestSearch.value = '';
        updateEditTestSelectionCount();
        if (requestEditSection) requestEditSection.hidden = false;
        if (editTestList) {
            editTestList.replaceChildren();
            const loadingMessage = document.createElement('p');
            loadingMessage.className = 'request-edit-loading';
            loadingMessage.textContent = 'Loading active laboratory tests...';
            editTestList.appendChild(loadingMessage);
        }
        try {
            await loadActiveLaboratoryTests();
            renderActiveLaboratoryTests();
        } catch (error) {
            console.error('Failed to load active laboratory tests:', error);
            if (editTestList) {
                editTestList.replaceChildren();
                const errorMessage = document.createElement('p');
                errorMessage.className = 'request-edit-loading';
                errorMessage.textContent = 'Unable to load active laboratory tests. Please try again later.';
                editTestList.appendChild(errorMessage);
            }
            showEditDraftFeedback(error.message || 'Unable to retrieve active laboratory tests.', 'error');
        }
        requestEditSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeEditDraftForm() {
        if (isEditDraftSaving) return;
        if (requestEditSection) requestEditSection.hidden = true;
        if (patientSearchResults) {
            patientSearchResults.replaceChildren();
            patientSearchResults.hidden = true;
        }
        hideEditDraftFeedback();
        editDraftButton?.focus();
    }

    async function saveEditDraft(event) {
        event.preventDefault();
        if (isEditDraftSaving) return;
        if (!canEditCurrentRequest()) {
            showEditDraftFeedback('This laboratory request can no longer be edited.', 'error');
            return;
        }
        if (!originalEditValues || !selectedEditPatient) {
            showEditDraftFeedback('Please select a valid patient before saving.', 'error');
            return;
        }
        const selectedPatientId = String(selectedEditPatient._id || selectedEditPatient.id || '');
        if (!selectedPatientId) {
            showEditDraftFeedback('The selected patient has an invalid ID.', 'error');
            return;
        }
        const selectedTestIds = Array.from(selectedEditTestIds);
        if (selectedTestIds.length > 50) {
            showEditDraftFeedback('You can select a maximum of 50 laboratory tests.', 'error');
            return;
        }
        const inactiveTests = getInactiveSelectedTests();
        const testSelectionChanged = !haveSameTestIds(selectedTestIds, originalEditTestIds);
        if (testSelectionChanged && inactiveTests.length > 0) {
            showEditDraftFeedback('Please remove previously selected inactive tests before changing the laboratory test selection.', 'error');
            return;
        }
        const priority = editRequestPriority.value;
        const clinicalNotes = editClinicalNotes.value;
        const allowedPriorities = ['routine', 'urgent', 'stat'];
        if (!allowedPriorities.includes(priority)) {
            showEditDraftFeedback('Please select a valid request priority.', 'error');
            return;
        }
        if (clinicalNotes.trim().length > 2000) {
            showEditDraftFeedback('Clinical notes must not exceed 2,000 characters.', 'error');
            return;
        }
        const updateData = {};
        if (selectedPatientId !== originalEditValues.patientId) updateData.patientId = selectedPatientId;
        if (testSelectionChanged) updateData.testIds = selectedTestIds;
        if (priority !== originalEditValues.priority) updateData.priority = priority;
        if (clinicalNotes.trim() !== originalEditValues.clinicalNotes.trim()) updateData.clinicalNotes = clinicalNotes;
        if (Object.keys(updateData).length === 0) {
            showEditDraftFeedback('No changes were detected. Your laboratory request remains unchanged.', '');
            return;
        }
        isEditDraftSaving = true;
        if (requestEditForm) {
            requestEditForm.querySelectorAll('input, select, textarea, button').forEach((control) => control.disabled = true);
        }
        if (saveEditDraftButton) saveEditDraftButton.textContent = 'Saving Changes...';
        showEditDraftFeedback('Saving your laboratory request changes...', '');
        let updateSucceeded = false;
        try {
            const response = await window.MediLinkAPI.request(`/lab-requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: updateData });
            const updatedRequest = response.data?.laboratoryRequest;
            if (!updatedRequest) throw new Error('The server did not return the updated laboratory request.');
            displayRequestDetails(updatedRequest);
            updateSucceeded = true;
        } catch (error) {
            console.error('Laboratory request draft update failed:', error);
            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }
            showEditDraftFeedback(error.message || 'Unable to update the laboratory request. Please try again.', 'error');
        } finally {
            isEditDraftSaving = false;
            if (requestEditForm) {
                requestEditForm.querySelectorAll('input, select, textarea, button').forEach((control) => control.disabled = false);
            }
            if (saveEditDraftButton) saveEditDraftButton.textContent = 'Save Changes';
        }
        if (updateSucceeded) {
            closeEditDraftForm();
            updateRequestNotice('Draft Updated Successfully', 'Your laboratory request changes have been saved successfully.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    async function submitCurrentRequest() {
        if (isSubmittingRequest) return;
        if (!canSubmitCurrentRequest()) {
            window.alert('You do not have permission to submit this laboratory request.');
            return;
        }
        const confirmSubmission = window.confirm('Are you sure you want to submit this laboratory request? Once submitted, it can no longer be edited as a draft.');
        if (!confirmSubmission) return;
        isSubmittingRequest = true;
        if (submitRequestButton) {
            submitRequestButton.disabled = true;
            submitRequestButton.textContent = 'Submitting...';
        }
        try {
            const response = await window.MediLinkAPI.request(`/lab-requests/${encodeURIComponent(requestId)}/submit`, { method: 'POST' });
            const updatedRequest = response.data?.laboratoryRequest;
            if (!updatedRequest) throw new Error('The submission response contains no updated laboratory request.');
            displayRequestDetails(updatedRequest);
            updateRequestNotice('Laboratory Request Submitted', 'The laboratory request has been submitted successfully.');
        } catch (error) {
            console.error('Laboratory request submission failed:', error);
            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }
            updateRequestNotice('Unable to Submit Laboratory Request', error.message || 'An unexpected error occurred while submitting the request.');
        } finally {
            isSubmittingRequest = false;
            if (submitRequestButton) {
                submitRequestButton.disabled = false;
                submitRequestButton.textContent = 'Submit Request';
            }
        }
    }

    // ==========================================
    // 7. EVENT LISTENERS
    // ==========================================

    if (editDraftButton) editDraftButton.addEventListener('click', openEditDraftForm);
    if (submitRequestButton) submitRequestButton.addEventListener('click', submitCurrentRequest);
    if (cancelEditDraftButton) cancelEditDraftButton.addEventListener('click', closeEditDraftForm);
    if (requestEditForm) requestEditForm.addEventListener('submit', saveEditDraft);
    if (searchPatientsButton) searchPatientsButton.addEventListener('click', searchPatientsForEdit);

    if (editPatientSearch) {
        editPatientSearch.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchPatientsForEdit();
            }
        });
        editPatientSearch.addEventListener('input', () => {
            selectedEditPatient = null;
            displaySelectedPatientSummary(null);
            if (patientSearchResults) {
                patientSearchResults.replaceChildren();
                patientSearchResults.hidden = true;
            }
        });
    }

    if (editTestSearch) {
        editTestSearch.addEventListener('input', () => renderActiveLaboratoryTests(editTestSearch.value));
    }

    // ==========================================
    // 8. DATA LOADING & INIT
    // ==========================================

    async function loadRequestDetails() {
        if (!requestId || !requestId.trim()) {
            setText(requestNumber, 'No Request Selected');
            updateRequestNotice('No Request Selected', 'No laboratory request identifier was supplied. Return to Laboratory Requests and select a record.');
            return;
        }
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = 'Refreshing...';
        }
        if (printButton) printButton.disabled = true;
        updateRequestNotice('Loading Request Details', 'Retrieving the selected laboratory request from the MediLink database.');
        try {
            const response = await window.MediLinkAPI.request(`/lab-requests/${encodeURIComponent(requestId)}`, { method: 'GET' });
            const laboratoryRequest = response.data?.laboratoryRequest;
            if (!laboratoryRequest) throw new Error('The laboratory request response contains no request information.');
            displayRequestDetails(laboratoryRequest);
        } catch (error) {
            console.error('Laboratory request details retrieval failed:', error);
            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }
            if (error.status === 404) {
                setText(requestNumber, 'Request Not Found');
                updateRequestNotice('Request Not Found', 'The requested laboratory record does not exist or is not available to your account.');
            } else {
                updateRequestNotice('Unable to Load Request Details', error.message || 'An unexpected error occurred.');
            }
        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = '↻ Refresh';
            }
        }
    }

    if (refreshButton) refreshButton.addEventListener('click', loadRequestDetails);
    if (printButton) {
        printButton.disabled = true;
        printButton.addEventListener('click', () => {
            if (!currentRequest) {
                window.alert('Request information is not available for printing.');
                return;
            }
            window.print();
        });
    }

    function openSidebar() {
        if (appLayout) appLayout.classList.add('sidebar-open');
        if (sidebarToggle) {
            sidebarToggle.setAttribute('aria-expanded', 'true');
            sidebarToggle.setAttribute('aria-label', 'Close navigation menu');
        }
    }

    function closeSidebar() {
        if (appLayout) appLayout.classList.remove('sidebar-open');
        if (sidebarToggle) {
            sidebarToggle.setAttribute('aria-expanded', 'false');
            sidebarToggle.setAttribute('aria-label', 'Open navigation menu');
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isOpen = appLayout?.classList.contains('sidebar-open');
            isOpen ? closeSidebar() : openSidebar();
        });
    }

    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 768) closeSidebar(); });
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.addEventListener('click', closeSidebar));

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const confirmed = window.confirm('Are you sure you want to log out of MediLink?');
            if (!confirmed) return;
            logoutButton.disabled = true;
            logoutButton.textContent = 'Logging Out...';
            try {
                await window.MediLinkAuth.logout();
                window.location.replace('login.html');
            } catch (error) {
                console.error('Logout failed:', error);
                window.alert(error.message || 'Unable to log out.');
                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }
        });
    }

    async function initializeRequestDetails() {
        try {
            const user = await window.MediLinkAuth.getCurrentUser();
            authenticatedUser = user;
            displayUserInformation(user);
            await loadRequestDetails();
        } catch (error) {
            console.error('Request Details authentication failed:', error);
            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }
            updateRequestNotice('Unable to Initialize Request Details', error.message || 'Unable to verify your account.');
        }
    }

    closeSidebar();
    initializeRequestDetails();

})();