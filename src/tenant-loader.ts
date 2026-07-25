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

    // Fallback to domain/subdomain mapping
    let hostname = window.location.hostname;
    if (hostname.startsWith('www.')) {
        hostname = hostname.replace('www.', '');
    }
    
    if (hostname !== 'localhost' && !hostname.includes('netlify.app')) {
        return hostname.split('.')[0];
    } else if (hostname.includes('netlify.app')) {
        return hostname.split('.')[0];
    }
    
    // Default to 'thies' if running locally or unconfigured
    return 'thies';
}

// Always reveal the page - never leave it blank
function revealPage() {
    const overlay = document.getElementById('tenant-overlay');
    if (overlay) overlay.remove();
    document.body.style.opacity = '1';
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
                        (el as HTMLAnchorElement).href = "tel:" + config[key].replace(/\s+/g, '');
                    } else if (el.tagName === 'IMG' && key === 'logo') {
                        (el as HTMLImageElement).src = config[key];
                    } else {
                        el.innerHTML = config[key];
                    }
                }
            });

            console.log("SaaS config applied for:", clinicId);
        } else {
            console.warn("Clinic not found in SaaS registry:", clinicId, "- using default site values.");
        }
    } catch (e) {
        console.error("Error loading SaaS config (site will work with defaults):", e);
    }

    // ALWAYS reveal the page, whether config loaded or not
    revealPage();
}

// Run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTenantConfig);
} else {
    loadTenantConfig();
}

// Safety net: if for any reason the loader takes too long, reveal the page after 3 seconds
setTimeout(revealPage, 3000);
