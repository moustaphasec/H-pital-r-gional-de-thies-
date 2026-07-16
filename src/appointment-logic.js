import { collection, addDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('appointmentForm');
    if (!form) return;

    // Éléments du DOM
    const steps = document.querySelectorAll('.form-step');
    const stepperItems = document.querySelectorAll('.stepper .step');
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    const specialtyGrid = document.getElementById('specialtyGrid');
    const specialtyInput = document.getElementById('specialty');
    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const timeSlotInput = document.getElementById('timeSlot');

    let currentStep = 1;

    // --- DONNÉES DES SPÉCIALITÉS ---
    const specialties = [
        { id: 'Cardiologie', name: 'Cardiologie', icon: 'fa-heartbeat' },
        { id: 'Néphrologie', name: 'Néphrologie et Dialyse', icon: 'fa-kidneys' },
        { id: 'Gynécologie', name: 'Gynécologie', icon: 'fa-baby' },
        { id: 'Pédiatrie', name: 'Pédiatrie', icon: 'fa-child' },
        { id: 'Chirurgie', name: 'Chirurgie', icon: 'fa-syringe' },
        { id: 'Ophtalmologie', name: 'Ophtalmologie', icon: 'fa-eye' },
        { id: 'Urgences', name: 'Urgences', icon: 'fa-ambulance' },
        { id: 'Autre', name: 'Autre', icon: 'fa-stethoscope' }
    ];

    // Générer les cartes de spécialités
    if (specialtyGrid) {
        specialties.forEach(spec => {
            const card = document.createElement('div');
            card.className = 'specialty-card';
            card.dataset.value = spec.id;
            card.innerHTML = `<i class="fas ${spec.icon}"></i><p>${spec.name}</p>`;
            
            card.addEventListener('click', () => {
                // Retirer la sélection précédente
                document.querySelectorAll('.specialty-card').forEach(c => c.classList.remove('selected'));
                // Ajouter la sélection
                card.classList.add('selected');
                specialtyInput.value = spec.id;
                
                // Activer le bouton suivant de l'étape 1
                const currentNextBtn = document.querySelector(`.form-step[data-step="1"] .btn-next`);
                if (currentNextBtn) currentNextBtn.disabled = false;
            });
            specialtyGrid.appendChild(card);
        });
    }

    // --- GESTION DU DATEPICKER ET DES CRÉNEAUX ---
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);

        dateInput.addEventListener('change', (e) => {
            const selectedDate = e.target.value;
            generateTimeSlots(selectedDate);
            validateStep2();
        });
    }

    function generateTimeSlots(dateStr) {
        timeSlotsContainer.innerHTML = '';
        timeSlotInput.value = '';
        validateStep2();

        if (!dateStr) {
            timeSlotsContainer.innerHTML = '<div class="time-slot-placeholder">Veuillez d\'abord sélectionner une date.</div>';
            return;
        }

        // Mock de créneaux (de 8h à 17h)
        const times = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        
        // Simuler des créneaux indisponibles aléatoirement (pour la démo)
        const seed = dateStr.charCodeAt(dateStr.length - 1); // pseudo-random basé sur la date

        if (times.length === 0) {
            timeSlotsContainer.innerHTML = '<div class="time-slot-placeholder">Aucun créneau disponible pour cette date.</div>';
            return;
        }

        times.forEach((time, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.textContent = time;
            
            // 1 chance sur 3 d'être indisponible, juste pour la démo
            const isUnavailable = (seed + index) % 3 === 0; 
            
            if (isUnavailable) {
                btn.classList.add('unavailable');
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    timeSlotInput.value = time;
                    validateStep2();
                });
            }
            timeSlotsContainer.appendChild(btn);
        });
    }

    function validateStep2() {
        const nextBtn = document.querySelector(`.form-step[data-step="2"] .btn-next`);
        if (nextBtn) {
            nextBtn.disabled = !(dateInput.value && timeSlotInput.value);
        }
    }

    // --- NAVIGATION MULTI-ÉTAPES ---
    function updateSteps() {
        // Mettre à jour les sections du formulaire
        steps.forEach(step => {
            if (parseInt(step.dataset.step) === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Mettre à jour les indicateurs en haut
        stepperItems.forEach(item => {
            const itemStep = parseInt(item.dataset.step);
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

    // --- SOUMISSION DU FORMULAIRE ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Vérification finale des champs requis
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        
        if (!name || !phone || !specialtyInput.value || !dateInput.value || !timeSlotInput.value) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';

        // --- GÉNÉRER UN CODE DE SUIVI ---
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let trackingCode = 'RDV-';
        for (let i = 0; i < 5; i++) {
            trackingCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.status = 'En attente';
            data.createdAt = new Date().toISOString();
            data.trackingCode = trackingCode;
            
            // Sauvegarde dans Firebase (Optimistic update pour éviter le blocage)
            addDoc(collection(db, 'appointments'), data).catch(err => {
                console.error("Erreur de synchronisation Firebase:", err);
            });
            
            // Afficher l'étape 4 de succès
            currentStep = 4;
            updateSteps();
            
            // Masquer le stepper car on a terminé
            const stepper = document.querySelector('.stepper');
            if (stepper) stepper.style.display = 'none';

            // Afficher le code de suivi
            const trackingCodeDisplay = document.getElementById('trackingCodeDisplay');
            if (trackingCodeDisplay) {
                trackingCodeDisplay.textContent = trackingCode;
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
