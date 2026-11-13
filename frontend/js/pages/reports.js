document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // 1. ELEMENT REFERENCES
    // =========================================

    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const logoutButton = document.getElementById("logoutButton");

    const reportsNotice = document.querySelector(".reports-notice");
    const reportTypeFilter = document.getElementById("reportTypeFilter");
    const reportStartDate = document.getElementById("reportStartDate");
    const reportEndDate = document.getElementById("reportEndDate");
    const reportStatusFilter = document.getElementById("reportStatusFilter");

    const resetReportFiltersButton = document.getElementById("resetReportFiltersButton");
    const generateReportButton = document.getElementById("generateReportButton");
    const reportSearchInput = document.getElementById("reportSearchInput");
    const refreshReportsButton = document.getElementById("refreshReportsButton");

    const reportsTableBody = document.getElementById("reportsTableBody");
    const reportRecordCount = document.getElementById("reportRecordCount");

    // Chart Elements
    const popularTestsEmpty = document.getElementById("popularTestsEmpty");
    const requestTrendsEmpty = document.getElementById("requestTrendsEmpty");
    let popularTestsChartInstance = null;
    let requestTrendsChartInstance = null;

    // =========================================
    // 2. FETCH AND RENDER DATA
    // =========================================

    let allRequests = [];

    async function loadReportData() {
        reportsTableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">Loading report data...</td></tr>';
        
        // Hide the notice since we are now connected
        if (reportsNotice) reportsNotice.hidden = true;

        try {
            const response = await window.MediLinkAPI.request('/lab-requests?limit=100', { method: 'GET' });
            allRequests = response.data.requests || [];

            calculateMetrics();
            renderTable();
            renderCharts();

            if (generateReportButton) generateReportButton.disabled = false;

        } catch (error) {
            console.error('Failed to load report data:', error);
            reportsTableBody.innerHTML = `<tr><td colspan="7" class="empty-table-message" style="color:red;">Error: ${error.message}</td></tr>`;
        }
    }

    // =========================================
    // 3. CALCULATE METRICS
    // =========================================

    function calculateMetrics() {
        const total = allRequests.length;
        const completed = allRequests.filter(r => r.status === 'completed').length;
        const pending = allRequests.filter(r => ['submitted', 'accepted', 'in_progress', 'partially_completed'].includes(r.status)).length;

        document.getElementById('totalRequestsMetric').textContent = total;
        document.getElementById('completedRequestsMetric').textContent = completed;
        document.getElementById('pendingRequestsMetric').textContent = pending;

        const completedRequestsWithDates = allRequests.filter(r => r.status === 'completed' && r.completedAt && r.createdAt);
        if (completedRequestsWithDates.length > 0) {
            let totalHours = 0;
            completedRequestsWithDates.forEach(r => {
                const diffMs = new Date(r.completedAt) - new Date(r.createdAt);
                totalHours += diffMs / (1000 * 60 * 60);
            });
            const avgHours = (totalHours / completedRequestsWithDates.length).toFixed(1);
            document.getElementById('averageTurnaroundMetric').textContent = `${avgHours} hrs`;
        } else {
            document.getElementById('averageTurnaroundMetric').textContent = `N/A`;
        }
    }

    // =========================================
    // 4. RENDER CHARTS
    // =========================================

    function renderCharts() {
        // --- BAR CHART: Most Requested Tests ---
        const testCounts = {};
        allRequests.forEach(req => {
            req.tests.forEach(test => {
                const testName = test.testSnapshot.testName;
                testCounts[testName] = (testCounts[testName] || 0) + 1;
            });
        });

        const testLabels = Object.keys(testCounts);
        const testData = Object.values(testCounts);

        if (popularTestsEmpty) popularTestsEmpty.style.display = testLabels.length > 0 ? 'none' : 'flex';

        if (testLabels.length > 0) {
            const ctxBar = document.getElementById('popularTestsChart').getContext('2d');
            if (popularTestsChartInstance) popularTestsChartInstance.destroy();
            
            popularTestsChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: testLabels,
                    datasets: [{
                        label: 'Number of Requests',
                        data: testData,
                        backgroundColor: '#6b7589',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // --- LINE CHART: Request Trends ---
        const dateCounts = {};
        allRequests.forEach(req => {
            const dateStr = new Date(req.createdAt).toLocaleDateString();
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        });

        // Sort dates
        const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));
        const dateData = sortedDates.map(date => dateCounts[date]);

        if (requestTrendsEmpty) requestTrendsEmpty.style.display = sortedDates.length > 0 ? 'none' : 'flex';

        if (sortedDates.length > 0) {
            const ctxLine = document.getElementById('requestTrendsChart').getContext('2d');
            if (requestTrendsChartInstance) requestTrendsChartInstance.destroy();

            requestTrendsChartInstance = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Requests Created',
                        data: dateData,
                        borderColor: '#6b7589',
                        backgroundColor: 'rgba(107, 117, 137, 0.2)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
    }

    // =========================================
    // 5. RENDER TABLE
    // =========================================

    function renderTable() {
        const searchTerm = reportSearchInput?.value.toLowerCase() || '';
        
        const filtered = allRequests.filter(req => {
            const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : '';
            return req.requestNumber.toLowerCase().includes(searchTerm) || patientName.toLowerCase().includes(searchTerm);
        });

        reportsTableBody.innerHTML = '';

        if (filtered.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">No report records match your search.</td></tr>';
            if (reportRecordCount) reportRecordCount.textContent = `0 report records`;
            return;
        }

        filtered.forEach(req => {
            const tr = document.createElement('tr');
            const dateStr = new Date(req.createdAt).toLocaleDateString();
            const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown';
            const requestedBy = req.requestedBy ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}` : 'Unknown';
            const statusLabel = req.status.replace('_', ' ').toUpperCase();

            tr.innerHTML = `
                <td>${req.requestNumber}</td>
                <td>Lab Request</td>
                <td>${dateStr}</td>
                <td>${requestedBy}</td>
                <td>${patientName}</td>
                <td><span class="badge badge-${req.status === 'completed' ? 'success' : 'pending'}">${statusLabel}</span></td>
                <td><button class="btn btn-secondary btn-small" onclick="window.print()">Print</button></td>
            `;
            reportsTableBody.appendChild(tr);
        });

        if (reportRecordCount) reportRecordCount.textContent = `${filtered.length} report records`;
    }

    // =========================================
    // 6. EVENT LISTENERS
    // =========================================

    if (reportSearchInput) reportSearchInput.addEventListener("input", renderTable);
    if (refreshReportsButton) refreshReportsButton.addEventListener("click", loadReportData);
    if (generateReportButton) generateReportButton.addEventListener("click", () => window.print());

    if (resetReportFiltersButton) {
        resetReportFiltersButton.addEventListener("click", () => {
            if (reportTypeFilter) reportTypeFilter.value = "all";
            if (reportStartDate) reportStartDate.value = "";
            if (reportEndDate) reportEndDate.value = "";
            if (reportStatusFilter) reportStatusFilter.value = "all";
            if (reportSearchInput) reportSearchInput.value = "";
            renderTable();
        });
    }

    // Logout Logic
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            const confirmed = window.confirm('Are you sure you want to log out of MediLink?');
            if (!confirmed) return;
            logoutButton.disabled = true;
            logoutButton.textContent = 'Logging Out...';
            try {
                await window.MediLinkAuth.logout();
                window.location.replace('login.html');
            } catch (error) {
                console.error('Logout failed:', error);
                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }
        });
    }

    // Mobile Sidebar
    function openSidebar() { document.body.classList.add("sidebar-open"); }
    function closeSidebar() { document.body.classList.remove("sidebar-open"); }
    if (sidebarToggle) sidebarToggle.addEventListener("click", () => { document.body.classList.contains("sidebar-open") ? closeSidebar() : openSidebar(); });
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

    // =========================================
    // 7. INITIALIZATION
    // =========================================
    
    closeSidebar();
    loadReportData();

});