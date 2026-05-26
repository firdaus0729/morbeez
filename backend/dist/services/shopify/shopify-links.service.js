import { env } from '../../config/env.js';
function storefrontBase() {
    const base = env.SHOPIFY_STOREFRONT_URL?.replace(/\/$/, '');
    if (base)
        return base;
    const domain = env.SHOPIFY_STORE_DOMAIN?.replace(/\/$/, '');
    return domain ? `https://${domain}` : 'https://morbeez.in';
}
export const shopifyLinksService = {
    productUrl(handle) {
        const h = handle.replace(/^\//, '').replace(/^products\//, '');
        return `${storefrontBase()}/products/${h}`;
    },
    cartUrl() {
        return `${storefrontBase()}/cart`;
    },
    formatRecommendationsForWhatsApp(recommendations, language) {
        if (!recommendations.length)
            return '';
        const header = language === 'ml'
            ? '🛒 ശുപാർശ ചെയ്യുന്ന ഉൽപ്പന്നങ്ങൾ:'
            : '🛒 Suggested products:';
        const lines = recommendations.slice(0, 3).map((p, i) => {
            const url = p.shopifyProductHandle
                ? shopifyLinksService.productUrl(p.shopifyProductHandle)
                : shopifyLinksService.cartUrl();
            return `${i + 1}. ${p.productTitle}\n   ${url}`;
        });
        const footer = language === 'ml'
            ? `\nകാർട്ട്: ${shopifyLinksService.cartUrl()}`
            : `\nView cart: ${shopifyLinksService.cartUrl()}`;
        return `${header}\n\n${lines.join('\n\n')}${footer}`;
    },
};
//# sourceMappingURL=shopify-links.service.js.map