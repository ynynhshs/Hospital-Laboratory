(function () {
    'use strict';

    // 1. Get Page Elements
    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const historySearch = document.getElementById('historySearch');
    const historyRecordTypeFilter = document.getElementById('historyRecordTypeFilter');
    const historyStatusFilter = document.getElementById('historyStatusFilter');
    const historyStartDate = document.getElementById('historyStartDate');
    const historyEndDate = document.getElementById('historyEndDate');
    const applyHistoryFiltersButton = document.getElementById('applyHistoryFiltersButton');
    const resetHistoryFiltersButton = document.getElementById('resetHistoryFiltersButton');
    const refreshHistoryButton = document.getElementById('refreshHistoryButton');
    const historyTableBody = document.getElementById('historyTableBody');
    const historyRecordCount = document.getElementById('historyRecordCount');

    // Historical Details Elements
    const historyDetailsStatus = document.getElementById('historyDetailsStatus');
    const historyPatientName = document.getElementById('historyPatientName');
    const historyRequestNumber = document.getElementById('historyRequestNumber');
    const historyTestName = document.getElementById('historyTestName');
    const historySpecimenCode = document.getElementById('historySpecimenCode');
    const historyRecordDate = document.getElementById('historyRecordDate');
    const historyRecordType = document.getElementById('historyRecordType');
    const historyResultComponentsBody = document.getElementById('historyResultComponentsBody');
    const historyEnteredBy = document.getElementById('historyEnteredBy');
    const historyVerifiedBy = document.getElementById('historyVerifiedBy');
    const historyReleasedDate = document.getElementById('historyReleasedDate');
    const historyAmendmentStatus = document.getElementById('historyAmendmentStatus');
    const clearHistoryDetailsButton = document.getElementById('clearHistoryDetailsButton');

    // 2. State variable to hold the data
    let allHistoryRecords = [];

    // 3. Load Data from API
    async function loadHistory() {
        historyTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Loading history records...</td></tr>`;

        try {
            const response = await window.MediLinkAPI.request('/results', { method: 'GET' });
            const allResults = response.data.results || [];
            
            // Filter to only show completed/released/verified results
            allHistoryRecords = allResults.filter(r => ['released', 'verified'].includes(r.status));

            updateSummaryCounts();
            renderTable();

        } catch (error) {
            console.error('Failed to load history:', error);
            historyTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        }
    }

    // 4. Render Table
    // 4. Render Table
    function renderTable() {
        historyTableBody.replaceChildren();

        if (allHistoryRecords.length === 0) {
            // ... (keep the empty state code as is)
            return;
        }

        allHistoryRecords.forEach(res => {
            const tr = document.createElement('tr');
            tr.dataset.historyRow = 'true';
            
            // Format data safely
            const dateStr = res.verifiedAt ? new Date(res.verifiedAt).toLocaleDateString() : new Date(res.updatedAt).toLocaleDateString();
            const patientName = res.patientId ? `${res.patientId.firstName} ${res.patientId.lastName}` : 'Unknown';
            const reqNo = res.requestId ? res.requestId.requestNumber : 'N/A';
            
            // --- FIXED USER NAMES HERE ---
            const enteredBy = res.enteredBy ? (res.enteredBy.fullName || res.enteredBy.username || `${res.enteredBy.firstName || ''} ${res.enteredBy.lastName || ''}`.trim() || 'Unknown') : 'Unknown';
            const verifiedBy = res.verifiedBy ? (res.verifiedBy.fullName || res.verifiedBy.username || `${res.verifiedBy.firstName || ''} ${res.verifiedBy.lastName || ''}`.trim() || 'System') : 'System';
            
            const statusLabel = res.status.replace('_', ' ').toUpperCase();
            const specimenCode = res.specimenId ? res.specimenId.specimenCode : 'N/A';

            // Add dataset attributes
            tr.dataset.recordDate = res.verifiedAt ? new Date(res.verifiedAt).toISOString().split('T')[0] : '';
            tr.dataset.enteredBy = enteredBy;
            tr.dataset.verifiedBy = verifiedBy;
            tr.dataset.releasedDate = res.verifiedAt ? new Date(res.verifiedAt).toLocaleString() : 'N/A';
            tr.dataset.resultComponents = JSON.stringify([{
                name: res.testName,
                value: res.resultValue,
                unit: res.unit || '—',
                referenceRange: res.referenceRange || '—',
                flag: '—'
            }]);

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>Result</td>
                <td>${patientName}</td>
                <td>${reqNo}</td>
                <td>${res.testName}</td>
                <td>${specimenCode}</td>
                <td><span class="badge badge-success">${statusLabel}</span></td>
                <td><button class="btn btn-secondary btn-small view-btn" data-action="view-history">View</button></td>
            `;

            historyTableBody.appendChild(tr);
        });

        filterHistoryRecords();
    }

    // 5. Update Summary Counts
    function updateSummaryCounts() {
        document.getElementById('totalHistoryCount').textContent = allHistoryRecords.length;
        document.getElementById('releasedHistoryCount').textContent = allHistoryRecords.filter(r => r.status === 'released').length;
        document.getElementById('amendedHistoryCount').textContent = '0';
        
        // Count unique patients
        const uniquePatients = new Set(allHistoryRecords.map(r => r.patientId?._id).filter(Boolean));
        document.getElementById('patientsWithHistoryCount').textContent = uniquePatients.size;
    }

    // 6. Filter Historical Records
    function filterHistoryRecords() {
        const rows = Array.from(historyTableBody.querySelectorAll('tr[data-history-row="true"]'));
        if (rows.length === 0) return;

        const searchValue = historySearch ? historySearch.value.trim().toLowerCase() : '';
        const selectedRecordType = historyRecordTypeFilter ? historyRecordTypeFilter.value.trim().toLowerCase() : '';
        const selectedStatus = historyStatusFilter ? historyStatusFilter.value.trim().toLowerCase() : '';
        const startDate = historyStartDate ? historyStartDate.value : '';
        const endDate = historyEndDate ? historyEndDate.value : '';

        let visibleCount = 0;

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            const recordType = cells[1].textContent.toLowerCase().trim();
            const patientName = cells[2].textContent.toLowerCase();
            const requestNumber = cells[3].textContent.toLowerCase();
            const testName = cells[4].textContent.toLowerCase();
            const status = cells[6].textContent.toLowerCase().trim();
            const recordDate = row.dataset.recordDate || '';

            const matchesSearch = patientName.includes(searchValue) || requestNumber.includes(searchValue) || testName.includes(searchValue);
            const matchesRecordType = !selectedRecordType || recordType.includes(selectedRecordType);
            const matchesStatus = !selectedStatus || status.includes(selectedStatus);
            const matchesStartDate = !startDate || (recordDate && recordDate >= startDate);
            const matchesEndDate = !endDate || (recordDate && recordDate <= endDate);

            const isVisible = matchesSearch && matchesRecordType && matchesStatus && matchesStartDate && matchesEndDate;

            row.hidden = !isVisible;
            if (isVisible) visibleCount++;
        });

        historyRecordCount.textContent = `Showing ${visibleCount} of ${rows.length} historical records.`;
    }

    // 7. Select Historical Record
    function selectHistoricalRecord(row) {
        if (!row) return;
        const cells = row.querySelectorAll('td');
        if (cells.length !== 8) return;

        historyPatientName.value = cells[2].textContent.trim();
        historyRequestNumber.value = cells[3].textContent.trim();
        historyTestName.value = cells[4].textContent.trim();
        historySpecimenCode.value = cells[5].textContent.trim();
        historyRecordDate.value = cells[0].textContent.trim();
        historyRecordType.value = cells[1].textContent.trim();
        
        historyEnteredBy.value = row.dataset.enteredBy || '';
        historyVerifiedBy.value = row.dataset.verifiedBy || '';
        historyReleasedDate.value = row.dataset.releasedDate || '';
        historyAmendmentStatus.value = 'No amendment information';

        // Populate components
        historyResultComponentsBody.replaceChildren();
        try {
            const components = JSON.parse(row.dataset.resultComponents || '[]');
            components.forEach(comp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${comp.name}</td><td>${comp.value}</td><td>${comp.unit}</td><td>${comp.referenceRange}</td><td>${comp.flag}</td>`;
                historyResultComponentsBody.appendChild(tr);
            });
        } catch (e) {
            console.error("Error parsing components:", e);
        }

        historyDetailsStatus.textContent = cells[6].textContent.trim();
        historyDetailsStatus.className = 'badge badge-success';

        document.querySelector('.history-details-card').scrollIntoView({ behavior: 'smooth' });
    }

    // 8. Clear Details
    function clearHistoryDetails() {
        [historyPatientName, historyRequestNumber, historyTestName, historySpecimenCode, 
         historyRecordDate, historyRecordType, historyEnteredBy, historyVerifiedBy, 
         historyReleasedDate, historyAmendmentStatus].forEach(f => { if(f) f.value = ''; });
         
        historyResultComponentsBody.innerHTML = '<tr><td colspan="5">No historical result details available.</td></tr>';
        historyDetailsStatus.textContent = 'No Record Selected';
        historyDetailsStatus.className = 'badge badge-neutral';
    }

    // 9. Event Listeners
    if (historyTableBody) {
        historyTableBody.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-action="view-history"]');
            if (btn) selectHistoricalRecord(btn.closest('tr'));
        });
    }

    if (refreshHistoryButton) refreshHistoryButton.addEventListener('click', loadHistory);
    if (applyHistoryFiltersButton) applyHistoryFiltersButton.addEventListener('click', filterHistoryRecords);
    if (historySearch) historySearch.addEventListener('input', filterHistoryRecords);
    if (clearHistoryDetailsButton) clearHistoryDetailsButton.addEventListener('click', clearHistoryDetails);

    if (resetHistoryFiltersButton) {
        resetHistoryFiltersButton.addEventListener('click', () => {
            historySearch.value = '';
            historyRecordTypeFilter.value = '';
            historyStatusFilter.value = '';
            historyStartDate.value = '';
            historyEndDate.value = '';
            filterHistoryRecords();
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

    // Initialize
    async function init() {
        try {
            await window.MediLinkAuth.getCurrentUser();
            clearHistoryDetails();
            await loadHistory();
        } catch (error) {
            if (error.status === 401) window.location.replace('login.html');
        }
    }
    init();

})();