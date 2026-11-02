
document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // 1. ELEMENT REFERENCES
    // =========================================

    const appLayout = document.querySelector(".app-layout");

    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const requestNumber = document.getElementById("requestNumber");
    const requestNotice = document.querySelector(
        ".request-setup-notice"
    );

    const refreshButton = document.getElementById(
        "refreshRequestButton"
    );

    const printButton = document.getElementById(
        "printRequestButton"
    );

    const logoutButton = document.getElementById("logoutButton");

    // =========================================
    // 2. REQUEST IDENTIFICATION
    // =========================================

    const urlParams = new URLSearchParams(window.location.search);

    const requestId = urlParams.get("requestId");

    function updateRequestNotice(title, message) {
        const noticeTitle = requestNotice?.querySelector("strong");
        const noticeMessage = requestNotice?.querySelector("p");

        if (noticeTitle) {
            noticeTitle.textContent = title;
        }

        if (noticeMessage) {
            noticeMessage.textContent = message;
        }
    }

    function initializeRequestDetails() {
        if (!requestId || !requestId.trim()) {
            if (requestNumber) {
                requestNumber.textContent = "No Request Selected";
            }

            updateRequestNotice(
                "No Request Selected",
                "No laboratory request identifier was supplied. Return to the Laboratory Requests page and select a request when records become available."
            );

            return;
        }

        updateRequestNotice(
            "Request Identifier Received",
            "A request identifier was received successfully. The request details will be retrieved after the Laboratory Request backend module is implemented."
        );
    }

    // =========================================
    // 3. MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        if (appLayout) {
            appLayout.classList.add("sidebar-open");
        }

        if (sidebarToggle) {
            sidebarToggle.setAttribute("aria-expanded", "true");
            sidebarToggle.setAttribute(
                "aria-label",
                "Close navigation menu"
            );
        }
    }

    function closeSidebar() {
        if (appLayout) {
            appLayout.classList.remove("sidebar-open");
        }

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
            const isOpen = appLayout?.classList.contains(
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
    // 4. REFRESH REQUEST DETAILS
    // =========================================

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            initializeRequestDetails();

            if (requestId) {
                updateRequestNotice(
                    "Backend Connection Pending",
                    "The request identifier is available, but request information cannot yet be retrieved because the backend module has not been connected."
                );
            }
        });
    }

    // =========================================
    // 5. PRINT REQUEST DETAILS
    // =========================================

    if (printButton) {
        printButton.disabled = true;
        printButton.title =
            "Printing will be enabled after request data is connected.";
    }

    // =========================================
    // 6. TEMPORARY LOGOUT
    // =========================================

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            const confirmLogout = window.confirm(
                "Return to the MediLink login page? Actual account logout will be enabled during Phase 4."
            );

            if (confirmLogout) {
                window.location.href = "login.html";
            }
        });
    }

    // =========================================
    // 7. INITIALIZE PAGE
    // =========================================

    closeSidebar();
    initializeRequestDetails();
});
