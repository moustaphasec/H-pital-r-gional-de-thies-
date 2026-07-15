// SVG Icons for medical specialties
document.addEventListener('DOMContentLoaded', function() {
  // Add specialty icons to replace Font Awesome with custom SVGs
  function addSpecialtyIcons() {
    // Mapping of specialty icons to SVG content
    const specialtyIcons = {
      'kidney': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12,21c-3.3,0-7-1.9-7-7c0-4.3,3.7-10,7-10s7,5.7,7,10C19,19.1,15.3,21,12,21z"/>
        <path d="M12,21V11c0,0,4-1,4-4s-1-3-4-3C9,4,8,7,8,7s-1,1-1,4s3,4,5,0"/>
        <path d="M12,21c-3,0-4-2-4-4c0-4,4-8,4-8s4,4,4,8C16,19,15,21,12,21z"/>
      </svg>`,
      
      'stomach': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6,7C6,5.5,8,4,10,4c3,0,4,2,4,4c0,3,1,6,1,8c0,2-1,4-5,4s-5-2-5-4c0-2,1-4,1-6"/>
        <path d="M14,8c0,0,2-1,3-1c2,0,3,3,3,5c0,3-2,5-4,6"/>
        <path d="M6,7c0,0-1,0-2,1c-1,1-1,3-1,5c0,3,1,6,4,7"/>
      </svg>`,
      
      'liver': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8,5c0,0-3,1-3,5c0,4,0,6,2,8c2,2,5,2,7,2c3,0,5-1,6-3c1-2,1-4,1-6c0-4-3-4-5-3"/>
        <path d="M16,8c0,0,2-2,0-4c-2-2-5-1-6,0c-2,2-2,4-2,4"/>
        <path d="M12,15c0,0,1-1,3-1s3,2,1,3c-2,1-4-2-4-2"/>
      </svg>`,
      
      'kidneys': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8,7c0,0-3,2-3,5c0,3,2,5,4,5s3-2,3-4c0-2-1-3-1-3"/>
        <path d="M16,7c0,0,3,2,3,5c0,3-2,5-4,5s-3-2-3-4c0-2,1-3,1-3"/>
        <path d="M8,17v3"/>
        <path d="M16,17v3"/>
        <path d="M8,7V4"/>
        <path d="M16,7V4"/>
        <path d="M9,13c0,0,2,1,3,0c1-1,3,0,3,0"/>
      </svg>`,
      
      'ear': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10,6c-2.2,0-4,1.8-4,4v3c0,1.1,0.9,2,2,2s2-0.9,2-2v-1.5c0-0.8-0.7-1.5-1.5-1.5S7,10.7,7,11.5V14"/>
        <path d="M14,6c2.2,0,4,1.8,4,4c0,3-2,4-2,8c0,1.1-0.9,2-2,2h0c-1.1,0-2-0.9-2-2v-1"/>
        <path d="M17.8,4.2C16.1,2.5,14,1.5,12,1.5S7.9,2.5,6.2,4.2S3.5,8,3.5,10"/>
      </svg>`
    };
    
    // Find all service cards on page
    const serviceCards = document.querySelectorAll('.service-card .service-icon');
    
    serviceCards.forEach(iconContainer => {
      // Get the icon from the i element inside the container
      const iconElement = iconContainer.querySelector('i');
      if (!iconElement) return;
      
      // Extract the icon name from class
      const iconClasses = Array.from(iconElement.classList);
      let iconName = '';
      
      // Find the icon class (fa-something)
      for (const cls of iconClasses) {
        if (cls.startsWith('fa-') && cls !== 'fas') {
          iconName = cls.replace('fa-', '');
          break;
        }
      }
      
      // If we have a custom SVG for this icon
      if (iconName && specialtyIcons[iconName]) {
        // Replace the Font Awesome icon with our custom SVG
        iconElement.style.display = 'none';
        iconContainer.innerHTML = specialtyIcons[iconName];
        iconContainer.style.color = 'var(--primary-color)';
      }
    });
  }
  
  // Run the function
  addSpecialtyIcons();
});