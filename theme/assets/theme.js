/**
 * Morbeez theme — M1 interactions
 */
(function () {
  document.documentElement.classList.remove('no-js');

  /* WhatsApp CTA — append page title to prefilled message */
  var waCta = document.querySelector('[data-morbeez-whatsapp-cta] a');
  if (waCta && document.title) {
    var href = waCta.getAttribute('href');
    if (href && href.indexOf('text=') !== -1) {
      waCta.setAttribute('href', href + encodeURIComponent(' — ' + document.title));
    }
  }

  /* Mobile drawer */
  var drawer = document.querySelector('[data-mobile-drawer]');
  var openBtn = document.querySelector('[data-drawer-open]');
  var closeBtn = document.querySelector('[data-drawer-close]');
  var backdrop = document.querySelector('[data-drawer-backdrop]');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.add('hidden');
    drawer.setAttribute('aria-hidden', 'true');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  /* Product tabs */
  var tabsRoot = document.querySelector('[data-morbeez-product-tabs]');
  if (tabsRoot) {
    var tabBtns = tabsRoot.querySelectorAll('[data-tab]');
    var panels = tabsRoot.querySelectorAll('[data-panel]');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tab');
        tabBtns.forEach(function (b) {
          b.classList.remove('is-active');
        });
        panels.forEach(function (p) {
          p.classList.add('hidden');
          p.classList.remove('is-active');
          if (p.getAttribute('data-panel') === id) {
            p.classList.remove('hidden');
            p.classList.add('is-active');
          }
        });
        btn.classList.add('is-active');
      });
    });
  }

  /* PDP image thumbnails */
  var mainImg = document.querySelector('#MorbeezProduct-main img, .section-main-product img');
  document.querySelectorAll('[data-product-thumb]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var img = btn.querySelector('img');
      if (mainImg && img) {
        mainImg.src = img.src.replace(/width=\d+/, 'width=1080');
        mainImg.srcset = img.srcset || '';
      }
    });
  });

  /* Flash sale countdown */
  document.querySelectorAll('[data-flash-sale]').forEach(function (section) {
    var endStr = section.getAttribute('data-end');
    var display = section.querySelector('[data-countdown-display]');
    if (!endStr || !display) return;

    var end = new Date(endStr).getTime();

    function tick() {
      var diff = Math.max(0, end - Date.now());
      if (diff === 0) {
        display.textContent = 'Ended';
        return;
      }
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      display.textContent =
        String(h).padStart(2, '0') +
        ':' +
        String(m).padStart(2, '0') +
        ':' +
        String(s).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  });
})();
