import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, releaseBookedSlot, escapeHtml } from './lib/firebase';

function printTrackingSlip(apt, code) {
    const win = window.open('', '_blank', 'width=720,height=780');
    if (!win) {
        window.print();
        return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Suivi Rendez-vous ${escapeHtml(code)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 36px; max-width: 640px; margin: 0 auto; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
  .hospital { font-size: 18px; font-weight: 700; color: #1e40af; }
  .code-box { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
  .code { font-size: 26px; font-weight: 800; color: #1d4ed8; letter-spacing: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
  .val { font-size: 15px; font-weight: 600; margin-top: 4px; }
</style>
</head>
<body onload="window.print()">
  <div class="header">
    <div class="hospital">Hôpital Régional El Hadji Ahmadou Sakhir Ndiéguène de Thiès</div>
    <div style="font-size:13px;color:#475569;">Avenue Caen, Route de Dakar, Thiès • Tél : +221 33 952 10 90</div>
  </div>
  <div class="code-box">
    <div style="font-size:12px;color:#475569;">CODE DE SUIVI</div>
    <div class="code">${escapeHtml(code)}</div>
    <div style="margin-top:6px;font-weight:700;">Statut : ${escapeHtml(apt.status || 'En attente')}</div>
  </div>
  <div class="grid">
    <div class="cell"><div class="label">Patient(e)</div><div class="val">${escapeHtml(apt.name)}</div></div>
    <div class="cell"><div class="label">Spécialité</div><div class="val">${escapeHtml(apt.specialty)}</div></div>
    <div class="cell"><div class="label">Date prévue</div><div class="val">${escapeHtml(apt.date)}</div></div>
    <div class="cell"><div class="label">Heure</div><div class="val">${escapeHtml(apt.timeSlot || 'À préciser')}</div></div>
  </div>
</body>
</html>`);
    win.document.close();
}

function initSuivi() {
    const form = document.getElementById('trackingForm');
    const resultDiv = document.getElementById('trackingResult');
    const codeInput = document.getElementById('trackingCode');
    const recentContainer = document.getElementById('recentCodesContainer');

    if (!form || !resultDiv || !codeInput) return;

    // Afficher les codes récents mémorisés sur cet appareil (fonctionne même hors-ligne)
    function renderRecentCodes() {
        if (!recentContainer) return;
        try {
            const recent = JSON.parse(localStorage.getItem('hr_thies_recent_appointments') || '[]');
            if (!Array.isArray(recent) || recent.length === 0) {
                recentContainer.style.display = 'none';
                return;
            }
            recentContainer.style.display = 'block';
            recentContainer.innerHTML = `
                <p style="font-size:0.82rem;color:var(--text-light);margin-bottom:8px;">
                    <i class="fas fa-history"></i> Vos rendez-vous récents sur cet appareil :
                </p>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${recent.map(item => `
                        <button type="button" class="recent-code-chip" data-code="${escapeHtml(item.trackingCode)}"
                            style="background:rgba(37,99,235,0.1);color:var(--primary-color);border:1px solid rgba(37,99,235,0.3);padding:6px 12px;border-radius:20px;font-size:0.82rem;font-weight:600;cursor:pointer;">
                            ${escapeHtml(item.trackingCode)} (${escapeHtml(item.specialty || '')})
                        </button>
                    `).join('')}
                </div>
            `;
            recentContainer.querySelectorAll('.recent-code-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    codeInput.value = btn.getAttribute('data-code') || '';
                    lookupAppointment(codeInput.value);
                });
            });
        } catch {
            recentContainer.style.display = 'none';
        }
    }

    async function lookupAppointment(rawCode) {
        const code = (rawCode || '').trim().toUpperCase();
        if (!code) return;
        codeInput.value = code;

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recherche...';
        resultDiv.style.display = 'none';

        try {
            const docRef = doc(db, 'appointments', code);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="background: rgba(245, 158, 11, 0.12); color: #d97706; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                        Aucun rendez-vous trouvé pour le code <strong>${escapeHtml(code)}</strong>. Vérifiez l’orthographe (ex: <code>RDV-XXXXXX</code>).
                    </div>
                `;
            } else {
                const aptData = docSnap.data();
                const docId = docSnap.id;

                let statusColor = '#0284c7';
                let statusIcon = 'fa-clock';

                if (aptData.status === 'Confirmé') {
                    statusColor = '#16a34a';
                    statusIcon = 'fa-check-circle';
                } else if (aptData.status === 'Terminé') {
                    statusColor = '#0d9488';
                    statusIcon = 'fa-check-double';
                } else if (aptData.status === 'Annulé') {
                    statusColor = '#dc2626';
                    statusIcon = 'fa-times-circle';
                }

                const canCancel = aptData.status !== 'Annulé' && aptData.status !== 'Terminé';

                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <h3 style="color: var(--primary-color); margin-bottom: 18px; font-size: 1.3rem;">Détails de votre rendez-vous</h3>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: rgba(37, 99, 235, 0.08); padding: 14px 16px; border-radius: 12px; margin-bottom: 16px;">
                        <span style="font-weight: 600; color: var(--text-color);">Code : <code style="color:var(--primary-color);">${escapeHtml(docId)}</code></span>
                        <span style="background: ${statusColor}; color: white; padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: 0.88rem;">
                            <i class="fas ${statusIcon}"></i> ${escapeHtml(aptData.status || 'En attente')}
                        </span>
                    </div>
                    
                    <div class="tracking-details-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
                        <div style="background: var(--light-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <p style="color: var(--text-light); font-size: 0.82rem; margin-bottom: 4px;">Patient(e)</p>
                            <p style="font-weight: 600; color: var(--text-color); margin: 0;"><i class="fas fa-user" style="color: var(--primary-color); margin-right: 8px;"></i>${escapeHtml(aptData.name)}</p>
                        </div>
                        <div style="background: var(--light-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <p style="color: var(--text-light); font-size: 0.82rem; margin-bottom: 4px;">Spécialité</p>
                            <p style="font-weight: 600; color: var(--text-color); margin: 0;"><i class="fas fa-stethoscope" style="color: var(--primary-color); margin-right: 8px;"></i>${escapeHtml(aptData.specialty)}</p>
                        </div>
                        <div style="background: var(--light-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: var(--text-light); font-size: 0.82rem; margin-bottom: 4px;">Date & Heure prévues</p>
                                <p style="font-weight: 700; color: var(--primary-color); font-size: 1.15rem; margin: 0;">
                                    <i class="far fa-calendar-alt" style="margin-right: 8px;"></i>${escapeHtml(aptData.date)} à ${escapeHtml(aptData.timeSlot || 'Non définie')}
                                </p>
                            </div>
                            ${aptData.status === 'Confirmé' ? '<i class="fas fa-check-double" style="font-size: 1.8rem; color: #16a34a; opacity: 0.35;"></i>' : ''}
                        </div>
                    </div>

                    <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 12px;">
                        <button type="button" id="printSlipBtn" style="flex: 1; min-width: 180px; background: var(--primary-color); color: white; border: none; padding: 12px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                            <i class="fas fa-print"></i> Imprimer ma fiche
                        </button>
                        ${canCancel ? `
                        <button type="button" id="cancelRdvBtn" data-id="${escapeHtml(docId)}" style="flex: 1; min-width: 180px; background-color: #dc2626; color: white; border: none; padding: 12px 18px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                            <i class="fas fa-times-circle"></i> Annuler ce RDV
                        </button>` : ''}
                    </div>
                `;

                const printSlipBtn = document.getElementById('printSlipBtn');
                if (printSlipBtn) {
                    printSlipBtn.addEventListener('click', () => printTrackingSlip(aptData, docId));
                }

                const cancelBtn = document.getElementById('cancelRdvBtn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', async () => {
                        if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ? Le créneau sera libéré pour un autre patient.')) {
                            return;
                        }
                        cancelBtn.disabled = true;
                        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Annulation...';
                        try {
                            await Promise.all([
                                updateDoc(doc(db, 'appointments', docId), { status: 'Annulé' }),
                                releaseBookedSlot({
                                    clinicId: aptData.clinicId,
                                    specialty: aptData.specialty,
                                    date: aptData.date,
                                    timeSlot: aptData.timeSlot,
                                    appointmentId: docId
                                })
                            ]);
                            await lookupAppointment(docId);
                        } catch (error) {
                            console.error('Error cancelling:', error);
                            alert("Impossible d'annuler pour le moment. Vérifiez votre connexion internet ou appelez le +221 33 952 10 90.");
                            cancelBtn.disabled = false;
                            cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> Annuler ce RDV';
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Erreur lors de la recherche du code :", error);
            resultDiv.style.display = 'block';
            if (!navigator.onLine) {
                // Tentative de lecture dans le cache local de l'appareil
                let localMatch = null;
                try {
                    const recent = JSON.parse(localStorage.getItem('hr_thies_recent_appointments') || '[]');
                    localMatch = recent.find(r => r.trackingCode === code);
                } catch { /* ignore */ }

                if (localMatch) {
                    resultDiv.innerHTML = `
                        <div style="background: rgba(37, 99, 235, 0.1); padding: 16px; border-radius: 12px; border-left: 4px solid var(--primary-color);">
                            <p style="font-weight:700;color:var(--primary-color);margin-bottom:8px;"><i class="fas fa-wifi-slash"></i> Mode Hors-ligne (Copie locale)</p>
                            <p style="margin:4px 0;"><strong>Patient :</strong> ${escapeHtml(localMatch.name)}</p>
                            <p style="margin:4px 0;"><strong>Spécialité :</strong> ${escapeHtml(localMatch.specialty)}</p>
                            <p style="margin:4px 0;"><strong>Créneau :</strong> ${escapeHtml(localMatch.date)} à ${escapeHtml(localMatch.timeSlot)}</p>
                            <p style="font-size:0.82rem;color:var(--text-light);margin-top:8px;">Reconnectez-vous à Internet pour actualiser le statut auprès du médecin.</p>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div style="background: rgba(245, 158, 11, 0.12); color: #d97706; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                            <i class="fas fa-wifi" style="margin-right: 8px;"></i>
                            Vous êtes actuellement hors-ligne. Reconnectez-vous pour consulter ce code de suivi.
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
                    <div style="background: rgba(220, 38, 38, 0.1); color: #dc2626; padding: 16px; border-radius: 12px; border-left: 4px solid #dc2626;">
                        <i class="fas fa-times-circle" style="margin-right: 8px;"></i>
                        Une erreur temporaire est survenue lors de la vérification. Veuillez réessayer.
                    </div>
                `;
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        lookupAppointment(codeInput.value);
    });

    renderRecentCodes();

    // Lecture automatique du paramètre ?code=RDV-XXXXXX
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    if (urlCode) {
        lookupAppointment(urlCode);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSuivi);
} else {
    initSuivi();
}
