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
    const registrationSection = document.getElementById('patientRegistrationSection');
    const registrationForm = document.getElementById('patientRegistrationForm');
    const patientFormMessage = document.getElementById('patientFormMessage');
    const savePatientButton = document.getElementById('savePatientButton');
    const cancelPatientButton = document.getElementById('cancelPatientButton');

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

    // ==========================================
    // 2. PAGE STATE
    // ==========================================

    const PAGE_LIMIT = 10;
    let currentPage = 1;
    let currentSearch = '';
    let currentUser = null;
    let currentTotalPages = 0;

    function canRegisterPatients() {
        return currentUser && ['lab_admin', 'lab_receptionist'].includes(currentUser.role);
    }

    // ==========================================
    // 3. HELPERS
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
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
        if (userNameElement) userNameElement.textContent = fullName;
        if (userRoleElement) userRoleElement.textContent = formatUserRole(user.role);
        if (userAvatarElement) userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
    }

    function showFormMessage(message, type = 'info') {
        patientFormMessage.textContent = message;
        patientFormMessage.className = `alert alert-${type} patient-form-message`;
        patientFormMessage.hidden = false;
    }

    function hideFormMessage() {
        patientFormMessage.textContent = '';
        patientFormMessage.hidden = true;
    }

    function formatDate(dateValue) {
        if (!dateValue) return 'Not provided';
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Invalid date';
        return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    }

    function getPatientFullName(patient) {
        return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');
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
        const title = document.createElement('h3');
        title.className = 'empty-state-title';
        title.textContent = message;
        emptyState.appendChild(title);
        cell.appendChild(emptyState);
        row.appendChild(cell);
        patientsTableBody.appendChild(row);
    }

    // ==========================================
    // 4. DISPLAY PATIENT RECORDS
    // ==========================================

    function displayPatients(patients) {
        patientsTableBody.replaceChildren();

        if (!patients.length) {
            displayTableMessage('No matching patient records found.');
            return;
        }

        patients.forEach((patient) => {
            const row = document.createElement('tr');
            row.appendChild(createTableCell(patient.patientId));
            row.appendChild(createTableCell(getPatientFullName(patient)));
            row.appendChild(createTableCell(formatDate(patient.birthDate)));
            row.appendChild(createTableCell(patient.sex));
            row.appendChild(createTableCell(patient.contactNo));

                        const actionCell = document.createElement('td');
            const actionGroup = document.createElement('div');
            actionGroup.className = 'patient-action-group';
            actionGroup.style.display = 'flex';
            actionGroup.style.gap = '8px';

            const viewButton = document.createElement('button');
            viewButton.type = 'button';
            viewButton.className = 'patient-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => viewPatientDetails(patient._id));

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'patient-action';
            editButton.style.color = '#3b82f6'; // Blue for edit
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => openEditPatientForm(patient));

            actionGroup.appendChild(viewButton);
            actionGroup.appendChild(editButton);
            actionCell.appendChild(actionGroup);
            row.appendChild(actionCell);

            patientsTableBody.appendChild(row);
        });
    }

        function openEditPatientForm(patient) {
        if (!canRegisterPatients()) return;
        
        registrationSection.hidden = false;
        hideFormMessage();
        
        // Set editing ID on the form
        registrationForm.dataset.editingId = patient._id;
        savePatientButton.textContent = 'Update Patient';

        // Populate basic fields
        document.getElementById('firstName').value = patient.firstName || '';
        document.getElementById('middleName').value = patient.middleName || '';
        document.getElementById('lastName').value = patient.lastName || '';
        document.getElementById('birthDate').value = patient.birthDate ? patient.birthDate.split('T')[0] : '';
        document.getElementById('sex').value = patient.sex || '';
        document.getElementById('civilStatus').value = patient.civilStatus || '';
        
        // Populate contact
        document.getElementById('address').value = patient.address || '';
        document.getElementById('city').value = patient.city || '';
        document.getElementById('contactNo').value = patient.contactNo || '';
        document.getElementById('email').value = patient.email || '';

        // Populate emergency contact
        document.getElementById('emergencyContact.name').value = patient.emergencyContact?.name || '';
        document.getElementById('emergencyContact.relationship').value = patient.emergencyContact?.relationship || '';
        document.getElementById('emergencyContact.contactNo').value = patient.emergencyContact?.contactNo || '';

        // Populate medical
        document.getElementById('medical.bloodType').value = patient.medical?.bloodType || '';
        document.getElementById('medical.heightCm').value = patient.medical?.heightCm || '';
        document.getElementById('medical.weightKg').value = patient.medical?.weightKg || '';
        document.getElementById('medical.allergies').value = patient.medical?.allergies || '';
        document.getElementById('medical.conditions').value = patient.medical?.conditions || '';
        document.getElementById('medical.medications').value = patient.medical?.medications || '';
        document.getElementById('medical.surgeries').value = patient.medical?.surgeries || '';
        document.getElementById('medical.smoker').checked = patient.medical?.smoker || false;

        // Populate insurance
        document.getElementById('insurance.provider').value = patient.insurance?.provider || '';
        document.getElementById('insurance.memberNo').value = patient.insurance?.memberNo || '';

        registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==========================================
    // 5. PATIENT SEARCH & PAGINATION
    // ==========================================

    async function loadPatients(searchTerm, page = 1) {
        const search = searchTerm.trim();
        currentSearch = search;
        currentPage = page;

        searchPatientsButton.disabled = true;
        searchPatientsButton.textContent = 'Searching...';

        try {
            const query = new URLSearchParams({ search, page: String(page), limit: String(PAGE_LIMIT) });
            const response = await window.MediLinkAPI.request(`/patients?${query.toString()}`, { method: 'GET' });
            const result = response.data;

            displayPatients(result.patients || []);

            const pagination = result.pagination;
            currentPage = pagination.page;
            currentTotalPages = pagination.totalPages;

            patientRecordCount.textContent = pagination.total === 0
                ? 'No matching patient records found.'
                : `${pagination.total} patient record(s) found. Page ${pagination.page} of ${pagination.totalPages}.`;

            displayPagination();

        } catch (error) {
            console.error('Patient search failed:', error);
            displayTableMessage(error.message);
            patientRecordCount.textContent = 'Unable to retrieve patient records.';
            paginationContainer.replaceChildren();
            if (error.status === 401) window.location.replace('login.html');
        } finally {
            searchPatientsButton.disabled = false;
            searchPatientsButton.textContent = 'Search';
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

        paginationContainer.appendChild(createPaginationButton('Previous', currentPage - 1, currentPage <= 1));
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(currentTotalPages, startPage + 4);
        startPage = Math.max(1, endPage - 4);

        for (let page = startPage; page <= endPage; page++) {
            paginationContainer.appendChild(createPaginationButton(String(page), page, false, page === currentPage));
        }
        paginationContainer.appendChild(createPaginationButton('Next', currentPage + 1, currentPage >= currentTotalPages));
    }

    // ==========================================
    // 6. REGISTER NEW PATIENT
    // ==========================================

        async function registerPatient(event) {
        event.preventDefault();
        if (!canRegisterPatients()) {
            registrationSection.hidden = true;
            showFormMessage('You do not have permission to manage patients.', 'danger');
            return;
        }

        hideFormMessage();
        const formData = new FormData(registrationForm);
        const formObject = Object.fromEntries(formData.entries());

        const birthDate = new Date(formObject.birthDate + 'T00:00:00');
        if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
            showFormMessage('Please provide a valid date of birth.', 'danger');
            return;
        }

        const patientData = {
            firstName: formObject.firstName,
            middleName: formObject.middleName,
            lastName: formObject.lastName,
            birthDate: formObject.birthDate,
            sex: formObject.sex,
            civilStatus: formObject.civilStatus,
            address: formObject.address,
            city: formObject.city,
            contactNo: formObject.contactNo,
            email: formObject.email,
            emergencyContact: {
                name: formObject['emergencyContact.name'],
                relationship: formObject['emergencyContact.relationship'],
                contactNo: formObject['emergencyContact.contactNo']
            },
            medical: {
                bloodType: formObject['medical.bloodType'],
                heightCm: formObject['medical.heightCm'] ? Number(formObject['medical.heightCm']) : undefined,
                weightKg: formObject['medical.weightKg'] ? Number(formObject['medical.weightKg']) : undefined,
                allergies: formObject['medical.allergies'],
                conditions: formObject['medical.conditions'],
                medications: formObject['medical.medications'],
                surgeries: formObject['medical.surgeries'],
                smoker: formObject['medical.smoker'] === 'on'
            },
            insurance: {
                provider: formObject['insurance.provider'],
                memberNo: formObject['insurance.memberNo']
            }
        };

        savePatientButton.disabled = true;
        savePatientButton.textContent = 'Saving...';

        // Check if we are editing (using a new data attribute on the form)
        const editingId = registrationForm.dataset.editingId;

        try {
            let response;
            if (editingId) {
                // UPDATE
                response = await window.MediLinkAPI.request(`/patients/${editingId}`, {
                    method: 'PATCH',
                    body: patientData
                });
            } else {
                // CREATE
                response = await window.MediLinkAPI.request('/patients', {
                    method: 'POST',
                    body: patientData
                });
            }

            const patient = response.data.patient;

            showFormMessage(response.message || 'Patient saved successfully.', 'success');
            
            // Reset form and remove editing state
            registrationForm.reset();
            delete registrationForm.dataset.editingId;
            savePatientButton.textContent = 'Save Patient';
            
            // Hide form after save
            setTimeout(() => { registrationSection.hidden = true; }, 1500);

            // Reload table
            searchInput.value = patient.patientId;
            await loadPatients(patient.patientId, 1);

        } catch (error) {
            console.error('Patient save failed:', error);
            showFormMessage(error.message, 'danger');
            if (error.status === 401) window.location.replace('login.html');
        } finally {
            savePatientButton.disabled = false;
            savePatientButton.textContent = registrationForm.dataset.editingId ? 'Update Patient' : 'Save Patient';
        }
    }

    // ==========================================
    // 7. VIEW PATIENT DETAILS
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
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            const response = await window.MediLinkAPI.request(`/patients/${encodeURIComponent(patientId)}`, { method: 'GET' });
            const patient = response.data.patient;

            detailsContent.replaceChildren();

            addPatientDetail('Patient ID', patient.patientId);
            addPatientDetail('Full Name', getPatientFullName(patient));
            addPatientDetail('Date of Birth', formatDate(patient.birthDate));
            addPatientDetail('Sex', patient.sex);
            addPatientDetail('Civil Status', patient.civilStatus);
            addPatientDetail('Address', `${patient.address || ''} ${patient.city || ''}`.trim());
            addPatientDetail('Contact Number', patient.contactNo);
            addPatientDetail('Email', patient.email);

            addPatientDetail('Emergency Contact', patient.emergencyContact?.name);
            addPatientDetail('Emergency Relation', patient.emergencyContact?.relationship);
            addPatientDetail('Emergency Phone', patient.emergencyContact?.contactNo);

            addPatientDetail('Blood Type', patient.medical?.bloodType);
            addPatientDetail('Height (cm)', patient.medical?.heightCm);
            addPatientDetail('Weight (kg)', patient.medical?.weightKg);
            addPatientDetail('Allergies', patient.medical?.allergies);
            addPatientDetail('Conditions', patient.medical?.conditions);
            addPatientDetail('Medications', patient.medical?.medications);
            addPatientDetail('Surgeries', patient.medical?.surgeries);
            addPatientDetail('Smoker', patient.medical?.smoker ? 'Yes' : 'No');

            addPatientDetail('Insurance Provider', patient.insurance?.provider);
            addPatientDetail('Insurance Member No.', patient.insurance?.memberNo);
            addPatientDetail('Date Registered', formatDate(patient.createdAt));

        } catch (error) {
            console.error('Patient details failed:', error);
            detailsContent.replaceChildren();
            addPatientDetail('Error', error.message);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    // ==========================================
    // 8. INITIALIZATION & EVENTS
    // ==========================================

    function configureRegistrationAccess(user) {
        if (addPatientButton) addPatientButton.hidden = false;
        if (registrationSection) registrationSection.hidden = true;
    }

    if (addPatientButton) {
        addPatientButton.addEventListener('click', () => {
            if (!canRegisterPatients()) {
                registrationSection.hidden = true;
                return;
            }
            registrationSection.hidden = !registrationSection.hidden;
            if (!registrationSection.hidden) {
                hideFormMessage();
                registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

        if (cancelPatientButton) {
        cancelPatientButton.addEventListener('click', () => {
            registrationForm.reset();
            delete registrationForm.dataset.editingId; // Remove edit state
            savePatientButton.textContent = 'Save Patient';
            hideFormMessage();
            registrationSection.hidden = true;
        });
    }

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
        detailsSection.hidden = true;
        loadPatients('', 1); 
    });

    closeDetailsButton.addEventListener('click', () => { detailsSection.hidden = true; });
    registrationForm.addEventListener('submit', registerPatient);

    if (sidebarToggle) sidebarToggle.addEventListener('click', () => appLayout.classList.toggle('sidebar-open'));
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => appLayout.classList.remove('sidebar-open'));
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
            currentUser = await window.MediLinkAuth.getCurrentUser();
            displayUserInformation(currentUser);
            configureRegistrationAccess(currentUser);
            await loadPatients('', 1);
        } catch (error) {
            console.error('Patient page authentication failed:', error);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    initializePatientPage();

})();