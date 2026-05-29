/** Morbeez staff operations portal — URL prefix for SPA + API (not Shopify /admin). */

export const STAFF_PORTAL_PATH = '/morbeez-staff';

/** Trailing slash — static asset prefix */
export const STAFF_PORTAL_PREFIX = `${STAFF_PORTAL_PATH}/`;

/** Admin / staff REST API base (v1) */
export const STAFF_API_V1 = `${STAFF_PORTAL_PATH}/api/v1`;

/** @deprecated Use STAFF_PORTAL_PATH — legacy /console path */
export const LEGACY_CONSOLE_PATH = '/console';
