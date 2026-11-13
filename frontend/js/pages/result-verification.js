(function () {
    'use strict';

    // 1. Elements
    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const verificationTableBody = document.getElementById('verificationTableBody');
    const verificationRecordCount = document.getElementById('verificationRecordCount');
    const refreshVerificationButton = document.getElementById('refreshVerificationButton');
    const verificationSearch = document.getElementById('verificationSearch');

    // Form Elements
    const reviewRequestNumber = document.getElementById('reviewRequestNumber');
    const reviewPatientName = document.getElementById('reviewPatientName');
    const reviewTestName = document.getElementById('reviewTestName');
    const reviewEnteredBy = document.getElementById('reviewEnteredBy');
    const reviewSubmittedDate = document.getElementById('reviewSubmittedDate');
    const reviewResultComponentsBody = document.getElementById('reviewResultComponentsBody');
    const verificationRemarks = document.getElementById('verificationRemarks');
    const clearVerificationButton = document.getElementById('clearVerificationButton');
    
    const verifyResultButton = document.getElementById('verifyResultButton');
    const releaseResultButton = document.getElementById('releaseResultButton');

    // State
    let pendingResults = [];
    let selectedResultId = null;

    // 2. Fetch Results from API
    async function loadResults() {
        try {
            const response = await window.MediLinkAPI.request('/results', { method: 'GET' });
            const allResults = response.data.results || [];
            
            // Only show results that are Pending Verification
            pendingResults = allResults.filter(r => r.status === 'pending_verification');
            
            renderTable();
            updateSummaryCounts();
        } catch (error) {
            console.error('Failed to load results:', error);
            verificationTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }

    // 3. Render Table
    function renderTable() {
        verificationTableBody.replaceChildren();
        const searchTerm = verificationSearch.value.toLowerCase();

        const filtered = pendingResults.filter(r => {
            const patientName = r.patientId ? `${r.patientId.firstName} ${r.patientId.lastName}` : 'Unknown';
            const reqNo = r.requestId ? r.requestId.requestNumber : 'N/A';
            return reqNo.toLowerCase().includes(searchTerm) || 
                   patientName.toLowerCase().includes(searchTerm) || 
                   r.testName.toLowerCase().includes(searchTerm);
        });

        if (filtered.length === 0) {
            verificationTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">✓</div>
                            <h3 class="empty-state-title">No results awaiting review</h3>
                            <p class="empty-state-description">Submitted laboratory results will appear here for verification.</p>
                        </div>
                    </td>
                </tr>`;
            verificationRecordCount.textContent = 'No laboratory results available.';
            return;
        }

        filtered.forEach(res => {
            const tr = document.createElement('tr');
            
            const patientName = res.patientId ? `${res.patientId.firstName} ${res.patientId.lastName}` : 'Unknown';
            const enteredBy = res.enteredBy ? `${res.enteredBy.firstName} ${res.enteredBy.lastName}` : 'Unknown';
            const reqNo = res.requestId ? res.requestId.requestNumber : 'N/A';
            const dateStr = new Date(res.createdAt).toLocaleDateString();

            tr.innerHTML = `
                <td>${reqNo}</td>
                <td>${patientName}</td>
                <td>${res.testName}</td>
                <td>${enteredBy}</td>
                <td>${dateStr}</td>
                <td><span class="badge badge-pending">PENDING</span></td>
                <td><button class="btn btn-secondary btn-small review-btn">Review</button></td>
            `;

            tr.querySelector('.review-btn').addEventListener('click', () => selectRow(res));
            verificationTableBody.appendChild(tr);
        });

        verificationRecordCount.textContent = `Showing ${filtered.length} pending result(s).`;
    }

    // 4. Update Summary Cards
    function updateSummaryCounts() {
        document.getElementById('pendingVerificationCount').textContent = pendingResults.length;
        // Other counts can be wired up later
    }

    // 5. Select a Row and Populate Form
    function selectRow(res) {
        selectedResultId = res._id;
        
        const patientName = res.patientId ? `${res.patientId.firstName} ${res.patientId.lastName}` : 'Unknown';
        const enteredBy = res.enteredBy ? `${res.enteredBy.firstName} ${res.enteredBy.lastName}` : 'Unknown';
        const reqNo = res.requestId ? res.requestId.requestNumber : 'N/A';

        reviewRequestNumber.value = reqNo;
        reviewPatientName.value = patientName;
        reviewTestName.value = res.testName;
        reviewEnteredBy.value = enteredBy;
        reviewSubmittedDate.value = new Date(res.createdAt).toLocaleString();

        // Populate the Result Value row
        reviewResultComponentsBody.innerHTML = `
            <tr>
                <td>${res.testName}</td>
                <td><strong>${res.resultValue}</strong></td>
                <td>${res.unit || '—'}</td>
                <td>${res.referenceRange || '—'}</td>
                <td>—</td>
            </tr>
        `;

        // Enable buttons
        verificationRemarks.disabled = false;
        verifyResultButton.disabled = false;
        releaseResultButton.disabled = false;

        // Scroll to form
        document.querySelector('.verification-review-card').scrollIntoView({ behavior: 'smooth' });
    }

    // 6. Verify and Release Action
    async function verifyAndRelease() {
        if (!selectedResultId) return;

        const confirmVerify = window.confirm("Are you sure you want to verify and release this result?");
        if (!confirmVerify) return;

        verifyResultButton.disabled = true;
        releaseResultButton.disabled = true;
        verifyResultButton.textContent = 'Processing...';

        try {
            await window.MediLinkAPI.request(`/results/${selectedResultId}/verify`, {
                method: 'PATCH'
            });

            alert('Result verified and released successfully!');
            clearForm();
            await loadResults(); // Refresh table

        } catch (error) {
            alert('Failed to verify result: ' + error.message);
            verifyResultButton.disabled = false;
            releaseResultButton.disabled = false;
            verifyResultButton.textContent = 'Verify Result';
        }
    }

    if (verifyResultButton) verifyResultButton.addEventListener('click', verifyAndRelease);
    if (releaseResultButton) releaseResultButton.addEventListener('click', verifyAndRelease); // Same action

    // 7. Clear Form
    function clearForm() {
        selectedResultId = null;
        reviewRequestNumber.value = '';
        reviewPatientName.value = '';
        reviewTestName.value = '';
        reviewEnteredBy.value = '';
        reviewSubmittedDate.value = '';
        reviewResultComponentsBody.innerHTML = '<tr><td colspan="5">No result details available.</td></tr>';
        
        verificationRemarks.value = '';
        verificationRemarks.disabled = true;
        
        verifyResultButton.disabled = true;
        releaseResultButton.disabled = true;
        verifyResultButton.textContent = 'Verify Result';
    }

    if (clearVerificationButton) clearVerificationButton.addEventListener('click', clearForm);
    if (refreshVerificationButton) refreshVerificationButton.addEventListener('click', loadResults);
    if (verificationSearch) verificationSearch.addEventListener('input', renderTable);

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
            await window.MediLinkAuth.getCurrentUser(); // Verify auth
            clearForm();
            await loadResults();
        } catch (error) {
            if (error.status === 401) window.location.replace('login.html');
        }
    }
    init();

})();