document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons (if not already done in HTML)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Navbar Scroll Effect & Mobile Menu
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navbar.classList.toggle('mobile-active');
            // Change icon
            const icon = mobileMenuBtn.querySelector('i');
            if (navbar.classList.contains('mobile-active')) {
                icon.setAttribute('data-lucide', 'x');
            } else {
                icon.setAttribute('data-lucide', 'menu');
            }
            lucide.createIcons();
        });
    }

    // 3. Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;
        
        revealElements.forEach((el) => {
            const elementTop = el.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                el.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger on load

    // 4. FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(faq => faq.classList.remove('active'));
            
            // Open clicked if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // 5. ROI Calculator Logic
    const cutsSlider = document.getElementById('cuts-slider');
    const cutsValue = document.getElementById('cuts-value');
    const ticketSlider = document.getElementById('ticket-slider');
    const ticketValue = document.getElementById('ticket-value');
    
    const competitorCostEl = document.getElementById('competitor-cost');
    const barberproSavingsEl = document.getElementById('barberpro-savings');
    const annualSavingsEl = document.getElementById('annual-savings');

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const calculateROI = () => {
        const cuts = parseInt(cutsSlider.value);
        const ticket = parseInt(ticketSlider.value);
        
        // Update labels
        cutsValue.textContent = cuts;
        ticketValue.textContent = formatCurrency(ticket);
        
        const faturamento = cuts * ticket;
        
        // Competitor scenario: R$ 99 (fixed) + 2.5% fee on all transactions
        const competitorFee = faturamento * 0.025;
        const competitorTotalCost = 99 + competitorFee;
        
        // BarberPro scenario: No transaction fees (only standard gateway fee, system doesn't charge)
        const savings = competitorFee; 
        const annualSavings = savings * 12;
        
        competitorCostEl.textContent = `${formatCurrency(competitorTotalCost)}`;
        barberproSavingsEl.textContent = `+ ${formatCurrency(savings)}`;
        annualSavingsEl.textContent = formatCurrency(annualSavings);
    };

    if (cutsSlider && ticketSlider) {
        cutsSlider.addEventListener('input', calculateROI);
        ticketSlider.addEventListener('input', calculateROI);
        // Initial calc
        calculateROI();
    }

    // 6. Ambient Cursor Glow — desktop only (prevents mobile shaking)
    const cursorGlow = document.getElementById('cursor-glow');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (cursorGlow && window.matchMedia('(pointer: fine)').matches && !isMobile) {
        let glowX = window.innerWidth / 2;
        let glowY = window.innerHeight / 3;
        let targetX = glowX;
        let targetY = glowY;

        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
        });

        const animateGlow = () => {
            glowX += (targetX - glowX) * 0.08;
            glowY += (targetY - glowY) * 0.08;
            cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
            requestAnimationFrame(animateGlow);
        };
        animateGlow();
    } else if (cursorGlow) {
        cursorGlow.style.display = 'none';
    }

    // 7. Animated Counters (Hero Stats)
    const counters = document.querySelectorAll('[data-counter]');
    const formatCounter = (value, decimals, suffix) => {
        const num = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString('pt-BR');
        return `${num}${suffix || ''}`;
    };

    const runCounter = (el) => {
        const target = parseFloat(el.dataset.target);
        const decimals = parseInt(el.dataset.decimals || '0');
        const suffix = el.dataset.suffix || '';
        const duration = 1800;
        const startTime = performance.now();

        const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = target * eased;
            el.textContent = formatCounter(current, decimals, suffix);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = formatCounter(target, decimals, suffix);
            }
        };
        requestAnimationFrame(step);
    };

    if (counters.length) {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach((el) => counterObserver.observe(el));
    }

    // 8. Profit Trend Chart — draw-in animation on scroll
    const growthPanel = document.getElementById('growth-panel');
    const trendLine = document.getElementById('trend-line');

    if (growthPanel && trendLine) {
        const pathLength = trendLine.getTotalLength();
        trendLine.style.strokeDasharray = pathLength;
        trendLine.style.strokeDashoffset = pathLength;
        trendLine.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.65, 0, 0.35, 1)';

        const chartObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    trendLine.style.strokeDashoffset = '0';
                    growthPanel.classList.add('in-view');
                    chartObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        chartObserver.observe(growthPanel);
    }
});

/* --- ORBIT WIDGET JS --- */
function bbOpenModal(el){
  document.getElementById('bb-modal-title').textContent = el.dataset.title;
  document.getElementById('bb-modal-desc').textContent = el.dataset.desc;
  var list = document.getElementById('bb-modal-items');
  list.innerHTML = '';
  el.dataset.items.split('|').forEach(function(txt){
    var li = document.createElement('li');
    li.textContent = txt;
    list.appendChild(li);
  });
  document.getElementById('bb-modal-overlay').classList.add('bb-active');
}
function bbCloseModal(e){
  if(e.target.id === 'bb-modal-overlay' || e.target.classList.contains('bb-modal-close')){
    document.getElementById('bb-modal-overlay').classList.remove('bb-active');
  }
}

(function(){
  var wrapper = document.getElementById('bb-orbit-wrapper');
  var canvas = document.getElementById('bb-neural-canvas');
  var ctx = canvas.getContext('2d');
  var items = Array.prototype.slice.call(wrapper.querySelectorAll('.bb-orbit-item'));
  var W = 0, H = 0, cx = 0, cy = 0;
  var dpr = window.devicePixelRatio || 1;
  var targets = [];

  function resize(){
    var rect = wrapper.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx = W/2; cy = H/2;
    targets = items.map(function(el){
      var xPct = parseFloat(getComputedStyle(el).getPropertyValue('--x'));
      var yPct = parseFloat(getComputedStyle(el).getPropertyValue('--y'));
      return { x: W*xPct/100, y: H*yPct/100 };
    });
  }

  window.addEventListener('resize', resize);
  resize();

  function draw(t){
    ctx.clearRect(0,0,W,H);

    ctx.strokeStyle = 'rgba(201,162,74,0.22)';
    ctx.lineWidth = 1;
    targets.forEach(function(p){
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });

    for(var i=0;i<targets.length;i++){
      for(var j=i+1;j<targets.length;j++){
        var dx = targets[i].x-targets[j].x, dy = targets[i].y-targets[j].y;
        var dist = Math.sqrt(dx*dx+dy*dy);
        if(dist < W*0.42){
          ctx.strokeStyle = 'rgba(201,162,74,0.08)';
          ctx.beginPath();
          ctx.moveTo(targets[i].x, targets[i].y);
          ctx.lineTo(targets[j].x, targets[j].y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = 'rgba(230,200,119,0.6)';
    targets.forEach(function(p, i){
      var pulse = Math.sin(t*0.002 + i)*0.5+0.5;
      var midX = cx + (p.x-cx)*0.55, midY = cy + (p.y-cy)*0.55;
      ctx.beginPath();
      ctx.arc(midX, midY, 1.4 + pulse*1.2, 0, Math.PI*2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
