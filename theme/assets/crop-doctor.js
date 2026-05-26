(function () {
  var form = document.getElementById('MorbeezCropDoctorForm');
  if (!form) return;

  var resultEl = document.getElementById('MorbeezCropDoctorResult');
  var proxyUrl = '/apps/morbeez/advisory/diagnose';

  function normalizeIndianPhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 12 && digits.indexOf('91') === 0) return digits;
    return digits;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var btn = form.querySelector('[type="submit"]');

    function resetBtn() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Analyze my crop';
      }
    }

    function showResult(ok, data) {
      if (!resultEl) return;
      resultEl.classList.remove('hidden', 'morbeez-result-box--success', 'morbeez-result-box--error');
      if (ok) {
        resultEl.classList.add('morbeez-result-box--success');
        var html = '<p class="font-semibold">' + (data.summary || 'Analysis complete') + '</p>';
        if (data.escalated) {
          html += '<p class="mt-2 text-amber-700">Our agronomist team will review your case.</p>';
        }
        if (data.products && data.products.length) {
          html += '<p class="mt-2 font-medium">Suggested products:</p><ul class="list-disc pl-5">';
          data.products.forEach(function (p) {
            html += '<li>' + p.productTitle + '</li>';
          });
          html += '</ul>';
        }
        if (data.disclaimer) {
          html += '<p class="mt-2 text-xs opacity-75">' + data.disclaimer + '</p>';
        }
        resultEl.innerHTML = html;
      } else {
        resultEl.classList.add('morbeez-result-box--error');
        var msg =
          data.message || data.error || 'Analysis failed. Please check your mobile number and try again.';
        var waHref = form.getAttribute('data-wa-href') || '';
        var errHtml = '<p>' + msg + '</p>';
        if (waHref && waHref.indexOf('https://wa.me/') === 0) {
          errHtml +=
            '<p class="mt-2"><a class="font-semibold text-[var(--color-primary)] underline" href="' +
            waHref +
            '" target="_blank" rel="noopener">Contact us on WhatsApp</a></p>';
        }
        resultEl.innerHTML = errHtml;
      }
    }

    function postDiagnose(payload) {
      return fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      });
    }

    var phone = normalizeIndianPhone(fd.get('phone'));
    if (!/^91[6-9]\d{9}$/.test(phone)) {
      showResult(false, {
        message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).',
      });
      return;
    }

    var cropType = fd.get('cropType') || 'ginger';
    var language = fd.get('language') || 'en';
    var symptomsText = fd.get('symptoms') || '';
    var fileInput = form.querySelector('[name="image"]');
    var file = fileInput && fileInput.files && fileInput.files[0];

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Analyzing…';
    }

    if (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var base64 = reader.result.split(',')[1];
        postDiagnose({
          phone: phone,
          cropType: cropType,
          language: language,
          symptomsText: symptomsText,
          imageBase64: base64,
          imageMimeType: file.type,
        })
          .then(function (r) {
            showResult(r.ok, r.data);
          })
          .catch(function () {
            showResult(false, {});
          })
          .finally(resetBtn);
      };
      reader.readAsDataURL(file);
    } else {
      postDiagnose({
        phone: phone,
        cropType: cropType,
        language: language,
        symptomsText: symptomsText,
      })
        .then(function (r) {
          showResult(r.ok, r.data);
        })
        .catch(function () {
          showResult(false, {});
        })
        .finally(resetBtn);
    }
  });
})();
