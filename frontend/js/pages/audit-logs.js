
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

    const applyFiltersButton = document.getElementById(
        "applyAuditFiltersButton"
    );

    const resetFiltersButton = document.getElementById(
        "resetAuditFiltersButton"
    );

    const refreshButton = document.getElementById(
        "refreshAuditLogsButton"
    );

    const exportButton = document.getElementById(
        "exportAuditLogsButton"
    );

    const tableBody = document.getElementById("auditLogsTableBody");
    const recordCount = document.getElementById("auditRecordCount");

    const paginationInfo = document.getElementById("auditPaginationInfo");
    const currentPageLabel = document.getElementById("auditCurrentPage");

    const previousPageButton = document.getElementById(
        "auditPreviousPageButton"
    );

    const nextPageButton = document.getElementById(
        "auditNextPageButton"
    );

    const clearSelectionButton = document.getElementById(
        "clearAuditSelectionButton"
    );

    const detailsPanel = document.getElementById("auditDetailsPanel");
    const closeDetailsButton = document.getElementById(
        "closeAuditDetailsButton"
    );

    // =========================================
    // 2. PAGE STATE
    // =========================================

    const PAGE_SIZE = 10;

    let currentPage = 1;
    let filteredRows = [];
    let selectedRow = null;

    // =========================================
    // 3. NOTICE MESSAGE
    // =========================================

    function updateNotice(title, message) {
        if (noticeTitle) {
            noticeTitle.textContent = title;
        }

        if (noticeMessage) {
            noticeMessage.textContent = message;
        }
    }

    // =========================================
    // 4. MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        document.body.classList.add("sidebar-open");

        if (sidebarToggle) {
            sidebarToggle.setAttribute("aria-expanded", "true");
            sidebarToggle.setAttribute(
                "aria-label",
                "Close navigation menu"
            );
        }
    }

    function closeSidebar() {
        document.body.classList.remove("sidebar-open");

        if (sidebarToggle) {
            sidebarToggle.setAttribute("aria-expanded", "false");
            sidebarToggle.setAttribute(
                "aria-label",
                "Open navigation menu"
            );
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            const isOpen = document.body.classList.contains(
                "sidebar-open"
            );

            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    // =========================================
    // 5. AUDIT TABLE HELPERS
    // =========================================

    function getAuditRows() {
        if (!tableBody) {
            return [];
        }

        return Array.from(
            tableBody.querySelectorAll("tr")
        ).filter((row) => {
            return (
                !row.querySelector(".empty-table-message") &&
                row.dataset.searchEmptyRow !== "true" &&
                row.dataset.auditEmptyRow !== "true"
            );
        });
    }

    function getCellText(row, index) {
        const cell = row.cells[index];

        return cell ? cell.textContent.trim() : "";
    }

    function getRowValue(row, dataKey, cellIndex) {
        return (
            row.dataset[dataKey] ||
            getCellText(row, cellIndex)
        ).trim();
    }

    function normalize(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");
    }

    // =========================================
    // 6. DYNAMIC USER FILTER OPTIONS
    // =========================================

    function updateUserFilterOptions() {
        if (!auditUserFilter) {
            return;
        }

        const selectedValue = auditUserFilter.value;
        const rows = getAuditRows();

        const users = [
            ...new Set(
                rows
                    .map((row) =>
                        getRowValue(row, "auditUser", 1)
                    )
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b));

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

        if (
            [...auditUserFilter.options].some(
                (option) => option.value === selectedValue
            )
        ) {
            auditUserFilter.value = selectedValue;
        }
    }

    // =========================================
    // 7. EMPTY TABLE MESSAGE
    // =========================================

    function removeDynamicEmptyMessage() {
        const dynamicMessage = tableBody?.querySelector(
            '[data-search-empty-row="true"]'
        );

        if (dynamicMessage) {
            dynamicMessage.remove();
        }
    }

    function removeStaticEmptyMessage() {
        if (!tableBody) {
            return;
        }

        const emptyRows = Array.from(
            tableBody.querySelectorAll("tr")
        ).filter((row) => {
            return row.querySelector(".empty-table-message");
        });

        emptyRows.forEach((row) => row.remove());
    }

    function showEmptyMessage(message) {
        if (!tableBody) {
            return;
        }

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

    // =========================================
    // 8. DATE RANGE VALIDATION
    // =========================================

    function validateDateRange() {
        if (!auditStartDate || !auditEndDate) {
            return true;
        }

        const startDate = auditStartDate.value;
        const endDate = auditEndDate.value;

        const isInvalid = Boolean(
            startDate &&
            endDate &&
            startDate > endDate
        );

        auditStartDate.setAttribute(
            "aria-invalid",
            String(isInvalid)
        );

        auditEndDate.setAttribute(
            "aria-invalid",
            String(isInvalid)
        );

        return !isInvalid;
    }

    function getRecordDate(row) {
        const value = getRowValue(row, "auditDate", 0);

        if (!value) {
            return "";
        }

        // ISO dates can be compared directly with date inputs.
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.slice(0, 10);
        }

        const parsedDate = new Date(value);

        if (Number.isNaN(parsedDate.getTime())) {
            return "";
        }

        const year = parsedDate.getFullYear();
        const month = String(
            parsedDate.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            parsedDate.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // =========================================
    // 9. AUDIT FILTERING
    // =========================================

    function matchesAuditFilters(row) {
        const searchTerm = auditSearchInput?.value
            .trim()
            .toLowerCase() || "";

        const userValue = auditUserFilter?.value || "all";
        const moduleValue = auditModuleFilter?.value || "all";
        const actionValue = auditActionFilter?.value || "all";
        const outcomeValue = auditOutcomeFilter?.value || "all";

        const searchMatches =
            !searchTerm ||
            row.textContent.toLowerCase().includes(searchTerm);

        const rowUser = getRowValue(row, "auditUser", 1);

        const rowModule = normalize(
            getRowValue(row, "auditModule", 3)
        );

        const rowAction = normalize(
            getRowValue(row, "auditAction", 2)
        );

        const rowOutcome = normalize(
            getRowValue(row, "auditOutcome", 6)
        );

        const userMatches =
            userValue === "all" || rowUser === userValue;

        const moduleMatches =
            moduleValue === "all" ||
            rowModule === normalize(moduleValue);

        const actionMatches =
            actionValue === "all" ||
            rowAction === normalize(actionValue);

        const outcomeMatches =
            outcomeValue === "all" ||
            rowOutcome === normalize(outcomeValue);

        const recordDate = getRecordDate(row);

        const startDate = auditStartDate?.value || "";
        const endDate = auditEndDate?.value || "";

        const startDateMatches =
            !startDate ||
            (recordDate && recordDate >= startDate);

        const endDateMatches =
            !endDate ||
            (recordDate && recordDate <= endDate);

        return (
            searchMatches &&
            userMatches &&
            moduleMatches &&
            actionMatches &&
            outcomeMatches &&
            startDateMatches &&
            endDateMatches
        );
    }

    // =========================================
    // 10. PAGINATION AND TABLE RENDERING
    // =========================================

    function updatePagination(totalRecords, totalPages) {
        if (currentPageLabel) {
            currentPageLabel.textContent =
                totalPages > 0
                    ? `Page ${currentPage} of ${totalPages}`
                    : "Page 0 of 0";
        }

        if (paginationInfo) {
            if (totalRecords === 0) {
                paginationInfo.textContent =
                    "No records to display";
            } else {
                const firstRecord =
                    (currentPage - 1) * PAGE_SIZE + 1;

                const lastRecord = Math.min(
                    currentPage * PAGE_SIZE,
                    totalRecords
                );

                paginationInfo.textContent =
                    `Showing ${firstRecord}-${lastRecord} of ${totalRecords} records`;
            }
        }

        if (previousPageButton) {
            previousPageButton.disabled =
                totalRecords === 0 || currentPage <= 1;
        }

        if (nextPageButton) {
            nextPageButton.disabled =
                totalRecords === 0 ||
                currentPage >= totalPages;
        }
    }

    function updateRecordCount(totalRecords, matchingRecords) {
        if (!recordCount) {
            return;
        }

        if (totalRecords === matchingRecords) {
            recordCount.textContent =
                `${totalRecords} audit records`;
        } else {
            recordCount.textContent =
                `${matchingRecords} of ${totalRecords} audit records`;
        }
    }

    function renderAuditTable() {
        if (!tableBody) {
            return;
        }

        const allRows = getAuditRows();

        // Hide every record before displaying the current page.
        allRows.forEach((row) => {
            row.hidden = true;
        });

        removeDynamicEmptyMessage();

        updateUserFilterOptions();

        filteredRows = allRows.filter(matchesAuditFilters);

        if (selectedRow && !filteredRows.includes(selectedRow)) {
            clearAuditSelection();
        }

        if (allRows.length === 0) {
            removeDynamicEmptyMessage();

            const hasEmptyMessage = Boolean(
                tableBody.querySelector(".empty-table-message")
            );

            if (!hasEmptyMessage) {
                showEmptyMessage("No audit records available.");
            }

            updateRecordCount(0, 0);
            updatePagination(0, 0);
            return;
        }

        removeStaticEmptyMessage();

        if (filteredRows.length === 0) {
            showEmptyMessage(
                "No audit records match the selected filters."
            );

            updateRecordCount(allRows.length, 0);
            updatePagination(0, 0);
            return;
        }

        const totalPages = Math.ceil(
            filteredRows.length / PAGE_SIZE
        );

        currentPage = Math.max(
            1,
            Math.min(currentPage, totalPages)
        );

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;

        filteredRows
            .slice(startIndex, endIndex)
            .forEach((row) => {
                row.hidden = false;
            });

        updateRecordCount(
            allRows.length,
            filteredRows.length
        );

        updatePagination(
            filteredRows.length,
            totalPages
        );
    }

    function applyAuditFilters() {
        if (!validateDateRange()) {
            updateNotice(
                "Invalid date range",
                "The start date cannot be later than the end date. Please correct the selected dates."
            );

            return;
        }

        currentPage = 1;
        renderAuditTable();

        updateNotice(
            "Backend connection pending",
            "The selected filters have been applied to available audit records. Database records will be loaded after the audit API is implemented."
        );
    }

    // =========================================
    // 11. VIEW AUDIT RECORD DETAILS
    // =========================================

    function setDetailValue(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value || "—";
        }
    }

    function showAuditDetails(row) {
        if (!row || !detailsPanel) {
            return;
        }

        clearAuditSelection();

        selectedRow = row;
        row.classList.add("selected-row");

        setDetailValue(
            "detailAuditId",
            getRowValue(row, "auditId", 0)
        );

        setDetailValue(
            "detailAuditDate",
            getRowValue(row, "auditDate", 0)
        );

        setDetailValue(
            "detailAuditUser",
            getRowValue(row, "auditUser", 1)
        );

        setDetailValue(
            "detailAuditAction",
            getRowValue(row, "auditAction", 2)
        );

        setDetailValue(
            "detailAuditModule",
            getRowValue(row, "auditModule", 3)
        );

        setDetailValue(
            "detailAuditReference",
            getRowValue(row, "auditReference", 4)
        );

        setDetailValue(
            "detailAuditIpAddress",
            getRowValue(row, "auditIpAddress", 5)
        );

        setDetailValue(
            "detailAuditOutcome",
            getRowValue(row, "auditOutcome", 6)
        );

        const description = document.getElementById(
            "detailAuditDescription"
        );

        if (description) {
            description.textContent =
                row.dataset.auditDescription ||
                "No additional activity description available.";
        }

        detailsPanel.hidden = false;

        if (clearSelectionButton) {
            clearSelectionButton.disabled = false;
        }

        detailsPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function clearAuditSelection() {
        if (selectedRow) {
            selectedRow.classList.remove("selected-row");
            selectedRow = null;
        }

        if (detailsPanel) {
            detailsPanel.hidden = true;
        }

        if (clearSelectionButton) {
            clearSelectionButton.disabled = true;
        }
    }

    if (tableBody) {
        tableBody.addEventListener("click", (event) => {
            const viewButton = event.target.closest(
                '[data-action="view-audit"], .audit-view-button'
            );

            if (!viewButton) {
                return;
            }

            const row = viewButton.closest("tr");

            if (row) {
                showAuditDetails(row);
            }
        });
    }

    // =========================================
    // 12. FILTER EVENT LISTENERS
    // =========================================

    [
        auditSearchInput,
        auditUserFilter,
        auditModuleFilter,
        auditActionFilter,
        auditOutcomeFilter
    ].forEach((element) => {
        if (!element) {
            return;
        }

        element.addEventListener(
            element === auditSearchInput ? "input" : "change",
            () => {
                currentPage = 1;
                renderAuditTable();
            }
        );
    });

    if (auditStartDate) {
        auditStartDate.addEventListener("change", () => {
            validateDateRange();
        });
    }

    if (auditEndDate) {
        auditEndDate.addEventListener("change", () => {
            validateDateRange();
        });
    }

    if (applyFiltersButton) {
        applyFiltersButton.addEventListener(
            "click",
            applyAuditFilters
        );
    }

    // =========================================
    // 13. RESET FILTERS
    // =========================================

    if (resetFiltersButton) {
        resetFiltersButton.addEventListener("click", () => {
            if (auditSearchInput) {
                auditSearchInput.value = "";
            }

            if (auditUserFilter) {
                auditUserFilter.value = "all";
            }

            if (auditModuleFilter) {
                auditModuleFilter.value = "all";
            }

            if (auditActionFilter) {
                auditActionFilter.value = "all";
            }

            if (auditOutcomeFilter) {
                auditOutcomeFilter.value = "all";
            }

            if (auditStartDate) {
                auditStartDate.value = "";
                auditStartDate.removeAttribute("aria-invalid");
            }

            if (auditEndDate) {
                auditEndDate.value = "";
                auditEndDate.removeAttribute("aria-invalid");
            }

            currentPage = 1;

            clearAuditSelection();
            renderAuditTable();

            updateNotice(
                "Backend connection pending",
                "Audit filters have been reset. Actual activity records will be available after the audit logging API is implemented."
            );
        });
    }

    // =========================================
    // 14. PAGINATION BUTTONS
    // =========================================

    if (previousPageButton) {
        previousPageButton.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderAuditTable();
            }
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener("click", () => {
            const totalPages = Math.ceil(
                filteredRows.length / PAGE_SIZE
            );

            if (currentPage < totalPages) {
                currentPage++;
                renderAuditTable();
            }
        });
    }

    // =========================================
    // 15. CLEAR AND CLOSE DETAILS
    // =========================================

    if (clearSelectionButton) {
        clearSelectionButton.addEventListener(
            "click",
            clearAuditSelection
        );
    }

    if (closeDetailsButton) {
        closeDetailsButton.addEventListener(
            "click",
            clearAuditSelection
        );
    }

    // =========================================
    // 16. REFRESH AUDIT TABLE
    // =========================================

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            currentPage = 1;

            renderAuditTable();

            updateNotice(
                "Backend connection pending",
                "The audit table has been refreshed. New database records cannot be loaded until the audit logging API is implemented."
            );
        });
    }

    // =========================================
    // 17. INITIAL PAGE STATE
    // =========================================

    closeSidebar();
    clearAuditSelection();
    renderAuditTable();

    if (exportButton) {
        exportButton.disabled = true;
    }

    updateNotice(
        "Backend connection pending",
        "Audit records will be loaded from the backend after the audit logging API is implemented. This page currently displays no actual user activity records."
    );
});
