/**
 * Morbeez checkout — Razorpay Orders API (replaces Shopify native checkout).
 */
(function () {
  var cfg = window.MORBEEZ_CHECKOUT || {};
  var apiBase = (cfg.apiBase || '').replace(/\/$/, '');

  function $(id) {
    return document.getElementById(id);
  }

  function formatInr(paise) {
    return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function fetchCart() {
    var res = await fetch('/cart.js', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not load cart');
    return res.json();
  }

  async function clearCart() {
    await fetch('/cart/clear.js', { method: 'POST', credentials: 'same-origin' });
  }

  function showError(msg) {
    var el = $('checkout-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError() {
    var el = $('checkout-error');
    if (el) el.classList.add('hidden');
  }

  var cartData = null;

  function renderSummary(cart) {
    var lines = $('checkout-lines');
    var total = $('checkout-total');
    if (!lines || !total) return;

    lines.innerHTML = cart.items
      .map(function (item) {
        return (
          '<li class="flex justify-between gap-2">' +
          '<span>' +
          item.quantity +
          ' × ' +
          item.product_title +
          (item.variant_title && item.variant_title !== 'Default Title' ? ' (' + item.variant_title + ')' : '') +
          '</span>' +
          '<span class="shrink-0 font-semibold">' +
          formatInr(item.final_line_price) +
          '</span></li>'
        );
      })
      .join('');

    total.textContent = formatInr(cart.total_price);
  }

  function cartToPayload(cart, form) {
    var fd = new FormData(form);
    return {
      lineItems: cart.items.map(function (item) {
        return {
          variantId: item.variant_id,
          quantity: item.quantity,
          title: item.product_title + (item.variant_title ? ' — ' + item.variant_title : ''),
          price: item.price,
        };
      }),
      customer: {
        email: fd.get('email'),
        phone: String(fd.get('phone')).replace(/\D/g, ''),
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
      },
      shipping: {
        address1: fd.get('address1'),
        address2: fd.get('address2') || undefined,
        city: fd.get('city'),
        province: fd.get('province'),
        zip: fd.get('zip'),
        country: 'IN',
      },
    };
  }

  function openRazorpay(order, prefill) {
    return new Promise(function (resolve, reject) {
      if (!window.Razorpay) {
        reject(new Error('Razorpay failed to load'));
        return;
      }

      var options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Morbeez',
        description: 'Agriculture products order',
        order_id: order.razorpayOrderId,
        prefill: prefill || {},
        theme: { color: '#34B35E' },
        handler: function (response) {
          resolve(response);
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled'));
          },
        },
      };

      var rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        reject(new Error(resp.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  }

  async function init() {
    var empty = $('checkout-empty');
    var form = $('morbeez-checkout-form');

    try {
      cartData = await fetchCart();
    } catch (e) {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (!cartData.items || cartData.items.length === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (form) form.classList.remove('hidden');
    renderSummary(cartData);

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      hideError();
      var btn = $('checkout-pay-btn');
      var btnLabel = btn && btn.dataset.label ? btn.dataset.label : 'Pay securely with Razorpay';
      if (btn) {
        btn.disabled = true;
        btn.textContent = btn.dataset.processing || 'Processing…';
      }

      try {
        var payload = cartToPayload(cartData, form);
        var createRes = await fetch(apiBase + '/api/v1/checkout/razorpay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.message || createData.error || 'Could not start payment');

        var payment = await openRazorpay(createData, createData.prefill);

        var verifyRes = await fetch(apiBase + '/api/v1/checkout/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
          }),
        });
        var verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.message || verifyData.error || 'Payment verification failed');

        await clearCart();
        var success =
          cfg.successUrl +
          '?order=' +
          encodeURIComponent(verifyData.orderName || verifyData.shopifyOrderId || '');
        window.location.href = success;
      } catch (err) {
        if (err.message !== 'Payment cancelled') {
          showError(err.message || 'Checkout failed');
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = btnLabel;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
