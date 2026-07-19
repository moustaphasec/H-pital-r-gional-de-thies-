// public/init-config.js
// This script runs before the DOM is fully loaded to apply the White Label Configuration

(function() {
    if (!window.ClinicConfig) return;

    const config = window.ClinicConfig;

    // Apply CSS Variables for Colors
    if (config.primaryColor) document.documentElement.style.setProperty('--primary-color', config.primaryColor);
    if (config.primaryDarkColor) document.documentElement.style.setProperty('--primary-dark', config.primaryDarkColor);
    if (config.secondaryColor) document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
    if (config.accentColor) document.documentElement.style.setProperty('--accent-color', config.accentColor);

    // Apply to DOM when loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Update Title
        if (config.name) {
            document.title = document.title.replace("Hôpital Régional", config.name);
        }

        // Update Text Elements mapped to data-config
        document.querySelectorAll('[data-config]').forEach(el => {
            const key = el.getAttribute('data-config');
            if (config[key]) {
                if (el.tagName === 'A' && key.includes('Phone')) {
                    el.textContent = config[key];
                    el.href = "tel:" + config[key].replace(/\s+/g, '');
                } else if (el.tagName === 'IMG' && key === 'logo') {
                    el.src = config[key];
                } else {
                    el.innerHTML = config[key]; // Allow HTML like <br>
                }
            }
        });
    });
})();
