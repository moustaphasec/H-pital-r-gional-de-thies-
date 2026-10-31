import { setDoc, doc } from 'firebase/firestore';
import {
    db,
    EMAILJS_CONFIG,
    getClinicId,
    fetchBookedSlotsForDate,
    reserveBookedSlot,
    escapeHtml
} from './lib/firebase';
import { BOOKING_SPECIALTIES, resolveSpecialtyFromQuery } from './lib/specialties';
import emailjs from '@emailjs/browser';

function getLocalTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatFrenchDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function printAppointmentReceipt(apt) {
    const win = window.open('', '_blank', 'width=720,height=800');
    if (!win) {
        window.print();
        return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche de Rendez-vous ${escapeHtml(apt.trackingCode)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 36px; max-width: 640px; margin: 0 auto; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 18px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .hospital { font-size: 18px; font-weight: 700; color: #1e40af; }
  .sub { font-size: 13px; color: #475569; margin-top: 4px; }
  .code-box { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
  .code { font-size: 28px; font-weight: 800; color: #1d4ed8; letter-spacing: 3px; margin: 4px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
  .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
  .val { font-size: 15px; font-weight: 600; color: #0f172a; }
  .docs { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; font-size: 13px; line-height: 1.6; }
  .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="hospital">Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène</div>
      <div class="sub">Avenue Caen, Route de Dakar — Thiès, Sénégal • Tél : +221 33 952 10 90</div>
    </div>
  </div>
  <div class="code-box">
    <div style="font-size:13px;color:#475569;">CODE DE SUIVI DU RENDEZ-VOUS</div>
    <div class="code">${escapeHtml(apt.trackingCode)}</div>
    <div style="font-size:12px;color:#64748b;">Statut actuel : ${escapeHtml(apt.status || 'En attente de confirmation')}</div>
  </div>
  <div class="grid">
    <div class="cell"><div class="label">Patient(e)</div><div class="val">${escapeHtml(apt.name)}</div></div>
    <div class="cell"><div class="label">Téléphone</div><div class="val">${escapeHtml(apt.phone)}</div></div>
    <div class="cell"><div class="label">Service / Spécialité</div><div class="val">${escapeHtml(apt.specialty)}</div></div>
    <div class="cell"><div class="label">Date & Heure</div><div class="val">${escapeHtml(apt.date)} à ${escapeHtml(apt.timeSlot)}</div></div>
  </div>
  <div class="docs">
    <strong>Documents à présenter à l'accueil le jour du rendez-vous :</strong><br>
    • Pièce d'identité nationale (CNI ou passeport)<br>
    • Carnet de santé et anciens résultats d'examens / ordonnances<br>
    • Carte CMU, mutuelle de santé, imputation budgétaire ou assurance (si applicable)<br>
    <em>Merci de vous présenter 15 minutes avant l'heure prévue.</em>
  </div>
  <div class="footer">
    Document généré le ${new Date().toLocaleString('fr-FR')} — Hôpital Régional de Thiès
  </div>
  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;">Imprimer / Enregistrer en PDF</button>
  </div>
</body>
</html>`);
    win.document.close();
}

function saveRecentAppointmentLocally(apt) {
    try {
        const key = 'hr_thies_recent_appointments';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = existing.filter(item => item.trackingCode !== apt.trackingCode);
        filtered.unshift({
            trackingCode: apt.trackingCode,
            name: apt.name,
            specialty: apt.specialty,
            date: apt.date,
            timeSlot: apt.timeSlot,
            status: apt.status,
            createdAt: apt.createdAt
        });
        localStorage.setItem(key, JSON.stringify(filtered.slice(0, 8)));
    } catch {
        // Ignore storage errors
    }
}

function initAppointment() {
    const form = document.getElementById('appointmentForm');
    if (!form) return;

    const steps = document.querySelectorAll('.form-step');
    const stepperItems = document.querySelectorAll('.stepper .step');
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    const specialtyGrid = document.getElementById('specialtyGrid');
    const specialtyInput = document.getElementById('specialty');
    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const timeSlotInput = document.getElementById('timeSlot');
    const summaryBanner = document.getElementById('bookingSummaryBanner');

    let currentStep = 1;
    let lastConfirmedApt = null;

    function selectSpecialtyCard(specId) {
        document.querySelectorAll('.specialty-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.value === specId);
        });
        specialtyInput.value = specId;
        const step1NextBtn = document.querySelector('.form-step[data-step="1"] .btn-next');
        if (step1NextBtn) step1NextBtn.disabled = false;
        if (dateInput && dateInput.value) {
            generateTimeSlots(dateInput.value);
        }
    }

    // 1. Générer toutes les cartes de spécialités
    if (specialtyGrid) {
        specialtyGrid.innerHTML = '';
        BOOKING_SPECIALTIES.forEach(spec => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'specialty-card';
            card.dataset.value = spec.id;
            card.setAttribute('aria-label', spec.name);
            card.innerHTML = `<i class="fas ${spec.icon}"></i><p>${spec.shortName}</p>`;
            card.addEventListener('click', () => selectSpecialtyCard(spec.id));
            specialtyGrid.appendChild(card);
        });

        // Pré-sélection automatique si ?specialty=... dans l'URL
        const params = new URLSearchParams(window.location.search);
        const preselected = resolveSpecialtyFromQuery(params.get('specialty'));
        if (preselected) {
            selectSpecialtyCard(preselected);
        }
    }

    // 2. Datepicker & Créneaux intelligents (Samedi matin, Dimanche fermé hors urgences, heures passées filtrées)
    if (dateInput) {
        const todayStr = getLocalTodayStr();
        dateInput.setAttribute('min', todayStr);

        dateInput.addEventListener('change', (e) => {
            generateTimeSlots(e.target.value);
            validateStep2();
        });
    }

    async function generateTimeSlots(dateStr) {
        timeSlotsContainer.innerHTML = '<div class="time-slot-placeholder"><i class="fas fa-spinner fa-spin"></i> Vérification des disponibilités...</div>';
        timeSlotInput.value = '';
        validateStep2();

        if (!dateStr || !specialtyInput.value) {
            timeSlotsContainer.innerHTML = '<div class="time-slot-placeholder">Veuillez d’abord sélectionner une spécialité et une date.</div>';
            return;
        }

        const [y, m, d] = dateStr.split('-').map(Number);
        const selectedDateObj = new Date(y, m - 1, d);
        const dayOfWeek = selectedDateObj.getDay();

        // Dimanche (0) : consultations externes fermées (sauf Urgences 24/7)
        if (dayOfWeek === 0 && specialtyInput.value !== 'Urgences') {
            timeSlotsContainer.innerHTML = `
                <div class="time-slot-placeholder" style="border-left: 4px solid var(--accent-color); text-align: left;">
                    <strong><i class="fas fa-calendar-times"></i> Consultations fermées le dimanche</strong><br>
                    Les consultations programmées ont lieu du <strong>Lundi au Vendredi (8h-18h)</strong> et le <strong>Samedi matin (8h-12h)</strong>.<br>
                    En cas d'urgence médicale, nos Urgences vous accueillent <strong>24h/24 et 7j/7</strong> (Tél : <a href="tel:+221339521090" style="color:var(--primary-color);font-weight:600;">+221 33 952 10 90</a>).
                </div>
            `;
            return;
        }

        // Samedi (6) : 08h00 - 12h00 | Semaine : 08h00 - 17h00
        const times = dayOfWeek === 6 && specialtyInput.value !== 'Urgences'
            ? ['08:00', '09:00', '10:00', '11:00']
            : ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

        const clinicId = getClinicId();
        const bookedSlots = await fetchBookedSlotsForDate(clinicId, specialtyInput.value, dateStr);

        // Vérifier les heures déjà passées si la date choisie est aujourd'hui
        const isToday = dateStr === getLocalTodayStr();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        timeSlotsContainer.innerHTML = '';
        let availableCount = 0;

        times.forEach((time) => {
            const [hh, mm] = time.split(':').map(Number);
            const slotMinutes = hh * 60 + mm;
            const isPastToday = isToday && slotMinutes <= currentMinutes + 15;
            const isBooked = bookedSlots.includes(time);
            const isUnavailable = isBooked || isPastToday;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.textContent = time;

            if (isUnavailable) {
                btn.classList.add('unavailable');
                btn.disabled = true;
                btn.title = isBooked ? 'Créneau déjà réservé' : 'Horaire déjà dépassé aujourd’hui';
            } else {
                availableCount++;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    timeSlotInput.value = time;
                    validateStep2();
                });
            }
            timeSlotsContainer.appendChild(btn);
        });

        if (availableCount === 0) {
            timeSlotsContainer.insertAdjacentHTML(
                'beforeend',
                `<div class="time-slot-placeholder" style="margin-top:10px;">Tous les créneaux de cette journée sont complets ou dépassés. Veuillez choisir une autre date.</div>`
            );
        }
    }

    function validateStep2() {
        const nextBtn = document.querySelector('.form-step[data-step="2"] .btn-next');
        if (nextBtn) {
            nextBtn.disabled = !(dateInput.value && timeSlotInput.value);
        }
    }

    function updateSummaryBanner() {
        if (!summaryBanner) return;
        if (specialtyInput.value && dateInput.value && timeSlotInput.value) {
            summaryBanner.style.display = 'flex';
            summaryBanner.innerHTML = `
                <div>
                    <span style="font-size:0.8rem;opacity:0.8;display:block;">Récapitulatif de votre choix</span>
                    <strong><i class="fas fa-stethoscope"></i> ${escapeHtml(specialtyInput.value)}</strong> •
                    <span><i class="far fa-calendar-alt"></i> ${escapeHtml(formatFrenchDate(dateInput.value))} à <strong>${escapeHtml(timeSlotInput.value)}</strong></span>
                </div>
            `;
        } else {
            summaryBanner.style.display = 'none';
        }
    }

    function updateSteps() {
        steps.forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step, 10) === currentStep);
        });

        stepperItems.forEach(item => {
            const itemStep = parseInt(item.dataset.step, 10);
            if (itemStep === currentStep) {
                item.classList.add('active');
                item.classList.remove('completed');
            } else if (itemStep < currentStep) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else {
                item.classList.remove('active', 'completed');
            }
        });

        if (currentStep === 3) {
            updateSummaryBanner();
        }
    }

    btnNext.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < 3) {
                currentStep++;
                updateSteps();
            }
        });
    });

    btnPrev.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateSteps();
            }
        });
    });

    // 3. Soumission du formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!name || name.length < 2) {
            alert('Veuillez saisir votre nom complet.');
            return;
        }

        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            alert('Veuillez saisir un numéro de téléphone valide (ex: 77 123 45 67 ou +221 77 123 45 67).');
            return;
        }

        if (!specialtyInput.value || !dateInput.value || !timeSlotInput.value) {
            alert('Veuillez choisir une spécialité, une date et un créneau horaire.');
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

        // Code lisible sans ambiguïté (pas de 0/O ni 1/I)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let trackingCode = 'RDV-';
        for (let i = 0; i < 6; i++) {
            trackingCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        try {
            const clinicId = getClinicId();
            // Vérification finale anti-double réservation si en ligne
            if (navigator.onLine) {
                const latestBooked = await fetchBookedSlotsForDate(clinicId, specialtyInput.value, dateInput.value);
                if (latestBooked.includes(timeSlotInput.value)) {
                    alert('Désolé, ce créneau vient tout juste d’être réservé par un autre patient. Veuillez choisir une autre heure.');
                    currentStep = 2;
                    updateSteps();
                    await generateTimeSlots(dateInput.value);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    return;
                }
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.name = name;
            data.phone = phone;
            data.email = email;
            data.status = 'En attente';
            data.createdAt = new Date().toISOString();
            data.trackingCode = trackingCode;
            data.clinicId = clinicId;

            // 1. Sauvegarde locale instantanée (garantie zéro perte même sans réseau)
            lastConfirmedApt = data;
            saveRecentAppointmentLocally(data);

            // 2. Sauvegarde Firestore dans le Cloud
            try {
                await Promise.race([
                    setDoc(doc(db, 'appointments', trackingCode), data),
                    new Promise(resolve => setTimeout(resolve, 2500))
                ]);
            } catch (fsErr) {
                console.warn('Note: sauvegarde locale active, synchronisation nuage différée:', fsErr);
            }

            // 3. Réservation de créneau sécurisée en tâche de fond (ne bloque jamais la confirmation)
            reserveBookedSlot({
                clinicId,
                specialty: data.specialty,
                date: data.date,
                timeSlot: data.timeSlot,
                appointmentId: trackingCode
            }).catch(e => console.warn('Note réservation créneau:', e));

            // Envoi d'email de confirmation si renseigné et connecté
            if (email !== '' && navigator.onLine) {
                emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.templateId,
                    {
                        to_name: data.name,
                        to_email: email,
                        email: email,
                        recipient: email,
                        patient_email: email,
                        specialty: data.specialty,
                        date: data.date,
                        time: data.timeSlot,
                        tracking_code: trackingCode,
                        reply_to: "contact@hopital-regional-thies.sn"
                    },
                    EMAILJS_CONFIG.publicKey
                ).catch(err => console.warn('EmailJS warning:', err));
            }

            // Afficher l'écran de succès (Étape 4)
            currentStep = 4;
            updateSteps();

            const stepper = document.querySelector('.stepper');
            if (stepper) stepper.style.display = 'none';

            const trackingCodeDisplay = document.getElementById('trackingCodeDisplay');
            if (trackingCodeDisplay) trackingCodeDisplay.textContent = trackingCode;

            const directTrackLink = document.getElementById('directTrackLink');
            if (directTrackLink) directTrackLink.href = `suivi.html?code=${encodeURIComponent(trackingCode)}`;

            const confirmedSummaryText = document.getElementById('confirmedSummaryText');
            if (confirmedSummaryText) {
                confirmedSummaryText.innerHTML = `<strong>${escapeHtml(data.specialty)}</strong> — ${escapeHtml(formatFrenchDate(data.date))} à <strong>${escapeHtml(data.timeSlot)}</strong>`;
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Une erreur est survenue lors de l’enregistrement. Veuillez réessayer.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Actions de l'écran de succès : Copier le code & Imprimer le reçu
    const copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const code = document.getElementById('trackingCodeDisplay')?.textContent?.trim();
            if (!code) return;
            try {
                await navigator.clipboard.writeText(code);
                const prev = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Code copié !';
                setTimeout(() => { copyBtn.innerHTML = prev; }, 2200);
            } catch {
                alert(`Votre code de suivi : ${code}`);
            }
        });
    }

    const printBtn = document.getElementById('printReceiptBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (lastConfirmedApt) printAppointmentReceipt(lastConfirmedApt);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppointment);
} else {
    initAppointment();
}
