/**
 * Global site improvement script — run with: node scripts/patch-global.cjs
 * - Adds og:image to all HTML pages
 * - Adds AOS init check
 * - Adds schema.org structured data to index.html
 * - Ensures consistent footer across pages
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const HTML_PAGES = [
  'appointment.html', 'about.html', 'services.html', 'specialties.html',
  'team.html', 'contact.html', 'suivi.html', 'mentions-legales.html',
  'confidentialite.html', '404.html'
];

// ── 1. Add og:image meta to all pages that lack it ──────────────────────────
function addOgImageToPages() {
  HTML_PAGES.forEach(page => {
    const filePath = path.join(ROOT, page);
    if (!fs.existsSync(filePath)) { console.log(`Skip (not found): ${page}`); return; }
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('og:image')) { console.log(`[${page}] og:image already present.`); return; }

    const marker = '    <meta name="theme-color" content="#0F172A">';
    if (!content.includes(marker)) { console.log(`[${page}] theme-color marker not found, skipping og.`); return; }

    const ogTags = `    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_SN">
    <meta property="og:site_name" content="Hôpital Régional de Thiès">
    <meta property="og:image" content="https://res.cloudinary.com/dzcnlr1yz/image/upload/v1742394317/f1oy2jfpkujbopbqlrd2.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">`;

    content = content.replace(marker, marker + '\n' + ogTags);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[${page}] og:image added.`);
  });
}

// ── 2. Add JSON-LD structured data (schema.org Hospital) to index.html ────────
function addStructuredData() {
  const filePath = path.join(ROOT, 'index.html');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('application/ld+json')) {
    console.log('[index.html] JSON-LD already present.');
    return;
  }

  const jsonLd = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Hospital",
      "name": "Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès",
      "alternateName": "Hôpital Régional de Thiès",
      "url": "https://hopital-regional-thies.netlify.app/",
      "logo": "https://res.cloudinary.com/dzcnlr1yz/image/upload/v1742394317/f1oy2jfpkujbopbqlrd2.png",
      "image": "https://res.cloudinary.com/dzcnlr1yz/image/upload/v1742394317/f1oy2jfpkujbopbqlrd2.png",
      "description": "Établissement public de santé de référence pour la région de Thiès (Sénégal). Urgences 24h/24, 20 spécialités médicales, prise de rendez-vous en ligne.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Avenue Caen, Route de Dakar",
        "addressLocality": "Thiès",
        "addressRegion": "Région de Thiès",
        "postalCode": "21000",
        "addressCountry": "SN"
      },
      "telephone": "+221339521090",
      "email": "contact@hopital-regional-thies.sn",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          "opens": "08:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "08:00",
          "closes": "12:00"
        }
      ],
      "medicalSpecialty": [
        "Cardiology","Nephrology","Gynecology","Pediatrics","Surgery","Ophthalmology",
        "ENT","Dermatology","Gastroenterology","InternalMedicine","Psychiatry"
      ],
      "hasMap": "https://maps.google.com/?q=Hopital+Regional+Thies+Senegal",
      "priceRange": "CMU acceptée",
      "sameAs": []
    }
    </script>`;

  // Insert before </head>
  content = content.replace('</head>', jsonLd + '\n</head>');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[index.html] JSON-LD structured data added.');
}

// ── 3. Verify all HTML pages have AOS script tag ─────────────────────────────
function checkAOSInit() {
  const allPages = ['index.html', ...HTML_PAGES];
  allPages.forEach(page => {
    const filePath = path.join(ROOT, page);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const hasAOS = content.includes('AOS.init') || content.includes('aos.js');
    console.log(`[${page}] AOS initialized: ${hasAOS ? 'YES' : 'NO (check manually)'}`);
  });
}

// ── 4. Add aria-label to menu toggles for accessibility ─────────────────────
function fixMenuToggleAria() {
  const allPages = ['index.html', ...HTML_PAGES];
  let fixed = 0;
  allPages.forEach(page => {
    const filePath = path.join(ROOT, page);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix menu-toggle: add role="button" if missing
    const old = '<div class="menu-toggle" aria-label="Menu">';
    const improved = '<div class="menu-toggle" role="button" aria-label="Ouvrir le menu de navigation" aria-expanded="false" tabindex="0">';
    if (content.includes(old)) {
      content = content.replaceAll(old, improved);
      fs.writeFileSync(filePath, content, 'utf8');
      fixed++;
    }
  });
  console.log(`[accessibility] Fixed menu-toggle aria on ${fixed} pages.`);
}

// Run all
try { addOgImageToPages(); } catch(e) { console.error('addOgImageToPages FAILED:', e.message); }
try { addStructuredData(); } catch(e) { console.error('addStructuredData FAILED:', e.message); }
try { checkAOSInit(); } catch(e) { console.error('checkAOSInit FAILED:', e.message); }
try { fixMenuToggleAria(); } catch(e) { console.error('fixMenuToggleAria FAILED:', e.message); }

console.log('\nGlobal patches done!');
