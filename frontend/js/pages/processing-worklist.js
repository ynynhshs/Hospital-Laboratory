(function () {
    'use strict';

    // 1. Elements
    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatarElement = document.getElementById('userAvatar');

    const tableBody = document.getElementById('processingTableBody');
    const recordCount = document.getElementById('processingRecordCount');
    const refreshWorklistButton = document.getElementById('refreshWorklistButton');
    const processingSearch = document.getElementById('processingSearch');
    const processingStatusFilter = document.getElementById('processingStatusFilter');
    const resetProcessingFiltersButton = document.getElementById('resetProcessingFiltersButton');

    // Modal Elements
    const statusModal = document.getElementById('statusModal');
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
    const cancelStatusModalBtn = document.getElementById('cancelStatusModalBtn');
    const saveStatusBtn = document.getElementById('saveStatusBtn');
    const modalTestName = document.getElementById('modalTestName');
    const modalStatusSelect = document.getElementById('modalStatusSelect');

    let allProcessingRows = [];
    let selectedRequestId = null;
    let selectedTestId = null;

    // 2. User Info
    function displayUserInformation(user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        userNameElement.textContent = fullName;
        userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
        
        const roleNames = {
            lab_admin: 'Laboratory Administrator',
            lab_technologist: 'Laboratory Technologist'
        };
        userRoleElement.textContent = roleNames[user.role] || 'Laboratory Personnel';
    }

        // 3. Load Data
    async function loadWorklist() {
        try {
            // Fetch requests without specifying the status in the URL to avoid backend validation errors
            const [reqResponse, specResponse] = await Promise.all([
                window.MediLinkAPI.request('/lab-requests?limit=100', { method: 'GET' }),
                window.MediLinkAPI.request('/specimens', { method: 'GET' })
            ]);

            const allRequests = reqResponse.data.requests || [];
            const specimens = specResponse.data.specimens || [];

            // Filter to only include requests that are ready for the worklist
            const validStatuses = ['submitted', 'accepted', 'in_progress', 'partially_completed'];
            const requests = allRequests.filter(req => validStatuses.includes(req.status));

            // Map specimen codes to requests
            const specimenMap = {};
            specimens.forEach(spc => {
                if (spc.requestId) {
                    specimenMap[spc.requestId._id || spc.requestId] = spc.specimenCode;
                }
            });

            // Flatten requests into individual test rows
            allProcessingRows = [];
            requests.forEach(req => {
                const specimenCode = specimenMap[req._id] || 'N/A';
                const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown';

                req.tests.forEach(test => {
                    allProcessingRows.push({
                        requestId: req._id,
                        requestNumber: req.requestNumber,
                        patientName: patientName,
                        testId: test._id,
                        testName: test.testSnapshot.testName,
                        specimenCode: specimenCode,
                        priority: req.priority,
                        status: test.status // pending, in_progress, completed
                    });
                });
            });

            renderTable();
            updateSummaryCounts();

        } catch (error) {
            console.error('Failed to load worklist:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }

    // 4. Render Table
    function renderTable() {
        tableBody.replaceChildren();

        const searchTerm = processingSearch.value.toLowerCase();
        const statusFilter = processingStatusFilter.value.toLowerCase();

        const filtered = allProcessingRows.filter(row => {
            const matchesSearch = row.requestNumber.toLowerCase().includes(searchTerm) || 
                                  row.patientName.toLowerCase().includes(searchTerm) || 
                                  row.testName.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || row.status.toLowerCase().replace('_', ' ').includes(statusFilter);
            
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">⚙</div>
                            <h3 class="empty-state-title">No processing records found</h3>
                            <p class="empty-state-description">Try changing your search or filter selections.</p>
                        </div>
                    </td>
                </tr>`;
            recordCount.textContent = 'No matching records.';
            return;
        }

        filtered.forEach(row => {
            const tr = document.createElement('tr');
            
            let statusClass = 'badge-neutral';
            if (row.status === 'in_progress') statusClass = 'badge-progress';
            if (row.status === 'completed') statusClass = 'badge-completed';
            if (row.status === 'pending') statusClass = 'badge-pending';

            const statusLabel = row.status.replace('_', ' ').toUpperCase();

            tr.innerHTML = `
                <td>${row.requestNumber}</td>
                <td>${row.patientName}</td>
                <td>${row.testName}</td>
                <td>${row.specimenCode}</td>
                <td><span class="priority-${row.priority}">${row.priority.toUpperCase()}</span></td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <button class="btn btn-secondary btn-small update-status-btn" data-id="${row.testId}" data-req="${row.requestId}" data-status="${row.status}" data-name="${row.testName}">Update</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        recordCount.textContent = `Showing ${filtered.length} of ${allProcessingRows.length} tests.`;
    }

    // 5. Summary Counts
    function updateSummaryCounts() {
        document.getElementById('totalProcessingCount').textContent = allProcessingRows.length;
        document.getElementById('pendingProcessingCount').textContent = allProcessingRows.filter(r => r.status === 'pending').length;
        document.getElementById('activeProcessingCount').textContent = allProcessingRows.filter(r => r.status === 'in_progress').length;
        document.getElementById('completedProcessingCount').textContent = allProcessingRows.filter(r => r.status === 'completed').length;
    }

    // 6. Modal Logic
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.update-status-btn');
        if (!btn) return;

        selectedRequestId = btn.dataset.req;
        selectedTestId = btn.dataset.id;
        const currentStatus = btn.dataset.status;
        const testName = btn.dataset.name;

        modalTestName.textContent = testName;
        modalStatusSelect.value = currentStatus;
        statusModal.hidden = false;
    });

    function closeModal() {
        statusModal.hidden = true;
        selectedRequestId = null;
        selectedTestId = null;
    }

    if (closeStatusModalBtn) closeStatusModalBtn.addEventListener('click', closeModal);
    if (cancelStatusModalBtn) cancelStatusModalBtn.addEventListener('click', closeModal);

    // 7. Save Status
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', async () => {
            if (!selectedRequestId || !selectedTestId) return;

            const newStatus = modalStatusSelect.value;
            saveStatusBtn.disabled = true;
            saveStatusBtn.textContent = 'Updating...';

            try {
                await window.MediLinkAPI.request(`/lab-requests/${selectedRequestId}/tests/${selectedTestId}/status`, {
                    method: 'PATCH',
                    body: { status: newStatus }
                });

                closeModal();
                await loadWorklist(); // Refresh table

            } catch (error) {
                alert('Failed to update status: ' + error.message);
            } finally {
                saveStatusBtn.disabled = false;
                saveStatusBtn.textContent = 'Update Status';
            }
        });
    }

    // 8. Filters & Events
    if (refreshWorklistButton) refreshWorklistButton.addEventListener('click', loadWorklist);
    if (processingSearch) processingSearch.addEventListener('input', renderTable);
    if (processingStatusFilter) processingStatusFilter.addEventListener('change', renderTable);
    
    if (resetProcessingFiltersButton) {
        resetProcessingFiltersButton.addEventListener('click', () => {
            processingSearch.value = '';
            processingStatusFilter.value = '';
            renderTable();
        });
    }

    // Sidebar & Logout
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => appLayout.classList.toggle('sidebar-open'));
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => appLayout.classList.remove('sidebar-open'));
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (confirm('Log out?')) {
                await window.MediLinkAuth.logout();
                window.location.replace('login.html');
            }
        });
    }

    // 9. Initialize
    async function init() {
        try {
            const user = await window.MediLinkAuth.getCurrentUser();
            displayUserInformation(user);
            await loadWorklist();
        } catch (error) {
            if (error.status === 401) window.location.replace('login.html');
        }
    }
    init();
})();