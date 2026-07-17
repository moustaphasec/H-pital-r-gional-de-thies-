import { GoogleGenerativeAI } from '@google/generative-ai';
const geminiApiKey = atob("QVEuQWI4Uk42TFNjbmpjX1Bla1BENnoycThHRWxKamNRa1EzX09mMHhJSU4yQ2V1Rld6OHc=");
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

function initApp() {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            
            // Create close button if it doesn't exist
            if (!document.querySelector('.close-menu')) {
                const closeMenu = document.createElement('div');
                closeMenu.classList.add('close-menu');
                closeMenu.innerHTML = '<i class="fas fa-times"></i>';
                navLinks.prepend(closeMenu);
                
                closeMenu.addEventListener('click', function() {
                    navLinks.classList.remove('active');
                });
            }
        });
    }
    
    // Close menu when clicking a link on mobile
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 991) {
                navLinks.classList.remove('active');
            }
        });
    });
    
    // Hero Slider
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prev = document.querySelector('.slider-nav .prev');
    const next = document.querySelector('.slider-nav .next');
    
    let currentSlide = 0;
    const slideInterval = 5000; // 5 seconds between slides
    let slideTimer;
    
    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Make sure index is valid
        if (slides.length === 0 || index >= slides.length) return;
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentSlide = index;
    }
    
    function nextSlide() {
        // Check if slides exist
        if (slides.length === 0) return;
        
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    function prevSlide() {
        // Check if slides exist
        if (slides.length === 0) return;
        
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    }
    
    // Initialize slider
    showSlide(0);
    
    // Start automatic slideshow
    function startSlideTimer() {
        slideTimer = setInterval(nextSlide, slideInterval);
    }
    
    function resetSlideTimer() {
        clearInterval(slideTimer);
        startSlideTimer();
    }
    
    startSlideTimer();
    
    // Event listeners
    if (prev && next) {
        prev.addEventListener('click', function() {
            prevSlide();
            resetSlideTimer();
        });
        
        next.addEventListener('click', function() {
            nextSlide();
            resetSlideTimer();
        });
    }
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            showSlide(index);
            resetSlideTimer();
        });
    });
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
    
    // Testimonial Slider
    const testimonials = document.querySelectorAll('.testimonial');
    const testimonialDots = document.querySelectorAll('.testimonial-dots .dot');
    
    let currentTestimonial = 0;
    const testimonialInterval = 6000; // 6 seconds between testimonials
    let testimonialTimer;
    
    function showTestimonial(index) {
        if (testimonials.length === 0) return; // Check if testimonials exist
        
        testimonials.forEach(testimonial => testimonial.classList.remove('active'));
        testimonialDots.forEach(dot => dot.classList.remove('active'));
        
        testimonials[index].classList.add('active');
        testimonialDots[index].classList.add('active');
        
        currentTestimonial = index;
    }
    
    function nextTestimonial() {
        if (testimonials.length === 0) return; // Check if testimonials exist
        
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    }
    
    // Initialize testimonial slider
    if (testimonials.length > 0) {
        showTestimonial(0);
        
        // Start automatic testimonial slideshow
        function startTestimonialTimer() {
            testimonialTimer = setInterval(nextTestimonial, testimonialInterval);
        }
        
        function resetTestimonialTimer() {
            clearInterval(testimonialTimer);
            startTestimonialTimer();
        }
        
        startTestimonialTimer();
        
        // Event listeners for testimonial dots
        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                showTestimonial(index);
                resetTestimonialTimer();
            });
        });
    }
    
    // Back to top button
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (backToTopButton) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('active');
            } else {
                backToTopButton.classList.remove('active');
            }
        });
        
        backToTopButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // Update active navigation link based on current page
    const currentPage = window.location.pathname.split("/").pop();
    const navLinksList = document.querySelectorAll('.nav-links a');
    
    navLinksList.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (currentPage === linkPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Scroll Reveal with IntersectionObserver (Futuristic)
    const revealElements = document.querySelectorAll('.service-card, .doctor-card, .stat, .speciality-content, .emergency-card, .glass-panel, h2, h3, .contact-form, .appointment-form, .appointment-info img');
    
    // Setup the CSS classes
    revealElements.forEach(el => {
        el.classList.add('reveal');
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                // Optional: remove class when out of view to re-animate when scrolling back up
                entry.target.classList.remove('active');
            }
        });
    }, {
        root: null,
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
    
    // Form submission
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate form submission
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.disabled = true;
            submitButton.textContent = 'Envoi en cours...';
            
            // Simulate network request
            setTimeout(() => {
                alert('Votre message a été envoyé avec succès !');
                contactForm.reset();
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }, 1500);
        });
    }
    
    // Count up animation for stats
    const stats = document.querySelectorAll('.stat .count');
    
    function startCounters() {
        stats.forEach(stat => {
            const target = parseInt(stat.textContent);
            let count = 0;
            const duration = 2000; // 2 seconds
            const frameDuration = 1000 / 60; // 60fps
            const totalFrames = Math.round(duration / frameDuration);
            const increment = target / totalFrames;
            
            const counter = setInterval(() => {
                count += increment;
                if (count >= target) {
                    stat.textContent = target;
                    clearInterval(counter);
                } else {
                    stat.textContent = Math.floor(count);
                }
            }, frameDuration);
        });
    }
    
    // Initialize counters when visible
    const aboutSection = document.querySelector('.about');
    
    const handleScroll = function() {
        if (aboutSection && aboutSection.getBoundingClientRect().top < window.innerHeight - 100) {
            startCounters();
            // Remove event listener after counters start
            window.removeEventListener('scroll', handleScroll);
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Check if about section is visible on page load
    if (aboutSection && aboutSection.getBoundingClientRect().top < window.innerHeight - 100) {
        startCounters();
    }

    // Secret Access: Triple Click for Admin, Quadruple Click for Doctor
    const logo = document.querySelector('.logo');
    if (logo) {
        let clickCount = 0;
        let clickTimer;
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            clickCount++;
            if (clickCount === 3) {
                window.location.href = 'admin.html';
            } else if (clickCount === 5) {
                window.location.href = 'doctor.html';
            }
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 600);
        });
    }

    // Holo-Assistant Chatbot Widget
    if (!document.getElementById('holo-assistant')) {
        const chatbotHTML = `
        <div id="holo-assistant" class="chatbot-container">
            <div class="chatbot-toggle">
                <i class="fas fa-robot"></i>
                <span class="chatbot-pulse"></span>
            </div>
            <div class="chatbot-window">
                <div class="chatbot-header">
                    <h4>Holo-Assistant</h4>
                    <button class="chatbot-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="chatbot-messages">
                    <div class="msg ai">Bonjour ! Je suis l'assistant médical virtuel. Comment puis-je vous aider ?</div>
                </div>
                <div class="chatbot-input">
                    <input type="text" placeholder="Posez une question..." />
                    <button><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
        
        const toggleBtn = document.querySelector('.chatbot-toggle');
        const closeBtn = document.querySelector('.chatbot-close');
        const chatWindow = document.querySelector('.chatbot-window');
        const inputField = document.querySelector('.chatbot-input input');
        const sendBtn = document.querySelector('.chatbot-input button');
        const messagesDiv = document.querySelector('.chatbot-messages');
        
        toggleBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('active');
            toggleBtn.style.display = 'none';
        });
        closeBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
            toggleBtn.style.display = 'flex';
        });
        
        sendBtn.addEventListener('click', async () => {
            const text = inputField.value.trim();
            if(text) {
                messagesDiv.innerHTML += `<div class="msg user">${text}</div>`;
                inputField.value = '';
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                const typingId = 'typing-' + Date.now();
                messagesDiv.innerHTML += `<div class="msg ai" id="${typingId}">Analyse en cours... <i class="fas fa-spinner fa-spin"></i></div>`;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                try {
                    if(!geminiApiKey) {
                        document.getElementById(typingId).innerHTML = "Système IA désactivé (Clé API manquante). Veuillez configurer VITE_GEMINI_API_KEY dans le fichier .env";
                        return;
                    }
                    
                    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
                    const prompt = `Tu es l'assistant médical virtuel de l'Hôpital Régional de Thiès au Sénégal. 
                    Ton rôle est d'accueillir les patients, de répondre à leurs questions sur l'hôpital et de les orienter vers le bon service (Cardiologie, Pédiatrie, Neurologie, etc.) en fonction de leurs symptômes. 
                    Sois bref, empathique et professionnel. Ne fais pas de diagnostic médical complet, dis-leur de consulter un médecin. 
                    Question du patient : ${text}`;
                    
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const reply = response.text();
                    
                    document.getElementById(typingId).innerHTML = reply.replace(/\n/g, '<br>');
                } catch (error) {
                    console.error("Gemini Error:", error);
                    document.getElementById(typingId).innerHTML = `Désolé, une erreur est survenue: ${error.message || error}`;
                }
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        });
        inputField.addEventListener('keypress', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
