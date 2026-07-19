import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

// Helper to extract clinic ID from URL (e.g., thies.healthsaas.com -> 'thies', or ?clinic=thies)
function getClinicId() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clinic')) {
        const c = urlParams.get('clinic')!;
        localStorage.setItem('healthsaas_clinic_id', c);
        return c;
    }
    
    // Fallback to local storage
    const stored = localStorage.getItem('healthsaas_clinic_id');
    if (stored) return stored;

    // Fallback to subdomain mapping
    const hostname = window.location.hostname;
    if (hostname.includes('.')) {
        const subdomain = hostname.split('.')[0];
        if (subdomain !== 'www' && subdomain !== 'localhost') {
            return subdomain;
        }
    }
    
    // Default to 'thies' if running locally or unconfigured
    return 'thies';
}

async function loadTenantConfig() {
    const clinicId = getClinicId();
    console.log("Loading SaaS config for tenant:", clinicId);

    try {
        const docRef = doc(db, 'clinics', clinicId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            
            // Set global config
            (window as any).ClinicConfig = config;

            // Apply CSS
            if (config.primaryColor) {
                document.documentElement.style.setProperty('--primary-color', config.primaryColor);
            }
            if (config.primaryDarkColor) {
                document.documentElement.style.setProperty('--primary-dark', config.primaryDarkColor);
            }

            // Apply DOM replacements
            if (config.name) {
                document.title = document.title.replace("Hôpital Régional", config.name).replace("HealthSaaS", config.name);
            }

            document.querySelectorAll('[data-config]').forEach(el => {
                const key = el.getAttribute('data-config');
                if (key && config[key]) {
                    if (el.tagName === 'A' && key.toLowerCase().includes('phone')) {
                        el.textContent = config[key];
                        (el as HTMLAnchorElement).href = "tel:" + config[key].replace(/\\s+/g, '');
                    } else if (el.tagName === 'IMG' && key === 'logo') {
                        (el as HTMLImageElement).src = config[key];
                    } else {
                        el.innerHTML = config[key];
                    }
                }
            });

            // Reveal the body if it was hidden
            const overlay = document.getElementById('tenant-overlay');
            if (overlay) overlay.remove();

        } else {
            console.error("Clinic not found in SaaS registry:", clinicId);
            document.body.innerHTML = \`<div style="padding:50px; text-align:center; font-family:sans-serif;">
                <h1>Erreur 404 - Hôpital introuvable</h1>
                <p>La clinique "<strong>\${clinicId}</strong>" n'existe pas dans le système HealthSaaS.</p>
            </div>\`;
        }
    } catch (e) {
        console.error("Error loading SaaS config", e);
        // Fallback or show error
        const overlay = document.getElementById('tenant-overlay');
        if (overlay) overlay.remove();
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', loadTenantConfig);
// If DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    loadTenantConfig();
}
