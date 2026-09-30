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
  const FINAL_LABEL = '🟢 Request Quote 🟢';

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
    nextBtn.textContent = current === steps.length - 1 ? FINAL_LABEL : 'Next →';
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
    } catch {
      nextBtn.textContent = FINAL_LABEL;
      nextBtn.disabled = false;
      showError('Something went wrong. Please try again or call 021 0838 7863.');
    }
  }

  render();
});
