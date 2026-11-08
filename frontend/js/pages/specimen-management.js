// ==========================================
// MEDILINK LABORATORY
// SPECIMEN MANAGEMENT JAVASCRIPT (API VERSION)
// ==========================================

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

    const registerSpecimenButton = document.getElementById('registerSpecimenButton');
    const specimenSearch = document.getElementById('specimenSearch');
    const specimenStatusFilter = document.getElementById('specimenStatusFilter');
    const resetSpecimenFiltersButton = document.getElementById('resetSpecimenFiltersButton');
    const tableBody = document.getElementById('specimenTableBody');
    const recordCount = document.getElementById('specimenRecordCount');

    // Modal Elements
    const specimenModal = document.getElementById('specimenModal');
    const closeSpecimenModalBtn = document.getElementById('closeSpecimenModalBtn');
    const cancelSpecimenModalBtn = document.getElementById('cancelSpecimenModalBtn');
    const modalRequestSelect = document.getElementById('modalRequestSelect');
    const modalSpecimenType = document.getElementById('modalSpecimenType');
    const modalSpecimenNotes = document.getElementById('modalSpecimenNotes');
    const submitSpecimenBtn = document.getElementById('submitSpecimenBtn');

    let allSpecimens = []; // Store for client-side filtering

    // 2. Fetch User Info
    function displayUserInformation(user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        userNameElement.textContent = fullName;
        userAvatarElement.textContent = fullName.charAt(0).toUpperCase();
        
        const roleNames = {
            lab_admin: 'Laboratory Administrator',
            lab_receptionist: 'Laboratory Receptionist',
            lab_technologist: 'Laboratory Technologist',
            result_verifier: 'Result Verifier',
            requesting_clinician: 'Requesting Clinician'
        };
        userRoleElement.textContent = roleNames[user.role] || 'Laboratory Personnel';
    }

    // 3. Load Specimens from API
    async function loadSpecimens() {
        try {
            const response = await window.MediLinkAPI.request('/specimens', { method: 'GET' });
            allSpecimens = response.data.specimens || [];
            renderSpecimens();
            updateSummaryCounts();
        } catch (error) {
            console.error('Failed to load specimens:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
        }
    }

    // 4. Render Specimens Table
    function renderSpecimens() {
        tableBody.replaceChildren();
        
        const searchTerm = specimenSearch.value.toLowerCase();
        const statusFilter = specimenStatusFilter.value.toLowerCase();

        const filtered = allSpecimens.filter(spc => {
            const requestNo = spc.requestId?.requestNumber || '';
            const patientName = spc.requestId?.patient ? `${spc.requestId.patient.firstName} ${spc.requestId.patient.lastName}` : '';
            
            const matchesSearch = spc.specimenCode.toLowerCase().includes(searchTerm) || 
                                  requestNo.toLowerCase().includes(searchTerm) || 
                                  patientName.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || spc.status.toLowerCase().includes(statusFilter);
            
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">◉</div>
                            <h3 class="empty-state-title">No matching specimen records</h3>
                            <p class="empty-state-description">Try changing your search or filter selections.</p>
                        </div>
                    </td>
                </tr>`;
            recordCount.textContent = 'No matching specimen records.';
            return;
        }

        filtered.forEach(spc => {
            const row = document.createElement('tr');
            
            // Safely handle populated request and patient
            const requestNo = spc.requestId ? spc.requestId.requestNumber : 'N/A';
            const patientName = spc.requestId && spc.requestId.patient 
                ? `${spc.requestId.patient.firstName} ${spc.requestId.patient.lastName}` 
                : 'Unknown Patient';
            
            const dateCollected = spc.collectedAt ? new Date(spc.collectedAt).toLocaleDateString() : 'N/A';

            row.innerHTML = `
                <td>${spc.specimenCode}</td>
                <td>${requestNo}</td>
                <td>${patientName}</td>
                <td>${spc.specimenType}</td>
                <td>${dateCollected}</td>
                <td><span class="badge badge-${spc.status === 'collected' ? 'info' : 'success'}">${spc.status.toUpperCase()}</span></td>
                <td><button class="btn btn-secondary btn-small">View</button></td>
            `;
            tableBody.appendChild(row);
        });

        recordCount.textContent = `Showing ${filtered.length} of ${allSpecimens.length} specimen records.`;
    }

    // 5. Update Summary Cards
    function updateSummaryCounts() {
        document.getElementById('totalSpecimensCount').textContent = allSpecimens.length;
        document.getElementById('pendingCollectionCount').textContent = allSpecimens.filter(s => s.status === 'pending').length;
        document.getElementById('receivedSpecimensCount').textContent = allSpecimens.filter(s => s.status === 'received').length;
        document.getElementById('acceptedSpecimensCount').textContent = allSpecimens.filter(s => s.status === 'accepted' || s.status === 'collected').length;
        document.getElementById('rejectedSpecimensCount').textContent = allSpecimens.filter(s => s.status === 'rejected').length;
    }

    // 6. Modal Logic - Fetch Pending Requests
    async function openModal() {
        specimenModal.hidden = false;
        modalRequestSelect.innerHTML = '<option value="">Loading requests...</option>';
        
        try {
            // Fetch requests that are submitted or accepted
            const response = await window.MediLinkAPI.request('/lab-requests?status=submitted&limit=100', { method: 'GET' });
            const requests = response.data.requests || [];

            if (requests.length === 0) {
                modalRequestSelect.innerHTML = '<option value="">No submitted requests found</option>';
                return;
            }

            modalRequestSelect.innerHTML = '<option value="">-- Select Request --</option>';
            requests.forEach(req => {
                const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown';
                const option = document.createElement('option');
                option.value = req._id;
                option.textContent = `${req.requestNumber} - ${patientName}`;
                modalRequestSelect.appendChild(option);
            });
        } catch (error) {
            modalRequestSelect.innerHTML = '<option value="">Error loading requests</option>';
        }
    }

    // 7. Submit New Specimen
    async function submitSpecimen() {
        const requestId = modalRequestSelect.value;
        const specimenType = modalSpecimenType.value;
        const notes = modalSpecimenNotes.value;

        if (!requestId) {
            alert('Please select a laboratory request.');
            return;
        }

        submitSpecimenBtn.disabled = true;
        submitSpecimenBtn.textContent = 'Saving...';

        try {
            await window.MediLinkAPI.request('/specimens', {
                method: 'POST',
                body: {
                    requestId,
                    specimenType,
                    notes
                }
            });
            
            alert('Specimen registered successfully!');
            specimenModal.hidden = true;
            modalRequestSelect.value = '';
            modalSpecimenNotes.value = '';
            
            // Force a fresh reload of the table
            await loadSpecimens(); 

        } catch (error) {
            alert('Failed to save specimen: ' + error.message);
        } finally {
            submitSpecimenBtn.disabled = false;
            submitSpecimenBtn.textContent = 'Save Specimen';
        }
    }

    // 8. Event Listeners
    if (registerSpecimenButton) registerSpecimenButton.addEventListener('click', openModal);
    if (closeSpecimenModalBtn) closeSpecimenModalBtn.addEventListener('click', () => specimenModal.hidden = true);
    if (cancelSpecimenModalBtn) cancelSpecimenModalBtn.addEventListener('click', () => specimenModal.hidden = true);
    if (submitSpecimenBtn) submitSpecimenBtn.addEventListener('click', submitSpecimen);

    if (specimenSearch) specimenSearch.addEventListener('input', renderSpecimens);
    if (specimenStatusFilter) specimenStatusFilter.addEventListener('change', renderSpecimens);
    
    if (resetSpecimenFiltersButton) {
        resetSpecimenFiltersButton.addEventListener('click', () => {
            specimenSearch.value = '';
            specimenStatusFilter.value = '';
            renderSpecimens();
        });
    }

    // Sidebar & Logout (Standard logic)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            appLayout.classList.toggle('sidebar-open');
        });
    }
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
            await loadSpecimens();
        } catch (error) {
            if (error.status === 401) window.location.replace('login.html');
        }
    }
    init();

})();