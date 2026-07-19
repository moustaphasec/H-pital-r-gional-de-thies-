import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './lib/firebase';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('trackingForm');
    const resultDiv = document.getElementById('trackingResult');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const codeInput = document.getElementById('trackingCode');
        const code = codeInput.value.trim().toUpperCase();
        
        if (!code) return;

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recherche...';
        resultDiv.style.display = 'none';

        try {
            const q = query(collection(db, 'appointments'), where('trackingCode', '==', code),
                where('clinicId', '==', localStorage.getItem('healthsaas_clinic_id') || 'thies'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; border-left: 4px solid #ffeeba;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
                        Aucun rendez-vous trouvé pour le code <strong>${code}</strong>. Veuillez vérifier votre saisie.

                    </div>
                    ${(aptData.status !== 'AnnulǸ' && aptData.status !== 'TerminǸ' && aptData.status !== 'Annulé' && aptData.status !== 'Terminé') ? `
                    <div style="margin-top: 15px; text-align: center;">
                        <button id="cancelRdvBtn" data-id="${querySnapshot.docs[0].id}" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%;">
                            <i class="fas fa-times-circle"></i> Annuler mon rendez-vous
                        </button>
                    </div>` : ''}
                `;

                // Add event listener for cancel button
                setTimeout(() => {
                    const cancelBtn = document.getElementById('cancelRdvBtn');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', async () => {
                            if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
                                cancelBtn.disabled = true;
                                cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Annulation en cours...';
                                try {
                                    await updateDoc(doc(db, 'appointments', cancelBtn.getAttribute('data-id')), {
                                        status: 'Annulé'
                                    });
                                    alert('Votre rendez-vous a bien été annulé.');
                                    // Trigger form submit to reload data
                                    form.dispatchEvent(new Event('submit'));
                                } catch (error) {
                                    console.error('Error cancelling:', error);
                                    alert('Une erreur est survenue lors de l\'annulation.');
                                    cancelBtn.disabled = false;
                                }
                            }
                        });
                    }
                }, 100);

            } else {
                // Il devrait y en avoir qu'un seul
                const aptData = querySnapshot.docs[0].data();
                
                let statusColor = '#17a2b8'; // En attente
                let statusIcon = 'fa-clock';
                
                if (aptData.status === 'Confirmé') {
                    statusColor = '#28a745';
                    statusIcon = 'fa-check-circle';
                } else if (aptData.status === 'Annulé') {
                    statusColor = '#dc3545';
                    statusIcon = 'fa-times-circle';
                }
                
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <h3 style="color: var(--primary-color); margin-bottom: 20px;">Détails de votre rendez-vous</h3>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.03); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <span style="font-weight: 500;">Statut :</span>
                        <span style="background: ${statusColor}; color: white; padding: 5px 12px; border-radius: 20px; font-weight: 600; font-size: 0.9rem;">
                            <i class="fas ${statusIcon}"></i> ${aptData.status}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                            <p style="color: #777; font-size: 0.85rem; margin-bottom: 5px;">Patient</p>
                            <p style="font-weight: 600; color: var(--dark-color); margin: 0;"><i class="fas fa-user" style="color: var(--primary-color); margin-right: 8px;"></i>${aptData.name}</p>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                            <p style="color: #777; font-size: 0.85rem; margin-bottom: 5px;">Spécialité</p>
                            <p style="font-weight: 600; color: var(--dark-color); margin: 0;"><i class="fas fa-stethoscope" style="color: var(--primary-color); margin-right: 8px;"></i>${aptData.specialty}</p>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="color: #777; font-size: 0.85rem; margin-bottom: 5px;">Date & Heure prévues</p>
                                <p style="font-weight: 600; color: var(--primary-color); font-size: 1.2rem; margin: 0;">
                                    <i class="far fa-calendar-alt" style="margin-right: 8px;"></i>${aptData.date} à ${aptData.timeSlot || 'Non définie'}
                                </p>
                            </div>
                            ${aptData.status === 'Confirmé' ? '<i class="fas fa-check-double" style="font-size: 2rem; color: #28a745; opacity: 0.2;"></i>' : ''}
                        </div>

                    </div>
                    ${(aptData.status !== 'AnnulǸ' && aptData.status !== 'TerminǸ' && aptData.status !== 'Annulé' && aptData.status !== 'Terminé') ? `
                    <div style="margin-top: 15px; text-align: center;">
                        <button id="cancelRdvBtn" data-id="${querySnapshot.docs[0].id}" style="background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%;">
                            <i class="fas fa-times-circle"></i> Annuler mon rendez-vous
                        </button>
                    </div>` : ''}
                `;

                // Add event listener for cancel button
                setTimeout(() => {
                    const cancelBtn = document.getElementById('cancelRdvBtn');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', async () => {
                            if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
                                cancelBtn.disabled = true;
                                cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Annulation en cours...';
                                try {
                                    await updateDoc(doc(db, 'appointments', cancelBtn.getAttribute('data-id')), {
                                        status: 'Annulé'
                                    });
                                    alert('Votre rendez-vous a bien été annulé.');
                                    // Trigger form submit to reload data
                                    form.dispatchEvent(new Event('submit'));
                                } catch (error) {
                                    console.error('Error cancelling:', error);
                                    alert('Une erreur est survenue lors de l\'annulation.');
                                    cancelBtn.disabled = false;
                                }
                            }
                        });
                    }
                }, 100);

            }
        } catch (error) {
            console.error("Erreur lors de la recherche du code :", error);
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; border-left: 4px solid #f5c6cb;">
                    <i class="fas fa-times-circle" style="margin-right: 10px;"></i>
                    Une erreur est survenue lors de la communication avec le serveur.
                </div>
            `;
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
