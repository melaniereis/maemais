// IntersectionObserver para animações
document.addEventListener('DOMContentLoaded', () => {
	const options = { threshold: 0.1 };
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('visible');
			}
		});
	}, options);

	document.querySelectorAll('.fade-in-up').forEach(el => {
		observer.observe(el);
	});

	// Scroll indicator
	const indicator = document.createElement('div');
	indicator.className = 'scroll-indicator';
	document.body.prepend(indicator);

	window.addEventListener('scroll', () => {
		const percent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
		indicator.style.width = percent + '%';
	});
});

// Animação de coração no footer
@keyframes heartbeat {
	0 %, 100 % { transform: scale(1); }
	50 % { transform: scale(1.2); }
}
