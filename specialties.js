document.addEventListener('DOMContentLoaded', function() {
    // Generate service cards for each specialty
    const specialtiesContainer = document.getElementById('specialties-grid');
    
    if (specialtiesContainer) {
        config.specialties.forEach(specialty => {
            const card = document.createElement('div');
            card.classList.add('service-card');
            
            card.innerHTML = `
                <div class="service-icon">
                    <i class="fas fa-${specialty.icon}"></i>
                </div>
                <h3>${specialty.name}</h3>
                <p>Consultations, diagnostics et traitements personnalisés pour répondre aux besoins spécifiques de chaque patient.</p>
            `;
            
            specialtiesContainer.appendChild(card);
        });
    }
    
    // Tab functionality 
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
});