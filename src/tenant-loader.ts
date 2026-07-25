import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

function getClinicId(): string {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clinic')) {
        const c = urlParams.get('clinic')!;
        localStorage.setItem('healthsaas_clinic_id', c);
        return c;
    }
    const stored = localStorage.getItem('healthsaas_clinic_id');
    if (stored) return stored;

    let hostname = window.location.hostname;
    if (hostname.startsWith('www.')) hostname = hostname.replace('www.', '');
    if (hostname !== 'localhost' && !hostname.includes('netlify.app')) {
        return hostname.split('.')[0];
    } else if (hostname.includes('netlify.app')) {
        return hostname.split('.')[0];
    }
    return 'thies';
}

async function loadTenantConfig() {
    const clinicId = getClinicId();
    console.log('[SaaS] Loading config for:', clinicId);

    try {
        const docRef = doc(db, 'clinics', clinicId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            (window as any).ClinicConfig = config;

            if (config.primaryColor) {
                document.documentElement.style.setProperty('--primary-color', config.primaryColor);
            }
            if (config.primaryDarkColor) {
                document.documentElement.style.setProperty('--primary-dark', config.primaryDarkColor);
            }
            if (config.name) {
                document.title = config.name;
            }

            document.querySelectorAll('[data-config]').forEach(el => {
                const key = el.getAttribute('data-config');
                if (key && config[key]) {
                    if (el.tagName === 'A' && key.toLowerCase().includes('phone')) {
                        el.textContent = config[key];
                        (el as HTMLAnchorElement).href = 'tel:' + config[key].replace(/\s+/g, '');
                    } else if (el.tagName === 'IMG' && key === 'logo') {
                        (el as HTMLImageElement).src = config[key];
                    } else {
                        el.innerHTML = config[key];
                    }
                }
            });
            console.log('[SaaS] Config applied for:', clinicId);
        } else {
            console.warn('[SaaS] No config found for:', clinicId, '- using defaults.');
        }
    } catch (e) {
        console.warn('[SaaS] Could not load config (using defaults):', e);
    }
}

// Run when DOM is ready - never blocks rendering
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTenantConfig);
} else {
    loadTenantConfig();
}
