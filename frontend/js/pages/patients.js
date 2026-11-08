
// ==========================================
// MEDILINK LABORATORY
// PATIENT RECORDS JAVASCRIPT
// ==========================================

(function () {
    'use strict';

    // ==========================================
    // 1. GET PAGE ELEMENTS
    // ==========================================

    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    const addPatientButton = document.getElementById('addPatientButton');
    const registrationSection = document.getElementById(
        'patientRegistrationSection'
    );

    const registrationForm = document.getElementById(
        'patientRegistrationForm'
    );

    const patientFormMessage = document.getElementById(
        'patientFormMessage'
    );

    const savePatientButton = document.getElementById(
        'savePatientButton'
    );

    const cancelPatientButton = document.getElementById(
        'cancelPatientButton'
    );

    const searchForm = document.getElementById('patientSearchForm');
    const searchInput = document.getElementById('patientSearch');

    const resetSearchButton = document.getElementById(
        'resetPatientSearchButton'
    );

    const searchPatientsButton = document.getElementById(
        'searchPatientsButton'
    );

    const patientsTableBody = document.getElementById(
        'patientsTableBody'
    );

    const patientRecordCount = document.getElementById(
        'patientRecordCount'
    );

    const paginationContainer = document.getElementById(
        'patientsPagination'
    );

    const detailsSection = document.getElementById(
        'patientDetailsSection'
    );

    const detailsContent = document.getElementById(
        'patientDetailsContent'
    );

    const closeDetailsButton = document.getElementById(
        'closePatientDetailsButton'
    );

    // ==========================================
    // 2. PAGE STATE
    // ==========================================

    const PAGE_LIMIT = 10;

    let currentPage = 1;
    let currentSearch = '';
    let currentUser = null;
    let currentTotalPages = 0;

    // Verify whether the current user can register patients.
function canRegisterPatients() {
    return currentUser &&
        ['lab_admin', 'lab_receptionist'].includes(currentUser.role);
}

    // ==========================================
    // 3. FORMAT USER INFORMATION
    // ==========================================

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
        const fullName = [
            user.firstName,
            user.lastName
        ].filter(Boolean).join(' ') || user.username || user.email;

        if (userNameElement) {
            userNameElement.textContent = fullName;
        }

        if (userRoleElement) {
            userRoleElement.textContent = formatUserRole(user.role);
        }

        if (userAvatarElement) {
            userAvatarElement.textContent =
                fullName.charAt(0).toUpperCase();
        }
    }

    // ==========================================
    // 4. MESSAGE HANDLING
    // ==========================================

    function showFormMessage(message, type = 'info') {
        patientFormMessage.textContent = message;
        patientFormMessage.className =
            `alert alert-${type} patient-form-message`;
        patientFormMessage.hidden = false;
    }

    function hideFormMessage() {
        patientFormMessage.textContent = '';
        patientFormMessage.hidden = true;
    }

    // ==========================================
    // 5. FORMAT PATIENT INFORMATION
    // ==========================================

    function formatDate(dateValue) {
        if (!dateValue) return 'Not provided';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return 'Invalid date';
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    function formatSex(sex) {
        if (!sex) return 'Not provided';

        return sex.charAt(0).toUpperCase() + sex.slice(1);
    }

    function getPatientFullName(patient) {
        return patient.fullName || [
            patient.firstName,
            patient.middleName,
            patient.lastName,
            patient.suffix
        ].filter(Boolean).join(' ');
    }

    // ==========================================
    // 6. SAFE TABLE ELEMENT CREATION
    // ==========================================

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

        const title = document.createElement('h3');
        title.className = 'empty-state-title';
        title.textContent = message;

        emptyState.appendChild(title);
        cell.appendChild(emptyState);
        row.appendChild(cell);

        patientsTableBody.appendChild(row);
    }

    // ==========================================
    // 7. DISPLAY PATIENT RECORDS
    // ==========================================

    function displayPatients(patients) {
        patientsTableBody.replaceChildren();

        if (!patients.length) {
            displayTableMessage('No matching patient records found.');
            return;
        }

        patients.forEach((patient) => {
            const row = document.createElement('tr');

            row.appendChild(
                createTableCell(patient.patientCode)
            );

            row.appendChild(
                createTableCell(getPatientFullName(patient))
            );

            row.appendChild(
                createTableCell(formatDate(patient.dateOfBirth))
            );

            row.appendChild(
                createTableCell(formatSex(patient.sex))
            );

            row.appendChild(
                createTableCell(patient.contactNumber)
            );

            const actionCell = document.createElement('td');

            const actionGroup = document.createElement('div');
            actionGroup.className = 'patient-action-group';

            const viewButton = document.createElement('button');

            viewButton.type = 'button';
            viewButton.className = 'patient-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => {
                viewPatientDetails(patient._id);
            });

            actionGroup.appendChild(viewButton);
            actionCell.appendChild(actionGroup);
            row.appendChild(actionCell);

            patientsTableBody.appendChild(row);
        });
    }

    // ==========================================
    // 8. PATIENT SEARCH
    // ==========================================

    async function loadPatients(searchTerm, page = 1) {
        const search = searchTerm.trim();

        if (!search) {
            displayTableMessage(
                'Enter a patient code, name, or contact number.'
            );

            patientRecordCount.textContent =
                'No search performed yet.';

            paginationContainer.replaceChildren();
            currentSearch = '';
            currentTotalPages = 0;

            return;
        }

        currentSearch = search;
        currentPage = page;

        searchPatientsButton.disabled = true;
        searchPatientsButton.textContent = 'Searching...';

        try {
            const query = new URLSearchParams({
                search,
                page: String(page),
                limit: String(PAGE_LIMIT)
            });

            const response = await window.MediLinkAPI.request(
                `/patients?${query.toString()}`,
                {
                    method: 'GET'
                }
            );

            const result = response.data;

            displayPatients(result.patients || []);

            const pagination = result.pagination;

            currentPage = pagination.page;
            currentTotalPages = pagination.totalPages;

            if (pagination.total === 0) {
                patientRecordCount.textContent =
                    'No matching patient records found.';
            } else {
                patientRecordCount.textContent =
                    `${pagination.total} patient record(s) found. ` +
                    `Page ${pagination.page} of ${pagination.totalPages}.`;
            }

            displayPagination();

        } catch (error) {
            console.error('Patient search failed:', error);

            displayTableMessage(error.message);

            patientRecordCount.textContent =
                'Unable to retrieve patient records.';

            paginationContainer.replaceChildren();

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

        } finally {
            searchPatientsButton.disabled = false;
            searchPatientsButton.textContent = 'Search';
        }
    }

    // ==========================================
    // 9. PATIENT PAGINATION
    // ==========================================

    function createPaginationButton(label, page, disabled, active = false) {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;

        if (active) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            loadPatients(currentSearch, page);
        });

        return button;
    }

    function displayPagination() {
        paginationContainer.replaceChildren();

        if (currentTotalPages <= 1) {
            return;
        }

        paginationContainer.appendChild(
            createPaginationButton(
                'Previous',
                currentPage - 1,
                currentPage <= 1
            )
        );

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(
            currentTotalPages,
            startPage + 4
        );

        startPage = Math.max(1, endPage - 4);

        for (
            let page = startPage;
            page <= endPage;
            page++
        ) {
            paginationContainer.appendChild(
                createPaginationButton(
                    String(page),
                    page,
                    false,
                    page === currentPage
                )
            );
        }

        paginationContainer.appendChild(
            createPaginationButton(
                'Next',
                currentPage + 1,
                currentPage >= currentTotalPages
            )
        );
    }

    // ==========================================
    // 10. REGISTER NEW PATIENT
    // ==========================================

    async function registerPatient(event) {
    event.preventDefault();

    // Prevent unauthorized patient registration.
    if (!canRegisterPatients()) {
        registrationSection.hidden = true;

        showFormMessage(
            'You do not have permission to register patients.',
            'danger'
        );

        return;
    }

    hideFormMessage();

        const formData = new FormData(registrationForm);

        const patientData = Object.fromEntries(
            formData.entries()
        );

        const dateOfBirth = new Date(
            patientData.dateOfBirth + 'T00:00:00'
        );

        if (
            Number.isNaN(dateOfBirth.getTime()) ||
            dateOfBirth > new Date()
        ) {
            showFormMessage(
                'Please provide a valid date of birth.',
                'danger'
            );
            return;
        }

        savePatientButton.disabled = true;
        savePatientButton.textContent = 'Saving...';

        try {
            const response = await window.MediLinkAPI.request(
                '/patients',
                {
                    method: 'POST',
                    body: patientData
                }
            );

            const patient = response.data.patient;

            showFormMessage(
                response.message || 'Patient registered successfully.',
                'success'
            );

            registrationForm.reset();

            // Automatically display the newly registered patient.
            searchInput.value = patient.patientCode;

            await loadPatients(patient.patientCode, 1);

        } catch (error) {
            console.error('Patient registration failed:', error);

            showFormMessage(error.message, 'danger');

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

        } finally {
            savePatientButton.disabled = false;
            savePatientButton.textContent = 'Save Patient';
        }
    }

    // ==========================================
    // 11. VIEW PATIENT DETAILS
    // ==========================================

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

        detailsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        try {
            const response = await window.MediLinkAPI.request(
                `/patients/${encodeURIComponent(patientId)}`,
                {
                    method: 'GET'
                }
            );

            const patient = response.data.patient;

            detailsContent.replaceChildren();

            addPatientDetail('Patient Code', patient.patientCode);
            addPatientDetail('Full Name', getPatientFullName(patient));
            addPatientDetail('First Name', patient.firstName);
            addPatientDetail('Middle Name', patient.middleName);
            addPatientDetail('Last Name', patient.lastName);
            addPatientDetail('Suffix', patient.suffix);
            addPatientDetail(
                'Date of Birth',
                formatDate(patient.dateOfBirth)
            );
            addPatientDetail('Sex', formatSex(patient.sex));
            addPatientDetail('Contact Number', patient.contactNumber);
            addPatientDetail(
                'Date Registered',
                formatDate(patient.createdAt)
            );

        } catch (error) {
            console.error('Patient details failed:', error);

            detailsContent.replaceChildren();

            addPatientDetail('Error', error.message);

            if (error.status === 401) {
                window.location.replace('login.html');
            }
        }
    }

    // ==========================================
    // 12. REGISTRATION FORM VISIBILITY
    // ==========================================

        function configureRegistrationAccess(user) {
        // Patient registration is handled by the main MediAdmit subsystem.
        // The Laboratory subsystem only views and searches patients.
        if (addPatientButton) {
            addPatientButton.hidden = true;
        }
        
        if (registrationSection) {
            registrationSection.hidden = true;
        }
    }

    if (addPatientButton) {
    addPatientButton.addEventListener('click', () => {

        // Reject unauthorized users.
        if (!canRegisterPatients()) {
            registrationSection.hidden = true;
            return;
        }

        registrationSection.hidden =
            !registrationSection.hidden;

        if (!registrationSection.hidden) {
            hideFormMessage();

            registrationSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
}

    if (cancelPatientButton) {
        cancelPatientButton.addEventListener('click', () => {
            registrationForm.reset();
            hideFormMessage();
            registrationSection.hidden = true;
        });
    }

    // ==========================================
    // 13. PATIENT SEARCH EVENTS
    // ==========================================

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();

        detailsSection.hidden = true;

        loadPatients(searchInput.value, 1);
    });

    resetSearchButton.addEventListener('click', () => {
        searchForm.reset();

        currentSearch = '';
        currentPage = 1;
        currentTotalPages = 0;

        patientsTableBody.replaceChildren();

        displayTableMessage('Enter a patient code, name, or contact number.');

        patientRecordCount.textContent =
            'No search performed yet.';

        paginationContainer.replaceChildren();

        detailsSection.hidden = true;
    });

    // ==========================================
    // 14. CLOSE PATIENT DETAILS
    // ==========================================

    closeDetailsButton.addEventListener('click', () => {
        detailsSection.hidden = true;
    });

    // ==========================================
    // 15. REGISTRATION FORM SUBMISSION
    // ==========================================

    registrationForm.addEventListener(
        'submit',
        registerPatient
    );

    // ==========================================
    // 16. MOBILE SIDEBAR
    // ==========================================

    function openSidebar() {
        appLayout.classList.add('sidebar-open');

        sidebarToggle.setAttribute('aria-expanded', 'true');
        sidebarToggle.setAttribute(
            'aria-label',
            'Close navigation'
        );
    }

    function closeSidebar() {
        appLayout.classList.remove('sidebar-open');

        sidebarToggle.setAttribute('aria-expanded', 'false');
        sidebarToggle.setAttribute(
            'aria-label',
            'Open navigation'
        );
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isOpen = appLayout.classList.contains(
                'sidebar-open'
            );

            isOpen ? closeSidebar() : openSidebar();
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });

    document.querySelectorAll('.sidebar-nav .nav-link')
        .forEach((link) => {
            link.addEventListener('click', closeSidebar);
        });

    // ==========================================
    // 17. LOGOUT
    // ==========================================

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

            alert(error.message || 'Unable to log out.');

            logoutButton.disabled = false;
            logoutButton.textContent = 'Logout';
        }
    });

    // ==========================================
    // 18. INITIALIZE PATIENT RECORDS PAGE
    // ==========================================

    async function initializePatientPage() {
        try {
            currentUser = await window.MediLinkAuth.getCurrentUser();

            displayUserInformation(currentUser);

            configureRegistrationAccess(currentUser);

        } catch (error) {
            console.error(
                'Patient page authentication failed:',
                error
            );

            if (error.status === 401) {
                window.location.replace('login.html');
                return;
            }

            alert(
                error.message ||
                'Unable to verify your account. Please refresh the page.'
            );
        }
    }

    initializePatientPage();

})();
