import configData from './config.js';
import { applySpecialtyIcons } from './specialties-icons.js';

function initSpecialtiesPage() {
  const specialtiesContainer = document.getElementById('specialties-grid');
  if (!specialtiesContainer) return;

  const list = (configData && configData.specialties) || (window.config && window.config.specialties) || [];

  function renderCards(filterText = '') {
    specialtiesContainer.innerHTML = '';
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? list.filter(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q))
      : list;

    if (filtered.length === 0) {
      specialtiesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-light);">
          Aucune spécialité trouvée pour « ${filterText.replace(/[<>&"']/g, '')} ».
        </div>
      `;
      return;
    }

    filtered.forEach(specialty => {
      const card = document.createElement('div');
      card.classList.add('service-card');
      card.id = specialty.id;
      const bookingTarget = encodeURIComponent(specialty.bookingId || specialty.name);

      card.innerHTML = `
        <div class="service-icon">
          <i class="fas fa-${specialty.icon}"></i>
        </div>
        <h3>${specialty.name}</h3>
        <p style="margin-bottom: 20px; color: var(--text-light); font-size: 0.95rem;">
          ${specialty.description || 'Consultations, diagnostics et traitements personnalisés pour répondre aux besoins spécifiques de chaque patient.'}
        </p>
        <a href="appointment.html?specialty=${bookingTarget}" class="btn" style="padding: 8px 20px; font-size: 0.9rem;">
          Prendre RDV <i class="fas fa-calendar-check"></i>
        </a>
      `;

      specialtiesContainer.appendChild(card);
    });

    applySpecialtyIcons();
  }

  renderCards();

  const searchInput = document.getElementById('specialtySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderCards(e.target.value);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSpecialtiesPage);
} else {
  initSpecialtiesPage();
}
