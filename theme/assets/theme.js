/**
 * Morbeez theme — M1 interactions
 */
(function () {
  document.documentElement.classList.remove('no-js');

  /* WhatsApp CTA — fix bad theme links + append page title to prefilled message */
  var waCta = document.querySelector('[data-morbeez-whatsapp-cta] a');
  if (waCta) {
    var href = waCta.getAttribute('href') || '';
    var waRoot = waCta.closest('[data-morbeez-whatsapp-cta]');
    if (href.indexOf('/pages/http') === 0) {
      try {
        href = decodeURIComponent(href.replace(/^\/pages\//, ''));
        waCta.setAttribute('href', href);
      } catch (e) {
        /* ignore */
      }
    }
    if (!href || href.indexOf('https://wa.me/') !== 0) {
      var phone = (waRoot && waRoot.getAttribute('data-wa-phone')) || '917676026318';
      phone = String(phone).replace(/\D/g, '');
      if (phone) {
        href =
          'https://wa.me/' +
          phone +
          '?text=' +
          encodeURIComponent('Hi Morbeez, I need help with ');
        waCta.setAttribute('href', href);
      }
    }
    if (href.indexOf('https://wa.me/') === 0 && document.title) {
      var extra = encodeURIComponent(' — ' + document.title);
      if (href.indexOf('text=') !== -1) {
        waCta.setAttribute('href', href + extra);
      }
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

  /* PDP — variant picker, bulk discount, quantity → live price total */
  var productForm = document.querySelector('[data-product-form]');
  if (productForm) {
    var variantPicker = productForm.querySelector('[data-variant-picker]');
    var variantInput = variantPicker ? variantPicker.querySelector('[data-variant-input]') : null;
    var priceEl = productForm.querySelector('[data-product-price]');
    var compareEl = productForm.querySelector('[data-product-compare-price]');
    var savingsEl = productForm.querySelector('[data-product-savings]');
    var unitRateEl = productForm.querySelector('[data-product-unit-rate]');
    var qtyLineEl = productForm.querySelector('[data-product-qty-line]');
    var qtyInput = productForm.querySelector('[data-qty-input]');
    var minusBtn = productForm.querySelector('[data-qty-minus]');
    var plusBtn = productForm.querySelector('[data-qty-plus]');
    var mainImg = document.querySelector('#MorbeezProduct-main-image, #MorbeezProduct-main img');
    var addBtn = productForm.querySelector('[type="submit"][name="add"]');
    var cards = variantPicker
      ? variantPicker.querySelectorAll('[data-variant-picker-card]')
      : productForm.querySelectorAll('[data-variant-picker-card]');

    var selection = {
      unitPrice: 0,
      compareUnit: 0,
      savePerUnit: 0,
      unitLabel: '',
    };

    function formatInr(cents) {
      var n = Number(cents) / 100;
      return (
        '₹' +
        n.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }

    function parseVolumeMl(title) {
      var t = (title || '').toLowerCase().replace(/,/g, '');
      var m = t.match(/(\d+(?:\.\d+)?)\s*ml\b/);
      if (m) return parseFloat(m[1]);
      m = t.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|liter|litre)\b/);
      if (m) return parseFloat(m[1]) * 1000;
      m = t.match(/(\d+(?:\.\d+)?)\s*kg\b/);
      if (m) return parseFloat(m[1]) * 1000;
      m = t.match(/(\d+(?:\.\d+)?)\s*g\b/);
      if (m) return parseFloat(m[1]);
      return null;
    }

    function formatPerLitre(centsPerL) {
      return formatInr(Math.round(centsPerL * 1000)) + '/L';
    }

    /** Baseline = highest price-per-ml (smallest pack); larger packs show % off vs that rate. */
    function buildBulkPricing() {
      var items = [];
      cards.forEach(function (card) {
        var vol = parseVolumeMl(card.getAttribute('data-variant-title'));
        var price = Number(card.getAttribute('data-price'));
        if (vol > 0 && price > 0) {
          items.push({ card: card, vol: vol, price: price, unit: price / vol });
        }
      });
      if (items.length < 2) return null;

      var baselineUnit = Math.max.apply(
        null,
        items.map(function (i) {
          return i.unit;
        })
      );
      var bestItem = items.reduce(function (a, b) {
        return b.unit < a.unit ? b : a;
      });

      items.forEach(function (item) {
        var refPrice = Math.round(baselineUnit * item.vol);
        var shopifyCompare = Number(item.card.getAttribute('data-compare-at-price')) || 0;
        var displayRef = Math.max(refPrice, shopifyCompare);
        var pct =
          displayRef > item.price ? Math.round((1 - item.price / displayRef) * 100) : 0;
        var save = displayRef - item.price;
        item.refPrice = displayRef;
        item.pct = pct >= 3 ? pct : 0;
        item.save = save > 0 ? save : 0;
        item.isBest = item.card === bestItem.card && item.pct > 0;
        item.unitPerL = (item.unit * 1000).toFixed(2);
      });

      return { items: items, baselineUnit: baselineUnit };
    }

    function paintCardBulk(item) {
      if (!item) return;
      var card = item.card;
      var badge = card.querySelector('[data-discount-badge]');
      var was = card.querySelector('[data-was-price]');
      var unit = card.querySelector('[data-unit-price]');

      card.classList.toggle('is-best-value', !!item.isBest);

      if (badge) {
        if (item.pct > 0) {
          badge.textContent = item.pct + '% off';
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (was) {
        if (item.refPrice > item.price) {
          was.textContent = formatInr(item.refPrice);
          was.classList.remove('hidden');
        } else {
          was.classList.add('hidden');
        }
      }

      if (unit && item.vol >= 1000) {
        unit.textContent = formatPerLitre(item.unit);
        unit.classList.remove('hidden');
      } else if (unit) {
        unit.textContent = formatInr(Math.round(item.unit)) + '/unit';
        unit.classList.remove('hidden');
      }
    }

    var bulk = buildBulkPricing();
    if (bulk) {
      bulk.items.forEach(paintCardBulk);
    }

    function getQty() {
      return Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
    }

    function refreshPriceDisplay() {
      var qty = getQty();
      var total = selection.unitPrice * qty;
      var compareTotal = selection.compareUnit > selection.unitPrice ? selection.compareUnit * qty : 0;
      var saveTotal = selection.savePerUnit > 0 ? selection.savePerUnit * qty : 0;

      if (priceEl) priceEl.textContent = formatInr(total);

      if (compareEl) {
        if (compareTotal > total) {
          compareEl.textContent = formatInr(compareTotal);
          compareEl.classList.remove('hidden');
        } else {
          compareEl.classList.add('hidden');
        }
      }

      if (savingsEl) {
        if (saveTotal > 0) {
          savingsEl.textContent = 'You save ' + formatInr(saveTotal);
          savingsEl.classList.remove('hidden');
        } else {
          savingsEl.classList.add('hidden');
        }
      }

      if (qtyLineEl) {
        if (qty > 1 && selection.unitPrice > 0) {
          qtyLineEl.textContent =
            qty + ' × ' + formatInr(selection.unitPrice) + (selection.unitLabel ? ' (' + selection.unitLabel + ')' : '');
          qtyLineEl.classList.remove('hidden');
        } else {
          qtyLineEl.classList.add('hidden');
        }
      }
    }

    function applySelectionFromCard(card, bulkItem) {
      var price = Number(card.getAttribute('data-price'));
      selection.unitPrice = price;
      selection.unitLabel = card.getAttribute('data-variant-title') || '';

      if (bulkItem && bulkItem.refPrice > price) {
        selection.compareUnit = bulkItem.refPrice;
        selection.savePerUnit = bulkItem.save;
      } else {
        var shopifyCompare = Number(card.getAttribute('data-compare-at-price')) || 0;
        selection.compareUnit = shopifyCompare > price ? shopifyCompare : 0;
        selection.savePerUnit = selection.compareUnit > price ? selection.compareUnit - price : 0;
      }

      if (unitRateEl && bulkItem && bulkItem.vol >= 500) {
        unitRateEl.textContent = formatPerLitre(bulkItem.unit) + ' · bigger pack, better rate';
        unitRateEl.classList.remove('hidden');
      } else if (unitRateEl) {
        unitRateEl.classList.add('hidden');
      }

      refreshPriceDisplay();
    }

    function selectCard(card) {
      if (!card || card.disabled) return;
      if (variantPicker) {
        cards.forEach(function (c) {
          c.classList.remove('is-selected');
          c.setAttribute('aria-selected', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-selected', 'true');
      }
      if (variantInput) variantInput.value = card.getAttribute('data-variant-id');

      var bulkItem = bulk
        ? bulk.items.find(function (i) {
            return i.card === card;
          })
        : null;
      applySelectionFromCard(card, bulkItem);

      var imgUrl = card.getAttribute('data-image');
      if (mainImg && imgUrl) {
        mainImg.src = imgUrl;
        if (mainImg.srcset) mainImg.removeAttribute('srcset');
      }

      var available = card.getAttribute('data-available') === 'true';
      if (addBtn) {
        addBtn.disabled = !available;
        addBtn.classList.toggle('opacity-50', !available);
        addBtn.classList.toggle('cursor-not-allowed', !available);
      }
    }

    function setQty(n) {
      var v = Math.max(1, parseInt(n, 10) || 1);
      if (qtyInput) qtyInput.value = String(v);
      refreshPriceDisplay();
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setQty(getQty() - 1);
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setQty(getQty() + 1);
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener('change', refreshPriceDisplay);
      qtyInput.addEventListener('input', refreshPriceDisplay);
    }

    cards.forEach(function (card) {
      if (variantPicker) {
        card.addEventListener('click', function () {
          selectCard(card);
        });
      }
    });

    var initial = variantPicker
      ? variantPicker.querySelector('[data-variant-picker-card].is-selected')
      : cards[0];
    if (initial) selectCard(initial);
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

  /* Header search — category dropdown jumps to collection */
  var catSelect = document.querySelector('[data-header-collection-select]');
  if (catSelect) {
    catSelect.addEventListener('change', function () {
      if (catSelect.value) window.location.href = catSelect.value;
    });
  }

  /* Hero carousel */
  document.querySelectorAll('[data-hero-carousel]').forEach(function (root) {
    var slides = root.querySelectorAll('[data-hero-slide]');
    if (slides.length < 2) return;

    var index = 0;
    var autoplay = root.getAttribute('data-autoplay') === 'true';
    var interval = parseInt(root.getAttribute('data-interval'), 10) || 5000;
    var timer;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (slide, n) {
        var active = n === index;
        slide.classList.toggle('opacity-100', active);
        slide.classList.toggle('z-10', active);
        slide.classList.toggle('opacity-0', !active);
        slide.classList.toggle('z-0', !active);
      });
      root.querySelectorAll('[data-hero-dot]').forEach(function (dot, n) {
        dot.classList.toggle('!w-8', n === index);
        dot.classList.toggle('bg-white', n === index);
        dot.classList.toggle('bg-white/40', n !== index);
      });
    }

    function next() {
      show(index + 1);
    }
    function prev() {
      show(index - 1);
    }

    var nextBtn = root.querySelector('[data-hero-next]');
    var prevBtn = root.querySelector('[data-hero-prev]');
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    root.querySelectorAll('[data-hero-dot]').forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(parseInt(dot.getAttribute('data-hero-dot'), 10));
      });
    });

    function startAutoplay() {
      if (!autoplay) return;
      timer = setInterval(next, interval);
    }
    function stopAutoplay() {
      if (timer) clearInterval(timer);
    }

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    startAutoplay();
  });
})();
