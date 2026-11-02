
document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // 1. ELEMENT REFERENCES
    // =========================================

    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const reportsNotice = document.querySelector(".reports-notice");
    const noticeTitle = reportsNotice?.querySelector("strong");
    const noticeMessage = reportsNotice?.querySelector("p");

    const reportTypeFilter = document.getElementById("reportTypeFilter");
    const reportStartDate = document.getElementById("reportStartDate");
    const reportEndDate = document.getElementById("reportEndDate");
    const reportStatusFilter = document.getElementById("reportStatusFilter");

    const resetReportFiltersButton = document.getElementById(
        "resetReportFiltersButton"
    );

    const reportSearchInput = document.getElementById("reportSearchInput");
    const refreshReportsButton = document.getElementById(
        "refreshReportsButton"
    );

    const reportsTableBody = document.getElementById("reportsTableBody");
    const reportRecordCount = document.getElementById("reportRecordCount");

    // =========================================
    // 2. NOTICE MESSAGE
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
    // 3. MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        document.body.classList.add("sidebar-open");

        if (sidebarToggle) {
            sidebarToggle.setAttribute("aria-expanded", "true");
            sidebarToggle.setAttribute("aria-label", "Close navigation menu");
        }
    }

    function closeSidebar() {
        document.body.classList.remove("sidebar-open");

        if (sidebarToggle) {
            sidebarToggle.setAttribute("aria-expanded", "false");
            sidebarToggle.setAttribute("aria-label", "Open navigation menu");
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            const isOpen = document.body.classList.contains("sidebar-open");

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

    // Close the mobile sidebar when returning to desktop width.
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });

    // =========================================
    // 4. REPORT DATE VALIDATION
    // =========================================

    function validateReportDateRange() {
        if (!reportStartDate || !reportEndDate) {
            return true;
        }

        const startDate = reportStartDate.value;
        const endDate = reportEndDate.value;

        const isInvalid = Boolean(
            startDate && endDate && startDate > endDate
        );

        reportStartDate.setAttribute(
            "aria-invalid",
            String(isInvalid)
        );

        reportEndDate.setAttribute(
            "aria-invalid",
            String(isInvalid)
        );

        return !isInvalid;
    }

    if (reportStartDate) {
        reportStartDate.addEventListener(
            "change",
            validateReportDateRange
        );
    }

    if (reportEndDate) {
        reportEndDate.addEventListener(
            "change",
            validateReportDateRange
        );
    }

    // =========================================
    // 5. REPORT TABLE SEARCH
    // =========================================

    function getReportRows() {
    if (!reportsTableBody) {
        return [];
    }

    return Array.from(
        reportsTableBody.querySelectorAll("tr")
    ).filter((row) => {
        const isEmptyPlaceholder = row.querySelector(
            ".empty-table-message"
        );

        return (
            !isEmptyPlaceholder &&
            row.dataset.searchEmptyRow !== "true"
        );
    });
}

    function removeSearchEmptyMessage() {
        const emptyMessage = reportsTableBody?.querySelector(
            '[data-search-empty-row="true"]'
        );

        if (emptyMessage) {
            emptyMessage.remove();
        }
    }

    function showSearchEmptyMessage() {
        if (!reportsTableBody) {
            return;
        }

        removeSearchEmptyMessage();

        const row = document.createElement("tr");
        row.dataset.searchEmptyRow = "true";

        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.className = "empty-table-message";
        cell.textContent = "No report records match your search.";

        row.appendChild(cell);
        reportsTableBody.appendChild(row);
    }

    function updateReportRecordCount(visibleCount, totalCount) {
        if (!reportRecordCount) {
            return;
        }

        const searchTerm = reportSearchInput?.value.trim() || "";

        if (searchTerm) {
            reportRecordCount.textContent =
                `${visibleCount} of ${totalCount} report records`;
        } else {
            reportRecordCount.textContent =
                `${totalCount} report records`;
        }
    }

    function filterReportRows() {
        if (!reportsTableBody) {
            return;
        }

        removeSearchEmptyMessage();

        const rows = getReportRows();
        const searchTerm = reportSearchInput?.value
            .trim()
            .toLowerCase() || "";

        let visibleCount = 0;

        rows.forEach((row) => {
            const rowText = row.textContent.toLowerCase();
            const matches = rowText.includes(searchTerm);

            row.hidden = !matches;

            if (matches) {
                visibleCount++;
            }
        });

        if (rows.length > 0 && visibleCount === 0) {
            showSearchEmptyMessage();
        }

        updateReportRecordCount(visibleCount, rows.length);
    }

    if (reportSearchInput) {
        reportSearchInput.addEventListener("input", filterReportRows);
    }

    // =========================================
    // 6. RESET REPORT FILTERS
    // =========================================

    if (resetReportFiltersButton) {
        resetReportFiltersButton.addEventListener("click", () => {
            if (reportTypeFilter) {
                reportTypeFilter.value = "all";
            }

            if (reportStartDate) {
                reportStartDate.value = "";
                reportStartDate.removeAttribute("aria-invalid");
            }

            if (reportEndDate) {
                reportEndDate.value = "";
                reportEndDate.removeAttribute("aria-invalid");
            }

            if (reportStatusFilter) {
                reportStatusFilter.value = "all";
            }

            if (reportSearchInput) {
                reportSearchInput.value = "";
            }

            filterReportRows();

            updateNotice(
                "Backend connection pending",
                "Report filters have been reset. Actual report data will be available after backend integration."
            );
        });
    }

    // =========================================
    // 7. REFRESH REPORTS
    // =========================================

    if (refreshReportsButton) {
        refreshReportsButton.addEventListener("click", () => {
            filterReportRows();

            updateNotice(
                "Backend connection pending",
                "The report interface has been refreshed. Database records cannot be loaded until the reports API is implemented."
            );
        });
    }

    // =========================================
    // 8. INITIAL PAGE STATE
    // =========================================

    closeSidebar();
    filterReportRows();

    updateNotice(
        "Backend connection pending",
        "Report figures and charts will be displayed after the reports and analytics functions are connected to the database."
    );
});
