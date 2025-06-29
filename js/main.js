document.addEventListener('DOMContentLoaded', function () {
	'use strict';

	// ====================================
	// CONFIGURAÇÕES DE PRÉ-INSCRIÇÃO
	// ====================================

	const preRegistrationConfig = {
		maxSlots: 1000,
		currentCount: 12,
		launchDate: new Date('2025-09-15'),
		benefits: {
			earlyAccess: 30,
			discount: 50,
			exclusiveContent: true
		}
	};

	let isSubmitting = false;

	// ====================================
	// UTILITÁRIOS
	// ====================================

	const $ = (selector) => document.querySelector(selector);
	const $$ = (selector) => document.querySelectorAll(selector);

	function showLoading() {
		const overlay = $('#loading-overlay');
		if (overlay) overlay.style.display = 'flex';
	}

	function hideLoading() {
		const overlay = $('#loading-overlay');
		if (overlay) overlay.style.display = 'none';
	}

	function trackEvent(action, category, label) {
		if (typeof gtag !== 'undefined') {
			gtag('event', action, {
				'event_category': category,
				'event_label': label,
				'custom_parameter_1': 'mae_plus_preregistration'
			});
		}
		console.log('📊 Event tracked:', { action, category, label });
	}

	function generateUniqueId() {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// ====================================
	// INTERSECTION OBSERVER PARA ANIMAÇÕES
	// ====================================

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) entry.target.classList.add('visible');
		});
	}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

	$$('.fade-in-up').forEach(el => observer.observe(el));

	// ====================================
	// NAVEGAÇÃO SUAVE
	// ====================================

	$$('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			const target = $(this.getAttribute('href'));
			if (target) {
				e.preventDefault();
				const offsetTop = target.offsetTop - 100;
				window.scrollTo({ top: offsetTop, behavior: 'smooth' });
				trackEvent('navigation_click', 'internal_link', this.getAttribute('href'));
			}
		});
	});

	// ====================================
	// NAVEGAÇÃO ATIVA
	// ====================================

	function updateActiveNavigation() {
		const sections = $$('section[id]');
		const navLinks = $$('.scroll-nav a[href^="#"]');
		let currentSectionId = '';
		sections.forEach(section => {
			const rect = section.getBoundingClientRect();
			if (rect.top <= 120 && rect.bottom >= 120) currentSectionId = section.id;
		});
		navLinks.forEach(link => {
			link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
		});
	}
	window.addEventListener('scroll', updateActiveNavigation);

	// ====================================
	// SISTEMA DE PRÉ-INSCRIÇÃO
	// ====================================

	function initPreRegistration() {
		const form = $('#pre-registration-form');
		if (!form) return;
		form.addEventListener('submit', handlePreRegistration);
		updateCounters();
		updateProgressBar();
		trackEvent('preregistration_form_viewed', 'engagement', 'hero_section');
		createCountdownTimer();
	}

	async function handlePreRegistration(e) {
		e.preventDefault();
		if (isSubmitting) return;
		isSubmitting = true;

		const form = e.target;
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		if (!validatePreRegistrationForm(data)) {
			isSubmitting = false;
			return;
		}

		const submitBtn = form.querySelector('.btn-preregister');
		const originalText = submitBtn.innerHTML;
		submitBtn.innerHTML = '<div class="loading-spinner"></div> A processar...';
		submitBtn.disabled = true;

		try {
			const enrichedData = {
				...data,
				timestamp: new Date().toISOString(),
				source: 'hero_preregistration',
				userAgent: navigator.userAgent,
				language: navigator.language,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				referrer: document.referrer,
				sessionId: generateUniqueId(),
				expectedLaunch: preRegistrationConfig.launchDate.toISOString(),
				slotNumber: preRegistrationConfig.currentCount + 1
			};
			const response = await submitPreRegistration(enrichedData);
			if (response.success) {
				showPreRegistrationSuccess(response.data);
				updateCounters();
				trackEvent('preregistration_completed', 'conversion', 'hero_form');
				setTimeout(() => downloadChecklist('preregistration'), 2000);
			} else {
				throw new Error(response.message || 'Erro na pré-inscrição');
			}
		} catch (error) {
			console.error('Erro na pré-inscrição:', error);
			showPreRegistrationError(error.message);
			trackEvent('preregistration_error', 'error', error.message);
		} finally {
			submitBtn.innerHTML = originalText;
			submitBtn.disabled = false;
			isSubmitting = false;
		}
	}

	function validatePreRegistrationForm(data) {
		const errors = [];
		if (!data.nome || data.nome.trim().length < 2) {
			errors.push('Nome deve ter pelo menos 2 caracteres');
			highlightError('pre-nome');
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!data.email || !emailRegex.test(data.email)) {
			errors.push('Email inválido');
			highlightError('pre-email');
		}
		if (!data.situacao) {
			errors.push('Por favor seleciona a tua situação');
			highlightError('pre-situacao');
		}
		if (!data['pre-privacy']) {
			errors.push('Deves aceitar receber emails');
			highlightError('pre-privacy');
		}
		if (errors.length > 0) {
			showFormErrors(errors);
			return false;
		}
		return true;
	}

	function highlightError(fieldId) {
		const field = document.getElementById(fieldId);
		if (field) {
			field.style.borderColor = 'var(--error-color)';
			field.classList.add('error');
			setTimeout(() => {
				field.style.borderColor = '';
				field.classList.remove('error');
			}, 3000);
		}
	}

	function showFormErrors(errors) {
		const toast = document.createElement('div');
		toast.className = 'error-toast';
		toast.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: var(--error-color); color: white;
            padding: 1rem 1.5rem; border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg); z-index: 10000;
            animation: slideIn 0.3s ease; max-width: 300px;
        `;
		toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="font-size: 1.2rem;">⚠️</span>
                <strong>Erro no formulário</strong>
            </div>
            <ul style="margin: 0; padding-left: 1rem;">
                ${errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        `;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 5000);
	}

	async function submitPreRegistration(data) {
		await new Promise(resolve => setTimeout(resolve, 1500));
		const saved = JSON.parse(localStorage.getItem('maeplus_preregistrations') || '[]');
		saved.push(data);
		localStorage.setItem('maeplus_preregistrations', JSON.stringify(saved));
		preRegistrationConfig.currentCount++;
		return {
			success: true,
			data: {
				id: data.sessionId,
				slotNumber: data.slotNumber,
				estimatedLaunch: preRegistrationConfig.launchDate,
				benefits: preRegistrationConfig.benefits
			}
		};
	}

	function showPreRegistrationSuccess(data) {
		$('#preregister-step').classList.remove('active');
		const successStep = $('#preregister-success');
		successStep.classList.add('active');
		const slotNumberElement = $('#user-slot-number');
		if (slotNumberElement) slotNumberElement.textContent = data.slotNumber;
		createConfettiAnimation();
		setTimeout(() => {
			successStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 500);
		setTimeout(() => {
			console.log('📧 Email de confirmação com checklist enviado');
		}, 2000);
	}

	function updateCounters() {
		const current = preRegistrationConfig.currentCount;
		const max = preRegistrationConfig.maxSlots;
		const remaining = max - current;
		$$('#preregistration-counter').forEach(el => animateCounter(el, current - 1, current));
		$$('.stat-number').forEach(el => {
			if (el.nextElementSibling?.textContent.includes('restantes')) {
				animateCounter(el, remaining + 1, remaining);
			}
		});
		const progressCurrent = $('#progress-current');
		const progressRemaining = $('#progress-remaining');
		if (progressCurrent) progressCurrent.textContent = `${current} / ${max}`;
		if (progressRemaining) progressRemaining.textContent = `${remaining} vagas restantes`;
		updateProgressBar();
	}

	function updateProgressBar() {
		const percentage = (preRegistrationConfig.currentCount / preRegistrationConfig.maxSlots) * 100;
		const progressBar = $('.progress-fill-urgency');
		if (progressBar) progressBar.style.width = Math.max(percentage, 1.2) + '%';
	}

	function createCountdownTimer() {
		const launchDate = preRegistrationConfig.launchDate;
		const timerElement = $('.countdown-timer');
		if (!timerElement) return;
		function updateTimer() {
			const now = new Date().getTime();
			const distance = launchDate.getTime() - now;
			if (distance < 0) {
				timerElement.innerHTML = "🚀 App Lançada!";
				return;
			}
			const days = Math.floor(distance / (1000 * 60 * 60 * 24));
			const months = Math.floor(days / 30);
			const remainingDays = days % 30;
			timerElement.innerHTML = `
                <div class="timer-item">
                    <span class="timer-number">${months}</span>
                    <span class="timer-label">meses</span>
                </div>
                <div class="timer-item">
                    <span class="timer-number">${remainingDays}</span>
                    <span class="timer-label">dias</span>
                </div>
            `;
		}
		updateTimer();
		setInterval(updateTimer, 60 * 60 * 1000);
	}

	function downloadChecklist(source = 'preregistration') {
		const link = document.createElement('a');
		link.href = 'assets/checklist-sns24.pdf';
		link.download = 'Checklist-SNS24-Licenca-Parental-MaePlus.pdf';
		link.click();
		trackEvent('file_download', 'checklist', `sns24_${source}`);
		console.log('📋 Download do checklist iniciado');
	}

	window.sharePreRegistration = function () {
		const shareData = {
			title: 'Mãe+ - Lista de Espera Aberta!',
			text: 'Junta-te a mim na lista de espera da app que vai revolucionar a maternidade em Portugal! 🤱 Acesso antecipado + 50% desconto!',
			url: window.location.href
		};
		if (navigator.share) {
			navigator.share(shareData);
		} else {
			const text = `${shareData.text} ${shareData.url}`;
			navigator.clipboard.writeText(text);
			const toast = createToast('Link copiado! Cola nas tuas redes sociais 📱', 'success');
			document.body.appendChild(toast);
		}
		trackEvent('preregistration_shared', 'social', 'native_share');
	};

	function createConfettiAnimation() {
		const colors = ['#E8B4CB', '#D4A574', '#B76E79', '#F5E6E8'];
		const confettiCount = 50;
		for (let i = 0; i < confettiCount; i++) {
			const confetti = document.createElement('div');
			confetti.style.cssText = `
                position: fixed; width: 6px; height: 6px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%; z-index: 10000; pointer-events: none;
                top: -10px; left: ${Math.random() * 100}vw;
                animation: confettiFall 3s linear forwards;
            `;
			document.body.appendChild(confetti);
			setTimeout(() => confetti.remove(), 3000);
		}
	}

	// CSS para animação de confetti
	if (!document.getElementById('confetti-style')) {
		const confettiCSS = `
        @keyframes confettiFall {
            to { transform: translateY(100vh) rotate(360deg); }
        }`;
		const style = document.createElement('style');
		style.id = 'confetti-style';
		style.textContent = confettiCSS;
		document.head.appendChild(style);
	}

	// ====================================
	// NEWSLETTER
	// ====================================

	const newsletterForm = $('#newsletter-form');
	if (newsletterForm) {
		newsletterForm.addEventListener('submit', async function (e) {
			e.preventDefault();
			const emailInput = this.querySelector('input[type="email"]');
			const submitBtn = this.querySelector('button');
			if (!emailInput.value || !emailInput.checkValidity()) {
				showFieldError(emailInput, 'Por favor, introduz um email válido');
				return;
			}
			const originalText = submitBtn.innerHTML;
			submitBtn.innerHTML = '<span>A subscrever...</span>';
			submitBtn.disabled = true;
			try {
				await new Promise(resolve => setTimeout(resolve, 1000));
				submitBtn.innerHTML = '<span>✓ Subscrito!</span>';
				submitBtn.style.background = 'var(--success-color)';
				emailInput.value = '';
				trackEvent('newsletter_signup', 'email', emailInput.value);
				setTimeout(() => {
					submitBtn.innerHTML = originalText;
					submitBtn.disabled = false;
					submitBtn.style.background = '';
				}, 3000);
			} catch (error) {
				submitBtn.innerHTML = originalText;
				submitBtn.disabled = false;
				showFieldError(emailInput, 'Erro ao subscrever. Tenta novamente.');
			}
		});
	}

	// ====================================
	// FUNÇÕES AUXILIARES
	// ====================================

	function animateCounter(element, start, end) {
		const duration = 1000;
		const startTime = performance.now();
		function update(currentTime) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const value = Math.floor(start + (end - start) * progress);
			element.textContent = value;
			if (progress < 1) requestAnimationFrame(update);
		}
		requestAnimationFrame(update);
	}

	function createToast(message, type = 'info') {
		const toast = document.createElement('div');
		toast.className = `toast toast-${type}`;
		toast.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: var(--rose-gold-accent); color: var(--cream-white);
            padding: 1rem 1.5rem; border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg); z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
		toast.textContent = message;
		setTimeout(() => toast.remove(), 3000);
		return toast;
	}

	function showFieldError(field, message) {
		field.style.borderColor = 'var(--error-color)';
		setTimeout(() => { field.style.borderColor = ''; }, 3000);
		console.warn('Campo com erro:', field.id || field.name, message);
	}

	// ====================================
	// MELHORIAS DE UX
	// ====================================

	$$('textarea').forEach(textarea => {
		textarea.addEventListener('input', function () {
			this.style.height = 'auto';
			this.style.height = Math.min(this.scrollHeight, 200) + 'px';
		});
	});

	function improveFormUX() {
		const emailInput = $('#pre-email');
		if (emailInput) {
			const placeholders = [
				'maria@gmail.com',
				'ana@hotmail.com',
				'sofia@outlook.com',
				'ines@sapo.pt'
			];
			let placeholderIndex = 0;
			setInterval(() => {
				if (!emailInput.value && document.activeElement !== emailInput) {
					emailInput.placeholder = placeholders[placeholderIndex];
					placeholderIndex = (placeholderIndex + 1) % placeholders.length;
				}
			}, 4000);
		}
	}

	// ====================================
	// ANALYTICS E PERFORMANCE
	// ====================================

	window.addEventListener('load', function () {
		const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
		console.log(`⚡ Página carregada em ${loadTime}ms`);
		trackEvent('page_performance', 'load_time', Math.round(loadTime / 100) * 100);
		if (loadTime > 3000) console.warn('⚠️ Página demorou mais de 3s a carregar');
	});

	let formStarted = false;
	document.addEventListener('click', function (e) {
		if (e.target.closest('#pre-registration-form') && !formStarted) {
			formStarted = true;
			trackEvent('preregistration_form_started', 'engagement', 'first_interaction');
		}
	});
	document.addEventListener('visibilitychange', function () {
		if (document.hidden && formStarted) {
			trackEvent('preregistration_form_abandoned', 'engagement', 'tab_hidden');
		}
	});

	// ====================================
	// GESTÃO DE ERROS
	// ====================================

	window.addEventListener('error', function (e) {
		console.error('❌ Erro capturado:', e.error);
		trackEvent('javascript_error', 'error', e.error?.message || 'Unknown error');
	});
	window.addEventListener('unhandledrejection', function (e) {
		console.error('❌ Promise rejeitada:', e.reason);
		trackEvent('promise_rejection', 'error', e.reason?.message || 'Unknown rejection');
	});

	// ====================================
	// INICIALIZAÇÃO
	// ====================================

	initPreRegistration();
	improveFormUX();

	const savedData = JSON.parse(localStorage.getItem('maeplus_preregistrations') || '[]');
	if (savedData.length > 0) {
		console.log(`📁 ${savedData.length} pré-inscrições anteriores encontradas no localStorage`);
		if (savedData.length > preRegistrationConfig.currentCount) {
			preRegistrationConfig.currentCount = savedData.length;
			updateCounters();
		}
	}

	trackEvent('page_view', 'preregistration_landing', 'initial_load');
	console.log('✨ Mãe+ Pré-Inscrição carregada com sucesso!');
	console.log('📊 Sistema de pré-inscrição ativo');
	console.log('🎨 Design Rose Gold maternal ativo');
	console.log(`👥 ${preRegistrationConfig.currentCount} pré-inscrições até agora`);
});

