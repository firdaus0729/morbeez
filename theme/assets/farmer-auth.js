(function () {
  var STORAGE_KEY = 'morbeez_farmer_token';
  var config = window.MORBEEZ_AUTH || {};
  var API_BASE = (config.apiBase || 'https://morbeez-api.onrender.com').replace(/\/$/, '');
  var PROXY_BASE = (config.proxyBase || '/apps/morbeez/auth').replace(/\/$/, '');

  var card = document.querySelector('.morbeez-auth-card');
  if (!card) return;

  var tabs = card.querySelectorAll('[data-auth-tab]');
  var panels = card.querySelectorAll('[data-auth-panel]');
  var loginForm = document.getElementById('morbeez-auth-login');
  var signupForm = document.getElementById('morbeez-auth-signup');
  var loggedIn = document.getElementById('morbeez-auth-logged-in');
  var messageEl = document.getElementById('morbeez-auth-message');
  var tabsRow = card.querySelector('.morbeez-auth-tabs');

  function getToken() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('morbeez:auth-changed'));
  }

  function showMessage(text, isError) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden', 'bg-green-50', 'text-green-800', 'bg-red-50', 'text-red-800');
    messageEl.classList.add(isError ? 'bg-red-50' : 'bg-green-50', isError ? 'text-red-800' : 'text-green-800');
    messageEl.hidden = false;
  }

  function hideMessage() {
    if (messageEl) {
      messageEl.hidden = true;
      messageEl.classList.add('hidden');
    }
  }

  function setTab(name) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-auth-tab') === name;
      tab.classList.toggle('morbeez-auth-tab--active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      var show = panel.getAttribute('data-auth-panel') === name;
      panel.classList.toggle('hidden', !show);
    });
    hideMessage();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setTab(tab.getAttribute('data-auth-tab'));
    });
  });

  card.querySelectorAll('[data-toggle-pw]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.closest('.morbeez-auth-field')?.querySelector('input');
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  function parseResponse(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') >= 0) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }
    return res.text().then(function (text) {
      return {
        ok: false,
        status: res.status,
        data: {
          message:
            res.status === 302 || text.indexOf('password') >= 0
              ? 'Store is password-protected. Disable it in Shopify Admin → Online Store → Preferences, or enter the store password first.'
              : 'Server returned an unexpected response. Check API URL in Theme settings.',
        },
      };
    });
  }

  function request(url, options) {
    var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(url, Object.assign({ headers: headers, credentials: 'omit' }, options || {})).then(parseResponse);
  }

  /** Map /signup → direct API /api/v1/auth/signup or proxy /proxy/auth/signup */
  function apiPaths(suffix) {
    var path = suffix.replace(/^\//, '');
    return {
      direct: API_BASE + '/api/v1/auth/' + path,
      proxy: PROXY_BASE + '/' + path,
    };
  }

  function api(suffix, options) {
    var urls = apiPaths(suffix);
    return request(urls.direct, options).then(function (result) {
      if (result.ok || (result.status !== 404 && result.status !== 502 && result.status !== 503)) {
        return result;
      }
      return request(urls.proxy, options);
    });
  }

  function showLoggedIn(farmer) {
    if (tabsRow) tabsRow.classList.add('hidden');
    loginForm?.classList.add('hidden');
    signupForm?.classList.add('hidden');
    if (loggedIn) {
      loggedIn.classList.remove('hidden');
      loggedIn.hidden = false;
      var nameEl = loggedIn.querySelector('[data-auth-user-name]');
      var emailEl = loggedIn.querySelector('[data-auth-user-email]');
      if (nameEl) {
        nameEl.textContent =
          [farmer.firstName, farmer.lastName].filter(Boolean).join(' ') || farmer.name || farmer.email;
      }
      if (emailEl) emailEl.textContent = farmer.email || '';
    }
  }

  function showForms() {
    if (tabsRow) tabsRow.classList.remove('hidden');
    if (loggedIn) {
      loggedIn.classList.add('hidden');
      loggedIn.hidden = true;
    }
    setTab('signup');
  }

  function checkSession() {
    if (!getToken()) return;
    api('/me', { method: 'GET' })
      .then(function (r) {
        if (r.ok && r.data.farmer) {
          showLoggedIn(r.data.farmer);
        } else {
          setToken(null);
        }
      })
      .catch(function () {
        setToken(null);
      });
  }

  function handleAuthSubmit(form, endpoint, loadingLabel, doneLabel, onSuccess) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessage();
      var fd = new FormData(form);
      var btn = form.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = loadingLabel;
      }
      api(endpoint, { method: 'POST', body: JSON.stringify(onSuccess.payload(fd)) })
        .then(function (r) {
          if (r.ok && r.data.token) {
            setToken(r.data.token);
            var done = function () {
              showLoggedIn(r.data.farmer);
              showMessage(onSuccess.message, false);
            };
            if (window.MorbeezCart) {
              window.MorbeezCart.syncCartForFarmer(r.data.farmer).then(done);
            } else {
              done();
            }
          } else {
            showMessage(r.data.message || onSuccess.errorMessage, true);
          }
        })
        .catch(function (err) {
          console.error('Morbeez auth error', err);
          showMessage(
            'Cannot reach Morbeez API. Confirm https://morbeez-api.onrender.com is running and redeployed with auth routes.',
            true
          );
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = doneLabel;
          }
        });
    });
  }

  if (loginForm) {
    handleAuthSubmit(loginForm, '/login', 'Signing in…', 'Login', {
      payload: function (fd) {
        return { email: fd.get('email'), password: fd.get('password') };
      },
      message: 'Welcome back!',
      errorMessage: 'Login failed. Check your email and password.',
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessage();
      var fd = new FormData(signupForm);
      if (fd.get('password') !== fd.get('confirmPassword')) {
        showMessage('Passwords do not match.', true);
        return;
      }
      if (!fd.get('acceptTerms')) {
        showMessage('Please accept the Terms of Service and Privacy Policy.', true);
        return;
      }
      var btn = signupForm.querySelector('[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating account…';
      }
      api('/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: fd.get('email'),
          firstName: fd.get('firstName'),
          lastName: fd.get('lastName'),
          password: fd.get('password'),
          acceptTerms: true,
          newsletter: !!fd.get('newsletter'),
        }),
      })
        .then(function (r) {
          if (r.ok && r.data.token) {
            setToken(r.data.token);
            var doneSignup = function () {
              showLoggedIn(r.data.farmer);
              showMessage('Account created successfully.', false);
            };
            if (window.MorbeezCart) {
              window.MorbeezCart.syncCartForFarmer(r.data.farmer).then(doneSignup);
            } else {
              doneSignup();
            }
          } else {
            showMessage(r.data.message || 'Sign up failed. This email may already be registered.', true);
          }
        })
        .catch(function (err) {
          console.error('Morbeez auth error', err);
          showMessage(
            'Cannot reach Morbeez API. Redeploy the backend on Render, then try again.',
            true
          );
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sign Up';
          }
        });
    });
  }

  var logoutBtn = card.querySelector('[data-auth-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      setToken(null);
      if (window.MorbeezCart) {
        window.MorbeezCart.onFarmerLogout();
      }
      showForms();
      hideMessage();
    });
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'login') setTab('login');

  checkSession();
})();
