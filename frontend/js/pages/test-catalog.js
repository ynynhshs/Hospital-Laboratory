// ==========================================
// MEDILINK LABORATORY
// TEST CATALOG JAVASCRIPT
// ==========================================

(function () {
    'use strict';

    // 1. GET PAGE ELEMENTS
    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    const testSearch = document.getElementById('testSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFiltersButton = document.getElementById('resetFiltersButton');

    const addTestButton = document.getElementById('addTestButton');
    const registrationSection = document.getElementById('testRegistrationSection');
    const registrationForm = document.getElementById('testRegistrationForm');
    const testFormMessage = document.getElementById('testFormMessage');

    const saveTestButton = document.getElementById('saveTestButton');
    const cancelTestButton = document.getElementById('cancelTestButton');

    const tableBody = document.getElementById('testCatalogTableBody');
    const recordCount = document.getElementById('catalogRecordCount');
    const catalogNotice = document.getElementById('catalogNotice');

    const totalTestsCount = document.getElementById('totalTestsCount');
    const activeTestsCount = document.getElementById('activeTestsCount');
    const inactiveTestsCount = document.getElementById('inactiveTestsCount');

    // Create pagination container
    let paginationContainer = document.getElementById('catalogPagination');
    if (!paginationContainer && recordCount) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'catalogPagination';
        paginationContainer.className = 'catalog-pagination';
        recordCount.parentElement.insertAdjacentElement('afterend', paginationContainer);
    }

    // 2. PAGE STATE
    const PAGE_LIMIT = 10;
    let currentUser = null;
    let currentPage = 1;
    let currentTotalPages = 0;
    let searchTimer = null;
    let latestLoadId = 0;

    function canManageTests() {
        return currentUser?.role === 'lab_admin';
    }

    // 3. USER INFORMATION
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

    function configureRegistrationAccess() {
        const authorized = canManageTests();
        if (addTestButton) addTestButton.hidden = !authorized;
        if (!authorized && registrationSection) registrationSection.hidden = true;
    }

    // 4. FORM MESSAGE HANDLING
    function showFormMessage(message, type = 'info') {
        if (!testFormMessage) return;
        testFormMessage.textContent = message;
        testFormMessage.className = `alert catalog-form-message alert-${type}`;
        testFormMessage.hidden = false;
    }

    function hideFormMessage() {
        if (!testFormMessage) return;
        testFormMessage.textContent = '';
        testFormMessage.hidden = true;
    }

    // 5. TABLE DISPLAY HELPERS
    function createTableCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value ?? 'Not provided';
        return cell;
    }

    function displayTableMessage(message) {
        if (!tableBody) return;
        tableBody.replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 8;
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        const heading = document.createElement('h3');
        heading.className = 'empty-state-title';
        heading.textContent = message;
        emptyState.appendChild(heading);
        cell.appendChild(emptyState);
        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    function displayTests(tests) {
        tableBody.replaceChildren();

        if (!tests.length) {
            displayTableMessage('No matching laboratory tests found.');
            return;
        }

        tests.forEach((test) => {
            const row = document.createElement('tr');

            row.appendChild(createTableCell(test.testCode));
            row.appendChild(createTableCell(test.testName));
            row.appendChild(createTableCell(test.category));
            row.appendChild(createTableCell(test.specimenType));
            row.appendChild(createTableCell(test.testingMethod));
            row.appendChild(createTableCell(test.turnaroundTime));

            const statusCell = document.createElement('td');
            const status = document.createElement('span');
            status.className = `catalog-status status-${test.status}`;
            status.textContent = test.status.charAt(0).toUpperCase() + test.status.slice(1);
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actionCell = document.createElement('td');
            const actionGroup = document.createElement('div');
            actionGroup.className = 'table-action-group';
            actionGroup.style.display = 'flex';
            actionGroup.style.gap = '8px';

            const viewButton = document.createElement('button');
            viewButton.type = 'button';
            viewButton.className = 'table-action';
            viewButton.textContent = 'View';
            viewButton.addEventListener('click', () => viewTestDetails(test._id));

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'table-action';
            editButton.style.color = '#3b82f6'; // Blue for Edit
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => openEditTestForm(test));

            actionGroup.appendChild(viewButton);
            actionGroup.appendChild(editButton);
            actionCell.appendChild(actionGroup);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // 6. TEST CATALOG PAGINATION
    function createPaginationButton(label, page, disabled, active = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary btn-small';
        button.textContent = label;
        button.disabled = disabled;
        if (active) {
            button.classList.add('active');
            button.setAttribute('aria-current', 'page');
        }
        button.addEventListener('click', () => loadCatalog(page));
        return button;
    }

    function displayPagination() {
        if (!paginationContainer) return;
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

    // 7. LOAD LABORATORY TEST RECORDS
    async function loadCatalog(page = 1) {
        const loadId = ++latestLoadId;
        currentPage = page;

        if (tableBody) displayTableMessage('Loading laboratory test records...');
        if (recordCount) recordCount.textContent = 'Loading records...';
        if (paginationContainer) paginationContainer.replaceChildren();

        const query = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
        const search = testSearch?.value.trim() || '';
        const category = categoryFilter?.value || '';
        const status = statusFilter?.value || '';

        if (search) query.set('search', search);
        if (category) query.set('category', category);
        if (status) query.set('status', status);

        try {
            const response = await window.MediLinkAPI.request(`/test-catalog?${query.toString()}`, { method: 'GET' });
            if (loadId !== latestLoadId) return;
            const result = response.data;

            displayTests(result.tests || []);

            const pagination = result.pagination;
            currentPage = pagination.page;
            currentTotalPages = pagination.totalPages;

            if (recordCount) {
                recordCount.textContent = pagination.total === 0
                    ? 'No laboratory test records found.'
                    : `${pagination.total} laboratory test record(s) found. Page ${pagination.page} of ${pagination.totalPages}.`;
            }

            displayPagination();
            if (catalogNotice) catalogNotice.hidden = true;

        } catch (error) {
            if (loadId !== latestLoadId) return;
            console.error('Test catalog loading failed:', error);
            displayTableMessage(error.message);
            if (recordCount) recordCount.textContent = 'Unable to retrieve laboratory test records.';
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    // 8. SUMMARY CARD COUNTS
    async function getTestCount(status = '') {
        const query = new URLSearchParams({ page: '1', limit: '1' });
        if (status) query.set('status', status);
        const response = await window.MediLinkAPI.request(`/test-catalog?${query.toString()}`, { method: 'GET' });
        return response.data.pagination.total;
    }

    async function refreshSummaryCards() {
        try {
            const [total, active, inactive] = await Promise.all([
                getTestCount(), getTestCount('active'), getTestCount('inactive')
            ]);
            if (totalTestsCount) totalTestsCount.textContent = total;
            if (activeTestsCount) activeTestsCount.textContent = active;
            if (inactiveTestsCount) inactiveTestsCount.textContent = inactive;
        } catch (error) {
            console.error('Test catalog summary loading failed:', error);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    // 9. VIEW TEST DETAILS
    async function viewTestDetails(testId) {
        try {
            const response = await window.MediLinkAPI.request(`/test-catalog/${encodeURIComponent(testId)}`, { method: 'GET' });
            const test = response.data.test;
            const details = [
                `Test Code: ${test.testCode}`,
                `Test Name: ${test.testName}`,
                `Category: ${test.category}`,
                `Specimen Type: ${test.specimenType}`,
                `Testing Method: ${test.testingMethod}`,
                `Turnaround Time: ${test.turnaroundTime}`,
                `Status: ${test.status}`,
                `Date Registered: ${test.createdAt ? new Date(test.createdAt).toLocaleString() : 'Not available'}`
            ];
            window.alert(details.join('\n'));
        } catch (error) {
            console.error('Test details retrieval failed:', error);
            window.alert(error.message);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    // 10. OPEN EDIT FORM
    function openEditTestForm(test) {
        if (!canManageTests()) return;

        registrationSection.hidden = false;
        hideFormMessage();

        // Set editing ID on the form
        registrationForm.dataset.editingId = test._id;
        saveTestButton.textContent = 'Update Test';

        // Populate fields
        document.getElementById('testName').value = test.testName || '';
        document.getElementById('testCategory').value = test.category || '';
        document.getElementById('specimenType').value = test.specimenType || '';
        document.getElementById('testingMethod').value = test.testingMethod || '';
        document.getElementById('turnaroundTime').value = test.turnaroundTime || '';
        document.getElementById('testStatus').value = test.status || 'active';

        registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 11. SAVE / UPDATE TEST
    async function registerTest(event) {
        event.preventDefault();

        if (!canManageTests()) {
            showFormMessage('You do not have permission to manage laboratory tests.', 'danger');
            return;
        }

        hideFormMessage();
        const formData = new FormData(registrationForm);
        const testData = Object.fromEntries(formData.entries());

        saveTestButton.disabled = true;
        saveTestButton.textContent = 'Saving...';

        const editingId = registrationForm.dataset.editingId;

        try {
            let response;
            if (editingId) {
                // UPDATE
                response = await window.MediLinkAPI.request(`/test-catalog/${editingId}`, {
                    method: 'PATCH',
                    body: testData
                });
            } else {
                // CREATE
                response = await window.MediLinkAPI.request('/test-catalog', {
                    method: 'POST',
                    body: testData
                });
            }

            showFormMessage(response.message || 'Laboratory test saved successfully.', 'success');

            registrationForm.reset();
            delete registrationForm.dataset.editingId;
            saveTestButton.textContent = 'Save Laboratory Test';

            testSearch.value = '';
            categoryFilter.value = '';
            statusFilter.value = '';
            currentPage = 1;

            await Promise.all([loadCatalog(1), refreshSummaryCards()]);

            // Optionally hide form after save
            setTimeout(() => { registrationSection.hidden = true; }, 1500);

        } catch (error) {
            console.error('Laboratory test save failed:', error);
            showFormMessage(error.message, 'danger');
            if (error.status === 401) window.location.replace('login.html');
        } finally {
            saveTestButton.disabled = false;
            saveTestButton.textContent = registrationForm.dataset.editingId ? 'Update Test' : 'Save Laboratory Test';
        }
    }

    // 12. REGISTRATION FORM VISIBILITY & EVENTS
    if (addTestButton) {
        addTestButton.hidden = true;
        addTestButton.addEventListener('click', () => {
            if (!canManageTests()) return;
            
            // If opening a new form, clear edit state
            if (registrationSection.hidden) {
                registrationForm.reset();
                delete registrationForm.dataset.editingId;
                saveTestButton.textContent = 'Save Laboratory Test';
            }

            registrationSection.hidden = !registrationSection.hidden;

            if (!registrationSection.hidden) {
                hideFormMessage();
                registrationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    if (cancelTestButton) {
        cancelTestButton.addEventListener('click', () => {
            registrationForm.reset();
            delete registrationForm.dataset.editingId;
            saveTestButton.textContent = 'Save Laboratory Test';
            hideFormMessage();
            registrationSection.hidden = true;
        });
    }

    if (registrationForm) {
        registrationForm.addEventListener('submit', registerTest);
    }

    // 13. SEARCH AND FILTER EVENTS
    if (testSearch) testSearch.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadCatalog(1), 350); });
    if (categoryFilter) categoryFilter.addEventListener('change', () => loadCatalog(1));
    if (statusFilter) statusFilter.addEventListener('change', () => loadCatalog(1));
    
    if (resetFiltersButton) {
        resetFiltersButton.addEventListener('click', () => {
            testSearch.value = ''; categoryFilter.value = ''; statusFilter.value = '';
            clearTimeout(searchTimer);
            loadCatalog(1);
        });
    }

    // 14. MOBILE SIDEBAR
    function openSidebar() { if (!appLayout || !sidebarToggle) return; appLayout.classList.add('sidebar-open'); sidebarToggle.setAttribute('aria-expanded', 'true'); }
    function closeSidebar() { if (!appLayout || !sidebarToggle) return; appLayout.classList.remove('sidebar-open'); sidebarToggle.setAttribute('aria-expanded', 'false'); }

    if (sidebarToggle) sidebarToggle.addEventListener('click', () => appLayout.classList.contains('sidebar-open') ? closeSidebar() : openSidebar());
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => link.addEventListener('click', closeSidebar));

    // 15. LOGOUT
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            const confirmed = window.confirm('Are you sure you want to log out of MediLink?');
            if (!confirmed) return;
            logoutButton.disabled = true; logoutButton.textContent = 'Logging Out...';
            try { await window.MediLinkAuth.logout(); window.location.replace('login.html'); }
            catch (error) { console.error('Logout failed:', error); window.alert(error.message || 'Unable to log out.'); logoutButton.disabled = false; logoutButton.textContent = 'Logout'; }
        });
    }

    // 16. INITIALIZE
    async function initializeTestCatalogPage() {
        try {
            currentUser = await window.MediLinkAuth.getCurrentUser();
            displayUserInformation(currentUser);
            configureRegistrationAccess();
            await Promise.all([loadCatalog(1), refreshSummaryCards()]);
        } catch (error) {
            console.error('Test Catalog authentication failed:', error);
            if (error.status === 401) window.location.replace('login.html');
        }
    }

    initializeTestCatalogPage();

})();