// ====================================
// FUNÇÕES GLOBAIS PARA DEBUG/ADMIN
// ====================================

window.getPreRegistrationData = function () {
	return JSON.parse(localStorage.getItem('maeplus_preregistrations') || '[]');
};

window.exportPreRegistrationData = function () {
	const data = window.getPreRegistrationData();
	if (data.length === 0) {
		console.log('Não há dados para exportar');
		return;
	}
	const headers = ['timestamp', 'nome', 'email', 'situacao', 'slotNumber', 'source'];
	const csvContent = [
		headers.join(','),
		...data.map(item =>
			headers.map(header => `"${item[header] || ''}"`).join(',')
		)
	].join('\n');
	const blob = new Blob([csvContent], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `mae-plus-preregistrations-${new Date().toISOString().split('T')[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	console.log('📊 Dados de pré-inscrição exportados para CSV');
};

window.clearPreRegistrationData = function () {
	localStorage.removeItem('maeplus_preregistrations');
	console.log('🗑️ Dados de pré-inscrição limpos');
};

window.simulatePreRegistrations = function (count = 5) {
	const sampleData = {
		nome: ['Maria Silva', 'Ana Costa', 'Sofia Santos', 'Inês Ferreira', 'Catarina Lopes', 'Joana Rodrigues', 'Beatriz Alves'],
		email: ['maria@email.com', 'ana@email.com', 'sofia@email.com', 'ines@email.com', 'catarina@email.com'],
		situacao: ['gravida', 'mae-recente', 'mae-experiente', 'planeando', 'tentando']
	};
	const existingData = JSON.parse(localStorage.getItem('maeplus_preregistrations') || '[]');
	for (let i = 0; i < count; i++) {
		const mockData = {
			sessionId: `sim_${Date.now()}_${i}`,
			nome: sampleData.nome[Math.floor(Math.random() * sampleData.nome.length)],
			email: sampleData.email[Math.floor(Math.random() * sampleData.email.length)],
			situacao: sampleData.situacao[Math.floor(Math.random() * sampleData.situacao.length)],
			'pre-privacy': true,
			timestamp: new Date().toISOString(),
			source: 'simulation',
			slotNumber: existingData.length + i + 1,
			userAgent: 'Simulated Data',
			language: 'pt-PT',
			timezone: 'Europe/Lisbon'
		};
		existingData.push(mockData);
	}
	localStorage.setItem('maeplus_preregistrations', JSON.stringify(existingData));
	console.log(`🎭 ${count} pré-inscrições simuladas criadas`);
	console.log('📊 Use window.exportPreRegistrationData() para exportar os dados');
	location.reload();
};
