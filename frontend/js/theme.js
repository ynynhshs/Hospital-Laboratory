// ==========================================
// MEDILINK LABORATORY
// THEME TOGGLE (light / dark with clay transitions)
// ==========================================

(function () {
    const STORAGE_KEY = 'medilink-theme';
    const ROOT = document.documentElement;
    let transitionTimeout = null;

    // --------------------------------------------------
    // 1. IMMEDIATE THEME SETUP
    // Runs as soon as the file is loaded in the <head>
    // to prevent a flash of the wrong theme on page load.
    // --------------------------------------------------
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (systemPrefersDark ? 'dark' : 'light');
        ROOT.setAttribute('data-theme', theme);
    } catch (error) {
        ROOT.setAttribute('data-theme', 'light');
    }

    // --------------------------------------------------
    // 2. DOM READY SETUP
    // Runs when the page is fully loaded to set up clicks.
    // --------------------------------------------------
    function initThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        // Function to update button accessibility labels
        function updateToggleState(theme) {
            toggle.setAttribute(
                'aria-label',
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            );
            toggle.setAttribute('title',
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        }

        // Function to apply the theme with animation
        function applyTheme(theme, animate) {
            if (animate) {
                document.body.classList.add('theme-transitioning');
                clearTimeout(transitionTimeout);
                transitionTimeout = setTimeout(function () {
                    document.body.classList.remove('theme-transitioning');
                }, 550);
            }

            ROOT.setAttribute('data-theme', theme);

            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch (error) {
                // Ignore storage errors (private mode, etc.)
            }

            updateToggleState(theme);
        }

        // Get current theme from the HTML attribute (set in part 1)
        let currentTheme = ROOT.getAttribute('data-theme') || 'light';
        updateToggleState(currentTheme);

        // Add click listener
        toggle.addEventListener('click', function () {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            currentTheme = nextTheme;
            applyTheme(nextTheme, true);
        });

        // Listen to OS-level preference changes
        if (window.matchMedia) {
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = function (event) {
                // Only auto-switch if the user hasn't explicitly chosen a theme
                if (!localStorage.getItem(STORAGE_KEY)) {
                    currentTheme = event.matches ? 'dark' : 'light';
                    applyTheme(currentTheme, true);
                }
            };
            if (media.addEventListener) {
                media.addEventListener('change', listener);
            } else if (media.addListener) {
                media.addListener(listener);
            }
        }
    }

    // Trigger the setup when the HTML is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeToggle);
    } else {
        initThemeToggle();
    }
})();