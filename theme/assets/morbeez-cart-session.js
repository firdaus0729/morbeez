/**
 * Keeps Shopify cart aligned with the logged-in Morbeez farmer.
 * Morbeez auth (Supabase) and Shopify cart are separate — this clears the
 * browser cart when a different farmer signs in so each user starts fresh.
 */
(function (global) {
  var FARMER_ID_KEY = 'morbeez_farmer_id';
  var TOKEN_KEY = 'morbeez_farmer_token';

  function formatMoney(cents) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(cents);
    }
    return '₹' + (cents / 100).toFixed(2);
  }

  function updateCartUI(cart) {
    var count = cart.item_count || 0;
    var total = cart.total_price || 0;

    document.querySelectorAll('[data-morbeez-cart-count]').forEach(function (el) {
      el.textContent = String(count);
      el.classList.toggle('hidden', count === 0);
    });

    document.querySelectorAll('[data-morbeez-cart-total]').forEach(function (el) {
      el.textContent = formatMoney(total);
    });

    document.dispatchEvent(new CustomEvent('morbeez:cart-updated', { detail: cart }));
  }

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' }).then(function (res) {
      return res.json();
    });
  }

  function clearShopifyCart() {
    return fetch('/cart/clear.js', { method: 'POST', credentials: 'same-origin' })
      .then(function (res) {
        return res.json();
      })
      .then(function (cart) {
        updateCartUI(cart);
        return cart;
      });
  }

  /**
   * Call after login/signup or when /me returns a farmer.
   * Clears Shopify cart if this farmer is new on this browser (or switched user).
   */
  function syncCartForFarmer(farmer) {
    if (!farmer || !farmer.id) return Promise.resolve();

    var prev = null;
    try {
      prev = localStorage.getItem(FARMER_ID_KEY);
    } catch (e) {}

    try {
      localStorage.setItem(FARMER_ID_KEY, farmer.id);
    } catch (e) {}

    if (!prev || prev !== farmer.id) {
      return clearShopifyCart();
    }

    return fetchCart().then(updateCartUI).catch(function () {});
  }

  /** Call on logout — guest cart starts empty for the next visitor */
  function onFarmerLogout() {
    try {
      localStorage.removeItem(FARMER_ID_KEY);
    } catch (e) {}
    return clearShopifyCart();
  }

  function getStoredFarmerId() {
    try {
      return localStorage.getItem(FARMER_ID_KEY);
    } catch (e) {
      return null;
    }
  }

  global.MorbeezCart = {
    syncCartForFarmer: syncCartForFarmer,
    onFarmerLogout: onFarmerLogout,
    clearShopifyCart: clearShopifyCart,
    getStoredFarmerId: getStoredFarmerId,
    FARMER_ID_KEY: FARMER_ID_KEY,
    TOKEN_KEY: TOKEN_KEY,
  };
})(window);
