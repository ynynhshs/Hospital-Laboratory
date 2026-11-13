document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // 1. ELEMENT REFERENCES
    // =========================================

    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const noticeTitle = document.querySelector(".audit-notice strong");
    const noticeMessage = document.querySelector(".audit-notice p");

    const auditSearchInput = document.getElementById("auditSearchInput");
    const auditUserFilter = document.getElementById("auditUserFilter");
    const auditModuleFilter = document.getElementById("auditModuleFilter");
    const auditActionFilter = document.getElementById("auditActionFilter");
    const auditOutcomeFilter = document.getElementById("auditOutcomeFilter");

    const auditStartDate = document.getElementById("auditStartDate");
    const auditEndDate = document.getElementById("auditEndDate");

    const applyFiltersButton = document.getElementById("applyAuditFiltersButton");
    const resetFiltersButton = document.getElementById("resetAuditFiltersButton");
    const refreshButton = document.getElementById("refreshAuditLogsButton");
    const exportButton = document.getElementById("exportAuditLogsButton");

    const tableBody = document.getElementById("auditLogsTableBody");
    const recordCount = document.getElementById("auditRecordCount");

    const paginationInfo = document.getElementById("auditPaginationInfo");
    const currentPageLabel = document.getElementById("auditCurrentPage");
    const previousPageButton = document.getElementById("auditPreviousPageButton");
    const nextPageButton = document.getElementById("auditNextPageButton");

    const clearSelectionButton = document.getElementById("clearAuditSelectionButton");
    const detailsPanel = document.getElementById("auditDetailsPanel");
    const closeDetailsButton = document.getElementById("closeAuditDetailsButton");

    // =========================================
    // 2. PAGE STATE
    // =========================================

    const PAGE_SIZE = 10;

    let currentPage = 1;
    let filteredRows = [];
    let selectedRow = null;
    let allLogs = [];

    // =========================================
    // 3. FETCH DATA FROM BACKEND
    // =========================================

    async function fetchAuditLogs() {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-table-message">Loading audit records...</td></tr>';
        
        try {
            const response = await window.MediLinkAPI.request('/audit-logs', { method: 'GET' });
            allLogs = response.data.logs || [];
            
            renderLogsToTable();
            updateSummaryMetrics();
            applyAuditFilters(); // Trigger the filter logic
            
            // Hide the notice since we are now loading real data
            document.querySelector('.audit-notice').hidden = true;

        } catch (error) {
            console.error('Failed to load audit logs:', error);
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-table-message" style="color:red;">Error: ${error.message}</td></tr>`;
        }
    }

    // =========================================
    // 4. RENDER LOGS TO TABLE
    // =========================================

    function renderLogsToTable() {
        tableBody.innerHTML = '';
        
        if (allLogs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="empty-table-message">No audit records available.</td></tr>';
            return;
        }

        allLogs.forEach(log => {
            const row = document.createElement('tr');
            
            // Format date
            const dateObj = new Date(log.createdAt);
            const dateStr = dateObj.toLocaleString('en-PH', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });

            // Determine outcome based on action (for filtering)
            const outcome = log.action.includes('FAILED') || log.action.includes('ERROR') ? 'Failed' : 'Success';

            // Set dataset attributes so your existing filters work!
            row.dataset.auditDate = log.createdAt;
            row.dataset.auditUser = log.username;
            row.dataset.auditAction = log.action;
            row.dataset.auditModule = log.module;
            row.dataset.auditReference = log.details || '—';
            row.dataset.auditIpAddress = log.ip || '—';
            row.dataset.auditOutcome = outcome;
            row.dataset.auditDescription = log.details || 'No description provided.';
            row.dataset.auditId = log._id;

            row.innerHTML = `
                <td>${dateStr}</td>
                <td>${log.username} <br><small>(${log.role || 'User'})</small></td>
                <td><span class="badge badge-${outcome === 'Failed' ? 'danger' : 'info'}">${log.action}</span></td>
                <td>${log.module}</td>
                <td>${log.details || '—'}</td>
                <td>${log.ip || '—'}</td>
                <td>${outcome}</td>
                <td><button class="btn btn-secondary btn-small audit-view-button" data-action="view-audit">View</button></td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // =========================================
    // 5. UPDATE SUMMARY METRICS
    // =========================================

    function updateSummaryMetrics() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const total = allLogs.length;
        const todayCount = allLogs.filter(l => l.createdAt.startsWith(todayStr)).length;
        const authCount = allLogs.filter(l => l.module.toLowerCase() === 'authentication' || l.action.includes('LOGIN')).length;
        const failedCount = allLogs.filter(l => l.action.includes('FAILED') || l.action.includes('ERROR')).length;

        document.getElementById('totalAuditEventsMetric').textContent = total;
        document.getElementById('todayAuditEventsMetric').textContent = todayCount;
        document.getElementById('authenticationEventsMetric').textContent = authCount;
        document.getElementById('failedAuditEventsMetric').textContent = failedCount;
    }

    // =========================================
    // 6. (YOUR EXISTING CODE CONTINUES HERE)
    // =========================================
    // Note: I am including the rest of your original functions below.
    // They will handle the filtering, pagination, and details modal exactly as you wrote them.

    function getAuditRows() {
        if (!tableBody) return [];
        return Array.from(tableBody.querySelectorAll("tr")).filter((row) => {
            return !row.querySelector(".empty-table-message") && row.dataset.searchEmptyRow !== "true" && row.dataset.auditEmptyRow !== "true";
        });
    }

    function getCellText(row, index) {
        const cell = row.cells[index];
        return cell ? cell.textContent.trim() : "";
    }

    function getRowValue(row, dataKey, cellIndex) {
        return (row.dataset[dataKey] || getCellText(row, cellIndex)).trim();
    }

    function normalize(value) {
        return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    }

    function updateUserFilterOptions() {
        if (!auditUserFilter) return;
        const selectedValue = auditUserFilter.value;
        const rows = getAuditRows();
        const users = [...new Set(rows.map((row) => getRowValue(row, "auditUser", 1).split('\n')[0].trim()).filter(Boolean))].sort();
        
        auditUserFilter.replaceChildren();
        const allUsersOption = document.createElement("option");
        allUsersOption.value = "all";
        allUsersOption.textContent = "All Users";
        auditUserFilter.appendChild(allUsersOption);

        users.forEach((user) => {
            const option = document.createElement("option");
            option.value = user;
            option.textContent = user;
            auditUserFilter.appendChild(option);
        });

        if ([...auditUserFilter.options].some((option) => option.value === selectedValue)) {
            auditUserFilter.value = selectedValue;
        }
    }

    function removeDynamicEmptyMessage() {
        const dynamicMessage = tableBody?.querySelector('[data-search-empty-row="true"]');
        if (dynamicMessage) dynamicMessage.remove();
    }

    function removeStaticEmptyMessage() {
        if (!tableBody) return;
        const emptyRows = Array.from(tableBody.querySelectorAll("tr")).filter((row) => row.querySelector(".empty-table-message"));
        emptyRows.forEach((row) => row.remove());
    }

    function showEmptyMessage(message) {
        if (!tableBody) return;
        removeDynamicEmptyMessage();
        const row = document.createElement("tr");
        row.dataset.searchEmptyRow = "true";
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.className = "empty-table-message";
        cell.textContent = message;
        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    function validateDateRange() {
        if (!auditStartDate || !auditEndDate) return true;
        const startDate = auditStartDate.value;
        const endDate = auditEndDate.value;
        const isInvalid = Boolean(startDate && endDate && startDate > endDate);
        auditStartDate.setAttribute("aria-invalid", String(isInvalid));
        auditEndDate.setAttribute("aria-invalid", String(isInvalid));
        return !isInvalid;
    }

    function getRecordDate(row) {
        const value = getRowValue(row, "auditDate", 0);
        if (!value) return "";
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) return "";
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const day = String(parsedDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function matchesAuditFilters(row) {
        const searchTerm = auditSearchInput?.value.trim().toLowerCase() || "";
        const userValue = auditUserFilter?.value || "all";
        const moduleValue = auditModuleFilter?.value || "all";
        const actionValue = auditActionFilter?.value || "all";
        const outcomeValue = auditOutcomeFilter?.value || "all";

        const searchMatches = !searchTerm || row.textContent.toLowerCase().includes(searchTerm);
        const rowUser = getRowValue(row, "auditUser", 1).split('\n')[0].trim();
        const rowModule = normalize(getRowValue(row, "auditModule", 3));
        const rowAction = normalize(getRowValue(row, "auditAction", 2));
        const rowOutcome = normalize(getRowValue(row, "auditOutcome", 6));

        const userMatches = userValue === "all" || rowUser === userValue;
        const moduleMatches = moduleValue === "all" || rowModule === normalize(moduleValue);
        const actionMatches = actionValue === "all" || rowAction === normalize(actionValue);
        const outcomeMatches = outcomeValue === "all" || rowOutcome === normalize(outcomeValue);

        const recordDate = getRecordDate(row);
        const startDate = auditStartDate?.value || "";
        const endDate = auditEndDate?.value || "";
        const startDateMatches = !startDate || (recordDate && recordDate >= startDate);
        const endDateMatches = !endDate || (recordDate && recordDate <= endDate);

        return searchMatches && userMatches && moduleMatches && actionMatches && outcomeMatches && startDateMatches && endDateMatches;
    }

    function updatePagination(totalRecords, totalPages) {
        if (currentPageLabel) {
            currentPageLabel.textContent = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : "Page 0 of 0";
        }
        if (paginationInfo) {
            if (totalRecords === 0) {
                paginationInfo.textContent = "No records to display";
            } else {
                const firstRecord = (currentPage - 1) * PAGE_SIZE + 1;
                const lastRecord = Math.min(currentPage * PAGE_SIZE, totalRecords);
                paginationInfo.textContent = `Showing ${firstRecord}-${lastRecord} of ${totalRecords} records`;
            }
        }
        if (previousPageButton) previousPageButton.disabled = totalRecords === 0 || currentPage <= 1;
        if (nextPageButton) nextPageButton.disabled = totalRecords === 0 || currentPage >= totalPages;
    }

    function updateRecordCount(totalRecords, matchingRecords) {
        if (!recordCount) return;
        if (totalRecords === matchingRecords) {
            recordCount.textContent = `${totalRecords} audit records`;
        } else {
            recordCount.textContent = `${matchingRecords} of ${totalRecords} audit records`;
        }
    }

    function renderAuditTable() {
        if (!tableBody) return;
        const allRows = getAuditRows();
        allRows.forEach((row) => { row.hidden = true; });
        
        removeDynamicEmptyMessage();
        updateUserFilterOptions();
        filteredRows = allRows.filter(matchesAuditFilters);

        if (selectedRow && !filteredRows.includes(selectedRow)) clearAuditSelection();

        if (allRows.length === 0) {
            removeDynamicEmptyMessage();
            if (!tableBody.querySelector(".empty-table-message")) showEmptyMessage("No audit records available.");
            updateRecordCount(0, 0);
            updatePagination(0, 0);
            return;
        }

        removeStaticEmptyMessage();

        if (filteredRows.length === 0) {
            showEmptyMessage("No audit records match the selected filters.");
            updateRecordCount(allRows.length, 0);
            updatePagination(0, 0);
            return;
        }

        const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
        currentPage = Math.max(1, Math.min(currentPage, totalPages));
        
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;

        filteredRows.slice(startIndex, endIndex).forEach((row) => { row.hidden = false; });
        
        updateRecordCount(allRows.length, filteredRows.length);
        updatePagination(filteredRows.length, totalPages);
    }

    function applyAuditFilters() {
        if (!validateDateRange()) {
            if (noticeTitle) noticeTitle.textContent = "Invalid date range";
            if (noticeMessage) noticeMessage.textContent = "The start date cannot be later than the end date.";
            return;
        }
        currentPage = 1;
        renderAuditTable();
    }

    // =========================================
    // 7. VIEW AUDIT RECORD DETAILS
    // =========================================

    function setDetailValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value || "—";
    }

    function showAuditDetails(row) {
        if (!row || !detailsPanel) return;
        clearAuditSelection();
        selectedRow = row;
        row.classList.add("selected-row");

        setDetailValue("detailAuditId", getRowValue(row, "auditId", 0));
        setDetailValue("detailAuditDate", getRowValue(row, "auditDate", 0));
        setDetailValue("detailAuditUser", getRowValue(row, "auditUser", 1));
        setDetailValue("detailAuditAction", getRowValue(row, "auditAction", 2));
        setDetailValue("detailAuditModule", getRowValue(row, "auditModule", 3));
        setDetailValue("detailAuditReference", getRowValue(row, "auditReference", 4));
        setDetailValue("detailAuditIpAddress", getRowValue(row, "auditIpAddress", 5));
        setDetailValue("detailAuditOutcome", getRowValue(row, "auditOutcome", 6));

        const description = document.getElementById("detailAuditDescription");
        if (description) description.textContent = row.dataset.auditDescription || "No additional description.";

        detailsPanel.hidden = false;
        if (clearSelectionButton) clearSelectionButton.disabled = false;
        detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function clearAuditSelection() {
        if (selectedRow) {
            selectedRow.classList.remove("selected-row");
            selectedRow = null;
        }
        if (detailsPanel) detailsPanel.hidden = true;
        if (clearSelectionButton) clearSelectionButton.disabled = true;
    }

    if (tableBody) {
        tableBody.addEventListener("click", (event) => {
            const viewButton = event.target.closest('[data-action="view-audit"], .audit-view-button');
            if (!viewButton) return;
            const row = viewButton.closest("tr");
            if (row) showAuditDetails(row);
        });
    }

    // =========================================
    // 8. EVENT LISTENERS
    // =========================================

    [auditSearchInput, auditUserFilter, auditModuleFilter, auditActionFilter, auditOutcomeFilter].forEach((element) => {
        if (!element) return;
        element.addEventListener(element === auditSearchInput ? "input" : "change", () => {
            currentPage = 1;
            renderAuditTable();
        });
    });

    if (auditStartDate) auditStartDate.addEventListener("change", () => { validateDateRange(); renderAuditTable(); });
    if (auditEndDate) auditEndDate.addEventListener("change", () => { validateDateRange(); renderAuditTable(); });
    if (applyFiltersButton) applyFiltersButton.addEventListener("click", applyAuditFilters);
    
    if (resetFiltersButton) {
        resetFiltersButton.addEventListener("click", () => {
            if (auditSearchInput) auditSearchInput.value = "";
            if (auditUserFilter) auditUserFilter.value = "all";
            if (auditModuleFilter) auditModuleFilter.value = "all";
            if (auditActionFilter) auditActionFilter.value = "all";
            if (auditOutcomeFilter) auditOutcomeFilter.value = "all";
            if (auditStartDate) { auditStartDate.value = ""; auditStartDate.removeAttribute("aria-invalid"); }
            if (auditEndDate) { auditEndDate.value = ""; auditEndDate.removeAttribute("aria-invalid"); }
            currentPage = 1;
            clearAuditSelection();
            renderAuditTable();
        });
    }

    if (previousPageButton) previousPageButton.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderAuditTable(); } });
    if (nextPageButton) nextPageButton.addEventListener("click", () => { const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE); if (currentPage < totalPages) { currentPage++; renderAuditTable(); } });
    if (clearSelectionButton) clearSelectionButton.addEventListener("click", clearAuditSelection);
    if (closeDetailsButton) closeDetailsButton.addEventListener("click", clearAuditSelection);

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            fetchAuditLogs();
        });
    }

    // =========================================
    // 9. INITIALIZATION
    // =========================================

    // Mobile Sidebar
    function openSidebar() {
        document.body.classList.add("sidebar-open");
        if (sidebarToggle) { sidebarToggle.setAttribute("aria-expanded", "true"); sidebarToggle.setAttribute("aria-label", "Close navigation menu"); }
    }
    function closeSidebar() {
        document.body.classList.remove("sidebar-open");
        if (sidebarToggle) { sidebarToggle.setAttribute("aria-expanded", "false"); sidebarToggle.setAttribute("aria-label", "Open navigation menu"); }
    }
    if (sidebarToggle) sidebarToggle.addEventListener("click", () => { document.body.classList.contains("sidebar-open") ? closeSidebar() : openSidebar(); });
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSidebar(); });

        // =========================================
    // LOGOUT LOGIC
    // =========================================
    const logoutButton = document.getElementById("logoutButton");
    
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
                window.alert(error.message || 'Unable to log out.');
                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }
        });
    }

    closeSidebar();
    clearAuditSelection();
    
    // START FETCHING DATA
    fetchAuditLogs();

});