// ==========================================
// MEDILINK LABORATORY
// PATIENT RECORDS (SEARCH AND VIEW ONLY)
// Patients are read from the shared MediLink patients collection.
// ==========================================

(function () {
    'use strict';

    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    const searchForm = document.getElementById('patientSearchForm');
    const searchInput = document.getElementById('patientSearch');
    const resetSearchButton = document.getElementById('resetPatientSearchButton');
    const searchPatientsButton = document.getElementById('searchPatientsButton');

    const patientsTableBody = document.getElementById('patientsTableBody');
    const patientRecordCount = document.getElementById('patientRecordCount');
    const paginationContainer = document.getElementById('patientsPagination');

    const detailsSection = document.getElementById('patientDetailsSection');
    const detailsContent = document.getElementById('patientDetailsContent');
    const closeDetailsButton = document.getElementById('closePatientDetailsButton');

    const PAGE_LIMIT = 10;
    let currentPage = 1;
    let currentSearch = '';
    let currentTotalPages = 0;

    // ------------------------------------------
    // Helpers for the two shared patient layouts
    // ------------------------------------------

    function getPatientId(patient) {
        return patient.patientId || patient.patientCode || patient._id || 'Not provided';
    }

    function getPatientFullName(patient) {
        return patient.fullName ||
            [patient.firstName, patient.middleName, patient.lastName]
                .filter(Boolean).join(' ') ||
            'Not provided';
    }

    function getPatientContact(patient) {
        return patient.contactNo || patient.contactNumber || 'Not provided';
    }

    function getPatientBirth(patient) {
        if (patient.birthDate) return formatDate(patient.birthDate);
        if (patient.age !== undefined && patient.age !== null) return `${patient.age} years old`;
        return 'Not provided';
    }

    function formatDate(dateValue) {
        if (!dateValue) return 'Not provided';
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Not provided';
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric'
        }).format(date);
    }

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
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.username || user.email || 'User';
        if (userNameElement) userNameElement.textContent = fullName;
        if (userRoleElement) userRoleElement.textContent = formatUserRole(user.role);
        if (userAvatarElement) userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
    }

    function createTableCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value || 'Not provided';
        return cell;
    }

    function displayTableMessage(message) {
        patientsTableBody.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        cell.appendChild(emptyState);
        row.appendChild(cell);
        patientsTableBody.appendChild(row);
    }

    // ------------------------------------------
    // Patient table
    // ------------------------------------------

    function displayPatients(patients) {
        patientsTableBody.replaceChildren();

        if (!patients.length) {
            displayTableMessage('No matching patient records found.');
            return;
        }

        patients.forEach((patient) => {
            const row = document.createElement('tr');
            row.appendChild(createTableCell(getPatientId(patient)));
            row.appendChild(createTableCell(getPatientFullName(patient)));
            row.appendChild(createTableCell(getPatientBirth(patient)));
            row.appendChild(createTableCell(patient.sex));
            row.appendChild(createTableCell(getPatientContact(patient)));

            const actionCell = document.createElement('td');
            const viewButton = document.createElement('button');
            viewButton.type = 'button';
            viewButton.className = 'patient-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => viewPatientDetails(patient._id));
            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);

            patientsTableBody.appendChild(row);
        });
    }

    async function loadPatients(searchTerm, page = 1) {
        const search = (searchTerm || '').trim();
        currentSearch = search;
        currentPage = page;

        if (searchPatientsButton) {
            searchPatientsButton.disabled = true;
            searchPatientsButton.textContent = 'Searching...';
        }

        try {
            const query = new URLSearchParams({
                search,
                page: String(page),
                limit: String(PAGE_LIMIT)
            });
            const response = await window.MediLinkAPI.request(
                `/patients?${query.toString()}`,
                { method: 'GET' }
            );
            const result = response.data || {};
            const pagination = result.pagination || {};

            displayPatients(result.patients || []);
            currentPage = pagination.page || 1;
            currentTotalPages = pagination.totalPages || 1;

            patientRecordCount.textContent = !pagination.total
                ? 'No matching patient records found.'
                : `${pagination.total} patient record(s) found. Page ${currentPage} of ${currentTotalPages}.`;

            displayPagination();
        } catch (error) {
            console.error('Patient search failed:', error);
            displayTableMessage(error.message || 'Unable to retrieve patient records.');
            patientRecordCount.textContent = 'Unable to retrieve patient records.';
            paginationContainer.replaceChildren();
            if (error.status === 401) window.location.replace('login.html');
        } finally {
            if (searchPatientsButton) {
                searchPatientsButton.disabled = false;
                searchPatientsButton.textContent = 'Search';
            }
        }
    }

    function createPaginationButton(label, page, disabled, active = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        if (active) button.classList.add('active');
        button.addEventListener('click', () => loadPatients(currentSearch, page));
        return button;
    }

    function displayPagination() {
        paginationContainer.replaceChildren();
        if (currentTotalPages <= 1) return;

        paginationContainer.appendChild(
            createPaginationButton('Previous', currentPage - 1, currentPage <= 1)
        );

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(currentTotalPages, startPage + 4);
        startPage = Math.max(1, endPage - 4);

        for (let page = startPage; page <= endPage; page++) {
            paginationContainer.appendChild(
                createPaginationButton(String(page), page, false, page === currentPage)
            );
        }

        paginationContainer.appendChild(
            createPaginationButton('Next', currentPage + 1, currentPage >= currentTotalPages)
        );
    }

    // ------------------------------------------
    // Patient details (read only)
    // ------------------------------------------

    function addPatientDetail(label, value) {
        const item = document.createElement('div');
        item.className = 'patient-detail-item';

        const detailLabel = document.createElement('p');
        detailLabel.className = 'patient-detail-label';
        detailLabel.textContent = label;

        const detailValue = document.createElement('p');
        detailValue.className = 'patient-detail-value';
        detailValue.textContent = value || 'Not provided';

        item.appendChild(detailLabel);
        item.appendChild(detailValue);
        detailsContent.appendChild(item);
    }

    async function viewPatientDetails(patientId) {
        detailsContent.replaceChildren();
        detailsSection.hidden = false;
        addPatientDetail('Patient Information', 'Loading...');
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            const response = await window.MediLinkAPI.request(
                `/patients/${encodeURIComponent(patientId)}`,
                { method: 'GET' }
            );
            const patient = response.data.patient;

            detailsContent.replaceChildren();
            addPatientDetail('Patient ID', getPatientId(patient));
            addPatientDetail('Full Name', getPatientFullName(patient));
            addPatientDetail('Date of Birth', getPatientBirth(patient));
            addPatientDetail('Sex', patient.sex);
            addPatientDetail('Civil Status', patient.civilStatus);
            addPatientDetail('Address',
                [patient.address, patient.city].filter(Boolean).join(', '));
            addPatientDetail('Contact Number', getPatientContact(patient));
            addPatientDetail('Email', patient.email);
            addPatientDetail('Emergency Contact', patient.emergencyContact?.name);
            addPatientDetail('Emergency Relation', patient.emergencyContact?.relationship);
            addPatientDetail('Emergency Phone', patient.emergencyContact?.contactNo);
            addPatientDetail('Blood Type', patient.medical?.bloodType);
            addPatientDetail('Allergies', patient.medical?.allergies);
            addPatientDetail('Conditions', patient.medical?.conditions);
            addPatientDetail('Medications', patient.medical?.medications);
            addPatientDetail('Date Registered', formatDate(patient.createdAt));
        } catch (error) {
            console.error('Patient details failed:', error);
            detailsContent.replaceChildren();
            addPatientDetail('Error', error.message || 'Unable to load patient details.');
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    // ------------------------------------------
    // Events and initialization
    // ------------------------------------------

    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            detailsSection.hidden = true;
            loadPatients(searchInput.value, 1);
        });
    }

    if (resetSearchButton) {
        resetSearchButton.addEventListener('click', () => {
            if (searchForm) searchForm.reset();
            detailsSection.hidden = true;
            loadPatients('', 1);
        });
    }

    if (closeDetailsButton) {
        closeDetailsButton.addEventListener('click', () => {
            detailsSection.hidden = true;
        });
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () =>
            appLayout.classList.toggle('sidebar-open'));
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () =>
            appLayout.classList.remove('sidebar-open'));
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to log out of MediLink?')) {
                await window.MediLinkAuth.logout();
                window.location.replace('login.html');
            }
        });
    }

    async function initializePatientPage() {
        try {
            const user = await window.MediLinkAuth.getCurrentUser();
            displayUserInformation(user);
            // List all shared patients immediately; no search term required.
            await loadPatients('', 1);
        } catch (error) {
            console.error('Patient page initialization failed:', error);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    initializePatientPage();
})();
