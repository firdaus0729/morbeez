/**
 * Dealer enquiry form — posts to Shopify App Proxy → Morbeez API
 */
(function () {
  var form = document.getElementById('MorbeezDealerForm');
  if (!form) return;

  var msgEl = document.getElementById('MorbeezDealerFormMessage');
  var url = form.getAttribute('data-proxy-url') || '/apps/morbeez/leads';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var payload = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      district: fd.get('district') || undefined,
      notes: fd.get('notes') || undefined,
      intent: 'dealer',
    };

    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (msgEl) {
          msgEl.classList.remove('hidden', 'morbeez-result-box--success', 'morbeez-result-box--error');
          msgEl.classList.add(result.ok ? 'morbeez-result-box--success' : 'morbeez-result-box--error');
          msgEl.textContent = result.ok
            ? result.data.message || 'Submitted successfully!'
            : result.data.message || 'Something went wrong. Please try again.';
        }
        if (result.ok) form.reset();
      })
      .catch(function () {
        if (msgEl) {
          msgEl.classList.remove('hidden', 'morbeez-result-box--success');
          msgEl.classList.add('morbeez-result-box--error');
          msgEl.textContent = 'Network error. Please try again or WhatsApp us.';
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
