// SVG Icons for medical specialties not included in FontAwesome Free
export function applySpecialtyIcons() {
  const specialtyIcons = {
    kidney: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 4c-3.5 0-6 3.2-6 7.5S5.8 19 9.2 19c2.2 0 3.5-1.5 3.8-3.3.2-1.2-.5-2.2-1.3-2.7.8-.5 1.5-1.5 1.3-2.7C12.7 8.5 11.2 4 9 4z"/>
      <path d="M12.5 11.5h4.5c1.5 0 2.5 1 2.5 2.5V20"/>
      <path d="M12.5 14.5H15c1.2 0 2 .8 2 2v3.5"/>
    </svg>`,
    stomach: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 3v4c0 1.5-1.5 2.5-3 3.5C4.5 12 4 15 5.5 17.5 7 20 10.5 21 14 20c3.5-1 5.5-4 5-7.5-.4-2.8-2.5-4.5-5-4.5-1.5 0-2.5.8-3 2"/>
      <path d="M14 20v2"/>
    </svg>`,
    liver: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 11c0-4 3.5-6 8.5-6 5.5 0 7.5 2 7.5 4.5 0 3.5-4.5 6.5-10 8.5-3.5 1.3-6 .5-6-3v-4z"/>
      <path d="M12 5v8"/>
    </svg>`,
    kidneys: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7.5 5C5 5 3 7.5 3 11s2 6 4.5 6c1.6 0 2.5-1.2 2.5-2.5 0-1-.6-1.8-1.2-2.5.6-.7 1.2-1.5 1.2-2.5C10 6.2 9.1 5 7.5 5z"/>
      <path d="M16.5 5C19 5 21 7.5 21 11s-2 6-4.5 6c-1.6 0-2.5-1.2-2.5-2.5 0-1 .6-1.8 1.2-2.5-.6-.7-1.2-1.5-1.2-2.5 0-3.3.9-4.5 2.5-4.5z"/>
      <path d="M10 12h4M12 12v8"/>
    </svg>`,
    ear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 10a6 6 0 1 1 11.2 3c-1.2 2-2.2 3.2-2.5 5A2.7 2.7 0 0 1 12 20.5a2.5 2.5 0 0 1-2.5-2.5"/>
      <path d="M9.5 10a2.5 2.5 0 1 1 4.5 1.5c-.7 1-1.5 1.5-1.5 2.8"/>
    </svg>`
  };

  const serviceCards = document.querySelectorAll('.service-card .service-icon');
  serviceCards.forEach(iconContainer => {
    const iconElement = iconContainer.querySelector('i');
    if (!iconElement) return;

    const iconClasses = Array.from(iconElement.classList);
    let iconName = '';
    for (const cls of iconClasses) {
      if (cls.startsWith('fa-') && cls !== 'fas') {
        iconName = cls.replace('fa-', '');
        break;
      }
    }

    if (iconName && specialtyIcons[iconName]) {
      iconContainer.innerHTML = specialtyIcons[iconName];
      iconContainer.style.color = 'var(--primary-color)';
      iconContainer.style.display = 'flex';
      iconContainer.style.justifyContent = 'center';
    }
  });
}

if (typeof window !== 'undefined') {
  window.applySpecialtyIcons = applySpecialtyIcons;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applySpecialtyIcons);
} else {
  applySpecialtyIcons();
}
