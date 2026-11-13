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

    const applyFiltersButton = document.getElementById("applyReportFiltersButton");
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
    let filteredRequests = [];

    async function loadReportData() {
        reportsTableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">Loading report data...</td></tr>';
        
        if (reportsNotice) {
            reportsNotice.hidden = true;
            reportsNotice.style.display = 'none'; 
        }

        try {
            const response = await window.MediLinkAPI.request('/lab-requests?limit=100', { method: 'GET' });
            allRequests = response.data.requests || [];
            filteredRequests = [...allRequests]; // Start with all requests

            // ENABLE THE FILTER BUTTONS
            if (applyFiltersButton) applyFiltersButton.disabled = false;
            if (generateReportButton) generateReportButton.disabled = false;

            updateDashboard();

        } catch (error) {
            console.error('Failed to load report data:', error);
            reportsTableBody.innerHTML = `<tr><td colspan="7" class="empty-table-message" style="color:red;">Error: ${error.message}</td></tr>`;
        }
    }

    // =========================================
    // 3. UPDATE DASHBOARD (Metrics, Table, Charts)
    // =========================================

    function updateDashboard() {
        calculateMetrics();
        renderTable();
        renderCharts();
    }

    // =========================================
    // 4. CALCULATE METRICS
    // =========================================

    function calculateMetrics() {
        const total = filteredRequests.length;
        const completed = filteredRequests.filter(r => r.status === 'completed').length;
        const pending = filteredRequests.filter(r => ['submitted', 'accepted', 'in_progress', 'partially_completed'].includes(r.status)).length;

        document.getElementById('totalRequestsMetric').textContent = total;
        document.getElementById('completedRequestsMetric').textContent = completed;
        document.getElementById('pendingRequestsMetric').textContent = pending;

        // Calculate Average Turnaround Time
        const completedWithDates = filteredRequests.filter(r => r.status === 'completed' && r.completedAt && r.createdAt);
        
        if (completedWithDates.length > 0) {
            let totalMinutes = 0;
            completedWithDates.forEach(r => {
                const diffMs = new Date(r.completedAt) - new Date(r.createdAt);
                totalMinutes += diffMs / (1000 * 60); // Convert to minutes
            });
            const avgMinutes = (totalMinutes / completedWithDates.length);
            
            // If it took less than 1 hour, show minutes. Otherwise, show hours.
            if (avgMinutes < 60) {
                document.getElementById('averageTurnaroundMetric').textContent = `${avgMinutes.toFixed(1)} mins`;
            } else {
                document.getElementById('averageTurnaroundMetric').textContent = `${(avgMinutes / 60).toFixed(1)} hrs`;
            }
        } else {
            document.getElementById('averageTurnaroundMetric').textContent = `N/A`;
        }
    }

    // =========================================
    // 5. RENDER CHARTS
    // =========================================

    function renderCharts() {
        const barColors = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9'];

        // --- BAR CHART: Most Requested Tests ---
        const testCounts = {};
        filteredRequests.forEach(req => {
            if (req.tests && Array.isArray(req.tests)) {
                req.tests.forEach(test => {
                    const testName = test.testSnapshot?.testName || test.testName || 'Unknown Test';
                    testCounts[testName] = (testCounts[testName] || 0) + 1;
                });
            }
        });

        const testLabels = Object.keys(testCounts);
        const testData = Object.values(testCounts);
        const barChartContainer = document.getElementById('popularTestsChart').closest('.chart-container');

        if (testLabels.length > 0) {
            if (barChartContainer) barChartContainer.classList.add('has-data');
            const ctxBar = document.getElementById('popularTestsChart').getContext('2d');
            if (popularTestsChartInstance) popularTestsChartInstance.destroy();
            
            popularTestsChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: testLabels,
                    datasets: [{
                        label: 'Number of Requests',
                        data: testData,
                        backgroundColor: barColors,
                        borderColor: barColors,
                        borderWidth: 1,
                        borderRadius: 6,
                        maxBarThickness: 60
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                    }
                }
            });
        } else {
            if (barChartContainer) barChartContainer.classList.remove('has-data');
        }

        // --- LINE CHART: Request Trends ---
        const dateCounts = {};
        filteredRequests.forEach(req => {
            const dateObj = req.createdAt ? new Date(req.createdAt) : new Date();
            const dateStr = dateObj.toLocaleDateString();
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
        });

        const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));
        const dateData = sortedDates.map(date => dateCounts[date]);
        const lineChartContainer = document.getElementById('requestTrendsChart').closest('.chart-container');

        if (sortedDates.length > 0) {
            if (lineChartContainer) lineChartContainer.classList.add('has-data');
            const ctxLine = document.getElementById('requestTrendsChart').getContext('2d');
            if (requestTrendsChartInstance) requestTrendsChartInstance.destroy();

            const gradientFill = ctxLine.createLinearGradient(0, 0, 0, 400);
            gradientFill.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
            gradientFill.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

            requestTrendsChartInstance = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Requests Created',
                        data: dateData,
                        borderColor: '#6366f1',
                        backgroundColor: gradientFill,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                    }
                }
            });
        } else {
            if (lineChartContainer) lineChartContainer.classList.remove('has-data');
        }
    }

    // =========================================
    // 6. RENDER TABLE
    // =========================================

    function renderTable() {
        const searchTerm = reportSearchInput?.value.toLowerCase() || '';
        
        const tableData = filteredRequests.filter(req => {
            const patientName = req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : '';
            return req.requestNumber.toLowerCase().includes(searchTerm) || patientName.toLowerCase().includes(searchTerm);
        });

        reportsTableBody.innerHTML = '';

        if (tableData.length === 0) {
            reportsTableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">No report records match your filters.</td></tr>';
            if (reportRecordCount) reportRecordCount.textContent = `0 report records`;
            return;
        }

        tableData.forEach(req => {
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
                <td><button class="btn btn-secondary btn-small print-btn">Print</button></td>
            `;
            reportsTableBody.appendChild(tr);

            const printBtn = tr.querySelector('.print-btn');
            if (printBtn) printBtn.addEventListener('click', () => window.print());
        });

        if (reportRecordCount) reportRecordCount.textContent = `${tableData.length} report records`;
    }

    // =========================================
    // 7. FILTERING LOGIC
    // =========================================
    function applyFilters() {
        const startDate = reportStartDate.value;
        const endDate = reportEndDate.value;
        const status = reportStatusFilter.value;
        const type = reportTypeFilter.value; // <-- GET REPORT TYPE

        if (startDate && endDate && startDate > endDate) {
            alert('Start Date cannot be later than End Date.');
            return;
        }

        filteredRequests = allRequests.filter(req => {
            // 1. Date Filter
            const reqDate = new Date(req.createdAt).toISOString().split('T')[0];
            const matchesStart = !startDate || reqDate >= startDate;
            const matchesEnd = !endDate || reqDate <= endDate;

            // 2. Status Filter
            const matchesStatus = status === 'all' || req.status === status;

            // 3. Report Type Filter
            let matchesType = true;
            if (type === 'requests') {
                matchesType = true; // Show all requests
            } else if (type === 'tests') {
                matchesType = req.tests && req.tests.length > 0; // Only show requests with tests
            } else if (type === 'turnaround') {
                matchesType = req.status === 'completed'; // Only show completed requests
            } else if (type === 'specimens') {
                // Show requests that are submitted or beyond (since specimens are collected after submission)
                matchesType = ['submitted', 'accepted', 'in_progress', 'partially_completed', 'completed'].includes(req.status);
            }

            return matchesStart && matchesEnd && matchesStatus && matchesType;
        });

        updateDashboard();
    }

    // =========================================
    // 8. EVENT LISTENERS
    // =========================================

    if (applyFiltersButton) applyFiltersButton.addEventListener("click", applyFilters);
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
            
            filteredRequests = [...allRequests]; // Reset data
            updateDashboard();
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
    // 9. INITIALIZATION
    // =========================================
    
    closeSidebar();
    loadReportData();

});