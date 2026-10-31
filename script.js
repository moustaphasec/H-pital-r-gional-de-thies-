import { collection, addDoc } from 'firebase/firestore';
import { db, EMAILJS_CONFIG, getClinicId, escapeHtml } from './src/lib/firebase';
import { askMedicalAssistant } from './src/lib/medical-ai';
import emailjs from '@emailjs/browser';

// Appliquer le thème immédiatement pour éviter tout flash visuel
(function applySavedThemeImmediately() {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark-mode');
        }
    } catch {
        // Ignore storage errors in private mode
    }
})();

function initApp() {
    // 1. Mobile Menu Toggle + Backdrop Overlay
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        let overlay = document.querySelector('.mobile-nav-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-nav-overlay';
            document.body.appendChild(overlay);
        }

        const closeMobileMenu = () => {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        menuToggle.addEventListener('click', function () {
            const isOpen = navLinks.classList.toggle('active');
            overlay.classList.toggle('active', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';

            if (!navLinks.querySelector('.close-menu')) {
                const closeMenu = document.createElement('button');
                closeMenu.type = 'button';
                closeMenu.setAttribute('aria-label', 'Fermer le menu');
                closeMenu.classList.add('close-menu');
                closeMenu.innerHTML = '<i class="fas fa-times"></i>';
                navLinks.prepend(closeMenu);
                closeMenu.addEventListener('click', closeMobileMenu);
            }
        });

        overlay.addEventListener('click', closeMobileMenu);

        navLinks.querySelectorAll('a').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 991) closeMobileMenu();
            });
        });
    }

    // 2. Hero Slider (with touch swipe support on mobile)
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prev = document.querySelector('.slider-nav .prev');
    const next = document.querySelector('.slider-nav .next');

    if (slides.length > 0) {
        let currentSlide = 0;
        const slideInterval = 5500;
        let slideTimer;

        const showSlide = (index) => {
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            if (index >= slides.length) return;
            slides[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');
            currentSlide = index;
        };

        const nextSlide = () => showSlide((currentSlide + 1) % slides.length);
        const prevSlide = () => showSlide((currentSlide - 1 + slides.length) % slides.length);
        const startSlideTimer = () => { slideTimer = setInterval(nextSlide, slideInterval); };
        const resetSlideTimer = () => { clearInterval(slideTimer); startSlideTimer(); };

        showSlide(0);
        startSlideTimer();

        if (prev && next) {
            prev.addEventListener('click', () => { prevSlide(); resetSlideTimer(); });
            next.addEventListener('click', () => { nextSlide(); resetSlideTimer(); });
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => { showSlide(index); resetSlideTimer(); });
        });

        // Mobile swipe gesture
        const sliderEl = document.querySelector('.slider-container');
        if (sliderEl) {
            let touchStartX = 0;
            sliderEl.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            sliderEl.addEventListener('touchend', (e) => {
                const diff = e.changedTouches[0].screenX - touchStartX;
                if (Math.abs(diff) > 50) {
                    if (diff < 0) nextSlide();
                    else prevSlide();
                    resetSlideTimer();
                }
            }, { passive: true });
        }
    }

    // 3. Tab functionality (if present)
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            this.classList.add('active');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // 4. Testimonial Slider
    const testimonials = document.querySelectorAll('.testimonial');
    const testimonialDots = document.querySelectorAll('.testimonial-dots .dot');
    if (testimonials.length > 0) {
        let currentTestimonial = 0;
        let testimonialTimer;

        const showTestimonial = (index) => {
            testimonials.forEach(t => t.classList.remove('active'));
            testimonialDots.forEach(d => d.classList.remove('active'));
            testimonials[index].classList.add('active');
            if (testimonialDots[index]) testimonialDots[index].classList.add('active');
            currentTestimonial = index;
        };

        const startTestimonialTimer = () => {
            testimonialTimer = setInterval(() => {
                showTestimonial((currentTestimonial + 1) % testimonials.length);
            }, 6000);
        };

        showTestimonial(0);
        startTestimonialTimer();

        testimonialDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                showTestimonial(index);
                clearInterval(testimonialTimer);
                startTestimonialTimer();
            });
        });
    }

    // 5. Back to Top Button
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 350) {
                backToTopButton.classList.add('active');
            } else {
                backToTopButton.classList.remove('active');
            }
        }, { passive: true });

        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 6. Active Navigation Link Highlight
    const rawPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentPage = rawPage === '' ? 'index.html' : (rawPage.endsWith('.html') ? rawPage : `${rawPage}.html`);
    document.querySelectorAll('.nav-links a:not(.btn-rdv)').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (currentPage === linkPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 7. Safe Non-Destructive Scroll Reveal (never hides forms or already-revealed elements)
    if ('IntersectionObserver' in window) {
        const revealElements = document.querySelectorAll('.doctor-card:not([data-aos]), .emergency-card:not([data-aos])');
        revealElements.forEach(el => el.classList.add('reveal'));

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // 8. Contact Form Submission (Firestore + EmailJS + Offline Resilience + Inline Feedback)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            data.createdAt = new Date().toISOString();
            data.status = 'Nouveau';
            data.clinicId = getClinicId();

            try {
                await Promise.race([
                    addDoc(collection(db, 'contact_messages'), data).catch(e => console.warn('Note contact sync:', e)),
                    new Promise(resolve => setTimeout(resolve, 2500))
                ]);

                if (navigator.onLine) {
                    emailjs.send(
                        EMAILJS_CONFIG.serviceId,
                        EMAILJS_CONFIG.templateId,
                        {
                            to_name: "Administration - Hôpital Régional de Thiès",
                            to_email: "contact@hopital-regional-thies.sn",
                            reply_to: data.email || "contact@hopital-regional-thies.sn",
                            message: `Message de ${data.name} (Tél: ${data.phone}, Email: ${data.email || 'Non renseigné'}):\nSujet: ${data.subject}\n\n${data.message}`,
                            patient_email: data.email || ""
                        },
                        EMAILJS_CONFIG.publicKey
                    ).catch(err => console.warn('Notification email contact non envoyée:', err));
                }

                let feedback = contactForm.querySelector('.contact-success-banner');
                if (!feedback) {
                    feedback = document.createElement('div');
                    feedback.className = 'contact-success-banner';
                    feedback.style.cssText = 'margin-top:16px;padding:14px 18px;border-radius:12px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);color:#059669;font-weight:500;';
                    contactForm.appendChild(feedback);
                }
                feedback.innerHTML = '<i class="fas fa-check-circle"></i> Merci ! Votre message a bien été transmis à la direction de l’Hôpital Régional de Thiès.';
                contactForm.reset();
            } catch (err) {
                console.error("Erreur d'enregistrement du message:", err);
                alert("Une erreur est survenue lors de l'envoi. Vous pouvez nous joindre directement au +221 33 952 10 90.");
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }

    // 9. Unified Animated Counters (works with both data-target and inner text)
    const counters = document.querySelectorAll('.stat .count');
    if (counters.length > 0 && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target') || counter.textContent, 10);
                if (!target || isNaN(target)) return;

                const duration = 1800;
                const startTime = performance.now();

                const step = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    counter.textContent = Math.floor(eased * target);
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        counter.textContent = target;
                    }
                };
                requestAnimationFrame(step);
                observer.unobserve(counter);
            });
        }, { threshold: 0.35 });

        counters.forEach(c => counterObserver.observe(c));
    }

    // 10. Logo Navigation (Single click -> Accueil | Triple click -> Secret Admin)
    const logo = document.querySelector('header .logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        let clickCount = 0;
        let clickTimer;
        logo.addEventListener('click', (e) => {
            // Ne jamais intercepter le bouton de changement de thème
            if (e.target.closest('.theme-toggle-btn')) return;
            e.preventDefault();
            clickCount++;
            clearTimeout(clickTimer);

            if (clickCount === 3) {
                clickCount = 0;
                window.location.href = 'admin.html';
                return;
            }

            clickTimer = setTimeout(() => {
                if (clickCount === 1 && currentPage !== 'index.html') {
                    window.location.href = 'index.html';
                }
                clickCount = 0;
            }, 350);
        });
    }

    // 11. Accès Médecin : Raccourci Clavier (Ctrl+Shift+M) + Lien discret en pied de page
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
            e.preventDefault();
            window.location.href = 'doctor.html';
        }
    });

    const footerCopyright = document.querySelector('.copyright p');
    if (footerCopyright && !footerCopyright.querySelector('.espace-pro-link')) {
        const medLink = document.createElement('a');
        medLink.href = 'doctor.html';
        medLink.className = 'espace-pro-link';
        medLink.textContent = 'Espace Pro';
        medLink.style.cssText = 'color: rgba(255,255,255,0.4); text-decoration: none; margin-left: 15px; font-size: 0.78rem; transition: color 0.3s;';
        medLink.addEventListener('mouseenter', () => { medLink.style.color = 'rgba(255,255,255,0.85)'; });
        medLink.addEventListener('mouseleave', () => { medLink.style.color = 'rgba(255,255,255,0.4)'; });
        footerCopyright.appendChild(medLink);
    }

    // 12.FAQ Accordion Logic
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });

    // 13. Dark Mode Toggle Synchronization
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const syncThemeIcons = () => {
        const isDark = document.documentElement.classList.contains('dark-mode');
        themeToggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-sun', isDark);
                icon.classList.toggle('fa-moon', !isDark);
            }
        });
    };
    syncThemeIcons();

    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.documentElement.classList.toggle('dark-mode');
            const isDark = document.documentElement.classList.contains('dark-mode');
            syncThemeIcons();
            try {
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } catch {
                // Ignore
            }
        });
    });

    // 14. Holo-Assistant Chatbot Widget (Hybride Gemini + Triage Médical Hors-ligne)
    if (!document.getElementById('holo-assistant')) {
        const chatbotHTML = `
        <div id="holo-assistant" class="chatbot-container" role="region" aria-label="Assistant Médical Virtuel">
            <button type="button" class="chatbot-toggle" aria-label="Ouvrir l'assistant médical">
                <i class="fas fa-comment-medical"></i>
                <span class="chatbot-pulse"></span>
            </button>
            <div class="chatbot-window" aria-hidden="true">
                <div class="chatbot-header">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-user-md" style="font-size:1.2rem;"></i>
                        <div>
                            <h4 style="line-height:1.1;">Assistant Hôpital Thiès</h4>
                            <small style="font-size:0.72rem;opacity:0.85;">Orientation & Infos 24h/24</small>
                        </div>
                    </div>
                    <button type="button" class="chatbot-close" aria-label="Fermer l'assistant"><i class="fas fa-times"></i></button>
                </div>
                <div class="chatbot-messages">
                    <div class="msg ai">
                        Bonjour (<em>Dalal ak Jàmm</em>) ! Je suis l'assistant virtuel de l'<strong>Hôpital Régional de Thiès</strong>.<br>
                        Décrivez vos symptômes ou choisissez un sujet ci-dessous :
                    </div>
                    <div class="chatbot-quick-chips">
                        <button type="button" class="chat-chip" data-msg="Comment prendre rendez-vous ?">📅 Prendre RDV</button>
                        <button type="button" class="chat-chip" data-msg="Quels sont vos horaires et votre adresse ?">🕒 Horaires & Accès</button>
                        <button type="button" class="chat-chip" data-msg="Comment suivre mon rendez-vous ?">🔍 Suivre RDV</button>
                        <button type="button" class="chat-chip" data-msg="Acceptez-vous la CMU et les mutuelles ?">🪪 CMU & Documents</button>
                    </div>
                </div>
                <div class="chatbot-input">
                    <input type="text" placeholder="Ex: J'ai mal aux yeux, horaires..." aria-label="Votre question" />
                    <button type="button" aria-label="Envoyer"><i class="fas fa-paper-plane"></i></button>
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

        const openChat = () => {
            chatWindow.classList.add('active');
            chatWindow.setAttribute('aria-hidden', 'false');
            toggleBtn.style.display = 'none';
            if (window.innerWidth > 768) {
                setTimeout(() => inputField.focus(), 200);
            }
        };

        const closeChat = () => {
            chatWindow.classList.remove('active');
            chatWindow.setAttribute('aria-hidden', 'true');
            toggleBtn.style.display = 'flex';
        };

        toggleBtn.addEventListener('click', openChat);
        closeBtn.addEventListener('click', closeChat);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && chatWindow.classList.contains('active')) {
                closeChat();
            }
        });

        const handleUserMessage = async (rawText) => {
            const text = rawText.trim();
            if (!text) return;

            messagesDiv.insertAdjacentHTML('beforeend', `<div class="msg user">${escapeHtml(text)}</div>`);
            inputField.value = '';
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            const typingId = 'typing-' + Date.now();
            messagesDiv.insertAdjacentHTML(
                'beforeend',
                `<div class="msg ai" id="${typingId}">Orientation en cours... <i class="fas fa-spinner fa-spin"></i></div>`
            );
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            try {
                const replyHtml = await askMedicalAssistant(text);
                const el = document.getElementById(typingId);
                if (el) el.innerHTML = replyHtml;
            } catch (err) {
                console.error('Chatbot error:', err);
                const el = document.getElementById(typingId);
                if (el) {
                    el.innerHTML = `Pour toute demande urgente, contactez directement l'accueil au <a href="tel:+221339521090" style="color:#38bdf8;font-weight:700;">+221 33 952 10 90</a> ou <a href="appointment.html" style="color:#38bdf8;font-weight:700;">prenez rendez-vous ici</a>.`;
                }
            }
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };

        sendBtn.addEventListener('click', () => handleUserMessage(inputField.value));
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleUserMessage(inputField.value);
            }
        });

        messagesDiv.querySelectorAll('.chat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const q = chip.getAttribute('data-msg');
                if (q) handleUserMessage(q);
            });
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
