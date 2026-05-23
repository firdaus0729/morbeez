(function () {
  var form = document.getElementById('MorbeezCropDoctorForm');
  if (!form) return;

  var resultEl = document.getElementById('MorbeezCropDoctorResult');
  var proxyUrl = '/apps/morbeez/advisory/diagnose';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var phone = fd.get('phone');
    var cropType = fd.get('cropType') || 'ginger';
    var language = fd.get('language') || 'en';
    var symptomsText = fd.get('symptoms') || '';
    var fileInput = form.querySelector('[name="image"]');
    var file = fileInput && fileInput.files && fileInput.files[0];

    var btn = form.querySelector('[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Analyzing…';
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
        resultEl.innerHTML =
          '<p>' + (data.message || 'Analysis failed. Try again or WhatsApp us.') + '</p>';
      }
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

    function resetBtn() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Analyze my crop';
      }
    }
  });
})();
