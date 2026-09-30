// ========== MULTI-STEP QUOTE FLOW ==========
// Shared by index.html and contact.html. Same step-by-step layout as the
// promo-offer page, but posts to the WEBSITE-BOOKINGS sheet script.
// Sheet columns: DATE | NAME | PHONE | EMAIL | SUBURB | STREET ADDRESS |
// SERVICE REQUIRED | FREQUENCY | SIZE OF LAWN | CUSTOMER ADDITIONAL NOTES
document.addEventListener('DOMContentLoaded', function () {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGHCTBi1lF6lqq-L-S9CtjsJqyBrH36hbUV0C5W15GPOyyIe-nFmavqPewYCJQBBE/exec';

  const form = document.getElementById('quoteFlow');
  if (!form) return;

  const steps     = Array.from(form.querySelectorAll('.qf-step'));
  const barFill   = document.getElementById('qfBarFill');
  const stepLabel = document.getElementById('qfStepLabel');
  const percent   = document.getElementById('qfPercent');
  const backBtn   = document.getElementById('qfBack');
  const nextBtn   = document.getElementById('qfNext');
  const errorEl   = document.getElementById('qfError');
  // Dots are hidden below tablet width by .qf-dot in styles.css
  const FINAL_LABEL = '<span class="qf-dot">🟢 </span>Request Quote<span class="qf-dot"> 🟢</span>';

  let current = 0;
  const pct = [25, 50, 75, 100];

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  function render() {
    steps.forEach((s, i) => s.classList.toggle('active', i === current));
    const p = pct[current];
    barFill.style.width = p + '%';
    percent.textContent = p + '% Complete';
    stepLabel.textContent = 'Step ' + (current + 1) + ' of ' + steps.length;
    backBtn.style.display = current === 0 ? 'none' : 'block';
    if (current === steps.length - 1) nextBtn.innerHTML = FINAL_LABEL;
    else nextBtn.textContent = 'Next →';
    errorEl.style.display = 'none';
  }

  function chosenServices() {
    return Array.from(form.querySelectorAll('input[data-field="services"]:checked')).map(c => c.value);
  }

  // Single-select tiles (frequency, size)
  form.querySelectorAll('.qf-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const field = tile.dataset.field;
      form.querySelectorAll('.qf-tile[data-field="' + field + '"]').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      document.getElementById('qf-' + field).value = tile.dataset.value;
    });
  });

  // Multi-select services
  form.querySelectorAll('.qf-check input').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.qf-check').classList.toggle('selected', cb.checked);
    });
  });

  backBtn.addEventListener('click', () => {
    if (current > 0) { current--; render(); form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });

  nextBtn.addEventListener('click', () => {
    // Step 1 needs at least one service ticked
    if (current === 0 && chosenServices().length === 0) {
      showError('Please select at least one service.');
      return;
    }
    if (current === steps.length - 1) { submit(); return; }
    current++;
    render();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  async function submit() {
    const val = id => form.querySelector('#' + id).value.trim();
    const payload = {
      name:      val('qf-name'),
      phone:     val('qf-phone'),
      email:     val('qf-email'),
      suburb:    val('qf-suburb'),
      address:   val('qf-address'),
      services:  chosenServices().join(', '),
      frequency: document.getElementById('qf-frequency').value,
      size:      document.getElementById('qf-size').value,
      notes:     val('qf-notes') || 'None'
    };

    if (!payload.name || !payload.phone || !payload.suburb || !payload.address) {
      showError('Please add your name, phone, suburb and street address so we can quote your property.');
      return;
    }
    const emailInput = form.querySelector('#qf-email');
    if (payload.email && !emailInput.checkValidity()) {
      showError('That email address doesn\'t look right. Please check it.');
      return;
    }

    nextBtn.textContent = 'Sending…';
    nextBtn.disabled = true;
    if (typeof gtag === 'function') {
      gtag('event', 'form_submit', { event_category: 'lead', event_label: 'website_quote_request' });
    }

    const data = new URLSearchParams();
    Object.keys(payload).forEach(key => data.append(key, payload[key]));

    try {
      await fetch(SCRIPT_URL, { method: 'POST', body: data, mode: 'no-cors' });
      const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      form.innerHTML = `
        <div class="qf-success">
          <div class="qf-success-icon"><i class="fas fa-calendar-check"></i></div>
          <h3>Quote Request Received!</h3>
          <p>Thanks ${esc(payload.name)}! We'll call you shortly to confirm your quote. Keep your phone handy.</p>
          <div class="qf-summary">
            <strong>Services:</strong> ${esc(payload.services)}<br>
            <strong>Frequency:</strong> ${esc(payload.frequency)}<br>
            <strong>Lawn size:</strong> ${esc(payload.size)}<br>
            <strong>Suburb:</strong> ${esc(payload.suburb)}
          </div>
          <p class="qf-success-call">Questions? Call us: <a href="tel:+642108387863">021 0838 7863</a></p>
        </div>`;
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      celebrate();
    } catch {
      nextBtn.innerHTML = FINAL_LABEL;
      nextBtn.disabled = false;
      showError('Something went wrong. Please try again or call 021 0838 7863.');
    }
  }

  // Confetti burst when the quote request is sent. Full-screen canvas that
  // removes itself after a few seconds. Skipped for reduced-motion users.
  function celebrate() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'qf-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const colours = ['#174903', '#175704', '#4caf50', '#8bc34a', '#ff7b00', '#ff9a2b', '#ffd23f'];
    const pieces = [];
    // Two bursts, one from each bottom corner, aimed up and inwards
    [[0, 1], [W, -1]].forEach(([x, dir]) => {
      for (let i = 0; i < 90; i++) {
        const angle = (55 + Math.random() * 30) * Math.PI / 180;
        const speed = 9 + Math.random() * 9;
        pieces.push({
          x: x, y: H,
          vx: Math.cos(angle) * speed * dir,
          vy: -Math.sin(angle) * speed - 4,
          w: 6 + Math.random() * 6,
          h: 8 + Math.random() * 8,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.3,
          colour: colours[i % colours.length]
        });
      }
    });

    const start = performance.now();
    const DURATION = 4000;
    function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = t > DURATION - 800 ? Math.max(0, (DURATION - t) / 800) : 1;
      pieces.forEach(p => {
        p.vy += 0.3;          // gravity
        p.vx *= 0.99;         // air drag
        p.vy = Math.min(p.vy, 6);
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.colour;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
        ctx.restore();
      });
      if (t < DURATION) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  render();
});
