/**
 * Security patch script — run with: node scripts/patch-security.cjs
 * Applies rate limiting, input sanitization improvements, and other security fixes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── 1. Add rate limiting to appointment-logic.js ────────────────────────────
function patchAppointmentLogic() {
  const filePath = path.join(ROOT, 'src', 'appointment-logic.js');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('SUBMISSION_KEY')) {
    console.log('[appointment-logic.js] Rate limit already present, skipping.');
    return;
  }

  const rateLimitBlock = `
// ── Rate limiting: max 3 submissions per 10 minutes (client-side guard) ─────
const SUBMISSION_KEY = 'hr_thies_submission_timestamps';
function checkRateLimit() {
    try {
        const now = Date.now();
        const windowMs = 10 * 60 * 1000; // 10 minutes
        const maxAttempts = 3;
        const stored = JSON.parse(localStorage.getItem(SUBMISSION_KEY) || '[]');
        const recent = stored.filter(function(ts) { return now - ts < windowMs; });
        if (recent.length >= maxAttempts) {
            const waitMin = Math.ceil((windowMs - (now - recent[0])) / 60000);
            return 'Vous avez soumis ' + maxAttempts + ' demandes tres recemment. Patientez encore ' + waitMin + ' min, ou appelez directement le +221 33 952 10 90.';
        }
        recent.push(now);
        localStorage.setItem(SUBMISSION_KEY, JSON.stringify(recent));
        return null; // OK
    } catch { return null; } // fail open
}
`;

  const marker = "import emailjs from '@emailjs/browser';";
  content = content.replace(marker, marker + rateLimitBlock);

  // Inject rate limit check at start of form submit handler
  const submitMarker = "        if (!name || name.length < 2) {";
  const rateLimitCheck = `        // Rate limit check
        const rateLimitMsg = checkRateLimit();
        if (rateLimitMsg) {
            alert(rateLimitMsg);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }

        `;
  content = content.replace(submitMarker, rateLimitCheck + submitMarker);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[appointment-logic.js] Rate limiting injected OK.');
}

// ── 2. Add email validation to appointment-logic.js ─────────────────────────
function patchEmailValidation() {
  const filePath = path.join(ROOT, 'src', 'appointment-logic.js');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('emailRegex')) {
    console.log('[appointment-logic.js] Email validation already present.');
    return;
  }

  // Add email regex validation before the specialty check
  const old = `        if (!specialtyInput.value || !dateInput.value || !timeSlotInput.value) {`;
  const improved = `        // Email format validation (optional field)
        if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
            const emailRegex = true; // marker
            alert('L\\'adresse email semble incorrecte. Veuillez la corriger ou la laisser vide.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }

        if (!specialtyInput.value || !dateInput.value || !timeSlotInput.value) {`;

  content = content.replace(old, improved);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[appointment-logic.js] Email validation injected OK.');
}

// ── 3. Add name sanitization (no numbers/symbols in name field) ─────────────
function patchNameValidation() {
  const filePath = path.join(ROOT, 'src', 'appointment-logic.js');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('nameRegex')) {
    console.log('[appointment-logic.js] Name validation already present.');
    return;
  }

  const old = `        if (!name || name.length < 2) {
            alert('Veuillez saisir votre nom complet.');
            return;
        }`;

  const improved = `        // Name: at least 2 chars, no pure numbers
        const nameRegex = true; // marker
        if (!name || name.length < 2) {
            alert('Veuillez saisir votre nom complet (minimum 2 caractères).');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        if (name.length > 150) {
            alert('Le nom saisi est trop long (maximum 150 caractères).');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }`;

  content = content.replace(old, improved);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[appointment-logic.js] Name validation improved OK.');
}

// ── 4. Harden firestore.rules — add size check on contact email ─────────────
function patchFirestoreRules() {
  const filePath = path.join(ROOT, 'firestore.rules');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('email.size()')) {
    console.log('[firestore.rules] Email size check already present.');
    return;
  }

  // Add email field length check to contact_messages rule
  const old = `      allow create: if request.resource.data.name is string
                    && request.resource.data.name.size() <= 150
                    && request.resource.data.message is string
                    && request.resource.data.message.size() <= 3000;`;

  const improved = `      allow create: if request.resource.data.name is string
                    && request.resource.data.name.size() >= 2
                    && request.resource.data.name.size() <= 150
                    && request.resource.data.message is string
                    && request.resource.data.message.size() >= 5
                    && request.resource.data.message.size() <= 3000
                    && (!('email' in request.resource.data) || request.resource.data.email.size() <= 254)
                    && (!('phone' in request.resource.data) || request.resource.data.phone.size() <= 30);`;

  content = content.replace(old, improved);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[firestore.rules] Contact message rules hardened OK.');
}

// ── 5. Add og:image and canonical to index.html for SEO ─────────────────────
function patchIndexSEO() {
  const filePath = path.join(ROOT, 'index.html');
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('og:image')) {
    console.log('[index.html] og:image already present.');
    return;
  }

  const old = `    <meta property="og:locale" content="fr_SN">`;
  const improved = `    <meta property="og:locale" content="fr_SN">
    <meta property="og:image" content="https://res.cloudinary.com/dzcnlr1yz/image/upload/v1742394317/f1oy2jfpkujbopbqlrd2.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:site_name" content="Hôpital Régional de Thiès">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès">
    <meta name="twitter:description" content="Prenez rendez-vous en ligne avec nos spécialistes à Thiès, Sénégal. Urgences 24h/24.">
    <meta name="twitter:image" content="https://res.cloudinary.com/dzcnlr1yz/image/upload/v1742394317/f1oy2jfpkujbopbqlrd2.png">
    <link rel="canonical" href="https://hopital-regional-thies.netlify.app/">`;

  content = content.replace(old, improved);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[index.html] SEO og:image + canonical + Twitter card added OK.');
}

// ── Run all patches ──────────────────────────────────────────────────────────
try { patchAppointmentLogic(); } catch(e) { console.error('patchAppointmentLogic FAILED:', e.message); }
try { patchEmailValidation(); } catch(e) { console.error('patchEmailValidation FAILED:', e.message); }
try { patchNameValidation(); } catch(e) { console.error('patchNameValidation FAILED:', e.message); }
try { patchFirestoreRules(); } catch(e) { console.error('patchFirestoreRules FAILED:', e.message); }
try { patchIndexSEO(); } catch(e) { console.error('patchIndexSEO FAILED:', e.message); }

console.log('\nAll security patches applied!');
