(function () {
  var STORAGE_KEY = 'morbeez_farmer_token';
  var config = window.MORBEEZ_AUTH || {};
  var API_BASE = (config.apiBase || 'https://morbeez-api.onrender.com').replace(/\/$/, '');

  function updateLoginLinks() {
    var links = document.querySelectorAll('[data-morbeez-login-link]');
    if (!links.length) return;

    var token;
    try {
      token = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return;
    }

    if (!token) {
      links.forEach(function (a) {
        a.textContent = a.getAttribute('data-login-label') || 'Login';
        a.setAttribute('href', a.getAttribute('data-login-href') || '/pages/login');
      });
      return;
    }

    fetch(API_BASE + '/api/v1/auth/me', {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      credentials: 'omit',
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (!r.ok || !r.data.farmer) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {}
          return;
        }
        var f = r.data.farmer;
        var label = [f.firstName, f.lastName].filter(Boolean).join(' ') || f.name || 'Account';
        links.forEach(function (a) {
          a.textContent = label;
          a.setAttribute('href', '/pages/login');
          a.setAttribute('title', f.email || '');
        });
      })
      .catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', updateLoginLinks);
  document.addEventListener('morbeez:auth-changed', updateLoginLinks);
})();
