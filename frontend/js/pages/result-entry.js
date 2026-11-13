(function () {
    'use strict';

    // 1. Elements
    const appLayout = document.getElementById('appLayout');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutButton = document.getElementById('logoutButton');

    const worklistTableBody = document.getElementById('resultWorklistTableBody');
    const worklistRecordCount = document.getElementById('resultWorklistRecordCount');
    const refreshResultWorklistButton = document.getElementById('refreshResultWorklistButton');
    const resultWorklistSearch = document.getElementById('resultWorklistSearch');

    // Form Elements
    const resultEntryForm = document.getElementById('resultEntryForm');
    const resultFormStatus = document.getElementById('resultFormStatus');
    const resultRequestNumber = document.getElementById('resultRequestNumber');
    const resultPatientName = document.getElementById('resultPatientName');
    const resultTestName = document.getElementById('resultTestName');
    const resultSpecimenType = document.getElementById('resultSpecimenType');
    const resultUnit = document.getElementById('resultUnit');
    const resultReferenceRange = document.getElementById('resultReferenceRange');
    const resultValue = document.getElementById('resultValue');
    const resultRemarks = document.getElementById('resultRemarks');
    const resultGeneralNotes = document.getElementById('resultGeneralNotes');
    const clearResultFormButton = document.getElementById('clearResultFormButton');
    const submitResultButton = document.getElementById('submitResultButton');

    // State variables
    let awaitingResults = [];
    let selectedTestData = null;

    // 2. Load Data
    async function loadAwaitingResults() {
        try {
            const response = await window.MediLinkAPI.request('/results/awaiting', { method: 'GET' });
            awaitingResults = response.data.awaiting || [];
            renderTable();
            updateSummaryCounts();
        } catch (error) {
            console.error('Failed to load awaiting results:', error);
            worklistTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }

    // 3. Render Table
    function renderTable() {
        worklistTableBody.replaceChildren();

        const searchTerm = resultWorklistSearch.value.toLowerCase();

        const filtered = awaitingResults.filter(row => {
            return row.requestNumber.toLowerCase().includes(searchTerm) || 
                   row.patientName.toLowerCase().includes(searchTerm) || 
                   row.testName.toLowerCase().includes(searchTerm);
        });

        if (filtered.length === 0) {
            worklistTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">✎</div>
                            <h3 class="empty-state-title">No tests awaiting result entry</h3>
                            <p class="empty-state-description">Completed laboratory tests eligible for result entry will appear here.</p>
                        </div>
                    </td>
                </tr>`;
            worklistRecordCount.textContent = 'No laboratory tests available.';
            return;
        }

        filtered.forEach(row => {
            const tr = document.createElement('tr');
            
            // Highlight returned rows in red
            if (row.isReturned) {
                tr.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }

            const statusBadge = row.isReturned 
                ? `<span class="badge badge-danger">CORRECTION</span>`
                : `<span class="badge badge-pending">AWAITING ENTRY</span>`;

            tr.innerHTML = `
                <td>${row.requestNumber}</td>
                <td>${row.patientName}</td>
                <td>${row.testName}</td>
                <td>${row.specimenType}</td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>${statusBadge}</td>
                <td><button class="btn btn-secondary btn-small enter-result-btn">${row.isReturned ? 'Correct' : 'Enter Result'}</button></td>
            `;

            tr.querySelector('.enter-result-btn').addEventListener('click', () => {
                selectRow(row);
            });

            worklistTableBody.appendChild(tr);
        });

        worklistRecordCount.textContent = `Showing ${filtered.length} of ${awaitingResults.length} laboratory tests.`;
    }

    // 4. Update Summary Counts
    function updateSummaryCounts() {
        document.getElementById('awaitingResultCount').textContent = awaitingResults.length;
        document.getElementById('draftResultCount').textContent = '0'; 
        document.getElementById('pendingVerificationCount').textContent = '0';
        document.getElementById('releasedResultCount').textContent = '0';
    }

    // 5. Select Row & Populate Form
    function selectRow(row) {
        selectedTestData = row;

        resultRequestNumber.value = row.requestNumber;
        resultPatientName.value = row.patientName;
        resultTestName.value = row.testName;
        resultSpecimenType.value = row.specimenType || 'N/A';
        resultUnit.value = row.unit || '';
        resultReferenceRange.value = row.referenceRange || '';

        // Show correction warning if returned
        let warningBox = document.getElementById('correctionWarning');
        if (row.isReturned) {
            if (!warningBox) {
                warningBox = document.createElement('div');
                warningBox.id = 'correctionWarning';
                warningBox.className = 'alert alert-danger';
                warningBox.style.marginBottom = '20px';
                warningBox.style.color = '#991b1b';
                warningBox.style.backgroundColor = '#fee2e2';
                warningBox.style.padding = '15px';
                warningBox.style.borderRadius = '8px';
                warningBox.style.border = '1px solid #f87171';
                
                // Insert it right above the form grid
                const formSection = resultEntryForm.querySelector('.result-form-section');
                resultEntryForm.insertBefore(warningBox, formSection);
            }
            warningBox.innerHTML = `
                <strong>Returned for Correction!</strong><br>
                <strong>Verifier Remarks:</strong> ${row.verificationRemarks}<br>
                <small>Previous Value: ${row.previousValue}</small>
            `;
            resultValue.value = row.previousValue; 
        } else {
            if (warningBox) warningBox.remove();
            resultValue.value = ''; 
        }

        // Enable fields
        resultValue.disabled = false;
        resultRemarks.disabled = false;
        resultGeneralNotes.disabled = false;
        submitResultButton.disabled = false;

        resultFormStatus.textContent = row.isReturned ? 'Correction Required' : 'Entering Result';
        resultFormStatus.className = row.isReturned ? 'badge badge-danger' : 'badge badge-info';

        document.querySelector('.result-entry-card').scrollIntoView({ behavior: 'smooth' });
    }

    // 6. Submit Form
    if (resultEntryForm) {
        resultEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedTestData) {
                alert('Please select a test from the worklist first.');
                return;
            }

            const resultVal = resultValue.value.trim();
            if (!resultVal) {
                alert('Please enter the test result value.');
                return;
            }

            submitResultButton.disabled = true;
            submitResultButton.textContent = 'Saving...';

            try {
                await window.MediLinkAPI.request('/results', {
                    method: 'POST',
                    body: {
                        requestId: selectedTestData.requestId,
                        testId: selectedTestData.testId,
                        testName: selectedTestData.testName,
                        patientId: selectedTestData.patientId,
                        specimenId: selectedTestData.specimenId,
                        resultValue: resultVal,
                        unit: resultUnit.value,
                        referenceRange: resultReferenceRange.value,
                        remarks: resultRemarks.value || resultGeneralNotes.value
                    }
                });

                alert(selectedTestData.isReturned ? 'Corrected result resubmitted successfully!' : 'Result submitted successfully!');
                clearForm();
                await loadAwaitingResults(); 

            } catch (error) {
                alert('Failed to save result: ' + error.message);
            } finally {
                submitResultButton.disabled = false;
                submitResultButton.textContent = 'Submit for Verification';
            }
        });
    }

    // 7. Clear Form
    function clearForm() {
        if (resultEntryForm) resultEntryForm.reset();
        selectedTestData = null;
        
        const warningBox = document.getElementById('correctionWarning');
        if (warningBox) warningBox.remove();

        resultValue.disabled = true;
        resultRemarks.disabled = true;
        resultGeneralNotes.disabled = true;
        submitResultButton.disabled = true;
        resultFormStatus.textContent = 'No Test Selected';
        resultFormStatus.className = 'badge badge-neutral';
    }

    if (clearResultFormButton) {
        clearResultFormButton.addEventListener('click', clearForm);
    }

    // 8. Filter & Refresh
    if (resultWorklistSearch) {
        resultWorklistSearch.addEventListener('input', renderTable);
    }
    if (refreshResultWorklistButton) {
        refreshResultWorklistButton.addEventListener('click', loadAwaitingResults);
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
            clearForm();
            await loadAwaitingResults();
        } catch (error) {
            if (error.status === 401) window.location.replace('login.html');
        }
    }
    init();

})();