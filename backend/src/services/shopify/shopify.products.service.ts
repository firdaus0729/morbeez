import { shopifyAdmin, shopifyAdminRaw } from './shopify.client.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity: number;
}

interface ShopifyImage {
  id: number;
  src: string;
  position: number;
  alt: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  tags: string;
  body_html?: string;
  created_at: string;
  updated_at: string;
  variants: ShopifyVariant[];
  image?: ShopifyImage | null;
  images?: ShopifyImage[];
}

interface ProductsResponse {
  products: ShopifyProduct[];
}

interface ProductResponse {
  product: ShopifyProduct;
}

interface CountResponse {
  count: number;
}

const LIST_FIELDS =
  'id,title,handle,status,vendor,product_type,tags,created_at,updated_at,variants,image,images';

const CACHE_TTL_MS = 60_000;
let productListCache: { at: number; items: ShopifyProduct[] } | null = null;

function clearProductListCache() {
  productListCache = null;
}

function mapProduct(p: ShopifyProduct) {
  const v = p.variants?.[0];
  const images: ShopifyImage[] = [...(p.images ?? [])];
  if (!images.length && p.image) images.push(p.image);
  const sorted = images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return {
    id: String(p.id),
    title: p.title,
    handle: p.handle,
    status: p.status,
    vendor: p.vendor,
    productType: p.product_type,
    tags: p.tags,
    bodyHtml: p.body_html ?? '',
    price: v?.price ?? null,
    sku: v?.sku ?? null,
    inventory: v?.inventory_quantity ?? 0,
    imageUrl: sorted[0]?.src ?? null,
    images: sorted.map((img) => ({
      id: String(img.id),
      src: img.src,
      alt: img.alt,
      position: img.position,
    })),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

/** Fetch all products from Shopify (cursor pagination, max 250/page). */
async function fetchAllProducts(search?: string): Promise<ShopifyProduct[]> {
  const searchTerm = search?.trim().toLowerCase();

  if (!searchTerm && productListCache && Date.now() - productListCache.at < CACHE_TTL_MS) {
    return productListCache.items;
  }

  const all: ShopifyProduct[] = [];
  let pageInfo: string | null = null;

  for (let guard = 0; guard < 50; guard++) {
    let path: string;
    if (pageInfo) {
      path = `/products.json?limit=250&page_info=${encodeURIComponent(pageInfo)}`;
    } else {
      path = `/products.json?limit=250&fields=${LIST_FIELDS}`;
    }

    const { data, links } = await shopifyAdminRaw(path);
    const batch = (data as ProductsResponse).products ?? [];
    all.push(...batch);

    if (!links.nextPageInfo) break;
    pageInfo = links.nextPageInfo;
  }

  if (!searchTerm) {
    productListCache = { at: Date.now(), items: all };
    return all;
  }

  return all.filter((p) => {
    const hay = `${p.title} ${p.handle} ${p.vendor} ${p.tags} ${p.product_type}`.toLowerCase();
    return hay.includes(searchTerm);
  });
}

export const shopifyProductsService = {
  async count(): Promise<number> {
    const res = await shopifyAdmin<CountResponse>('/products/count.json');
    return res.count ?? 0;
  },

  async list(query: ProductListQuery) {
    const limit = Math.min(100, Math.max(10, query.limit ?? 50));
    const page = Math.max(1, query.page ?? 1);

    const all = await fetchAllProducts(query.search);
    const total = all.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;
    const slice = all.slice(start, start + limit);

    return {
      products: slice.map(mapProduct),
      pagination: {
        page: safePage,
        limit,
        total,
        pages,
      },
    };
  },

  async get(id: string) {
    try {
      const res = await shopifyAdmin<ProductResponse>(`/products/${id}.json`);
      return mapProduct(res.product);
    } catch {
      throw new NotFoundError('Product not found');
    }
  },

  async create(input: {
    title: string;
    bodyHtml?: string;
    vendor?: string;
    productType?: string;
    tags?: string;
    status?: 'active' | 'draft' | 'archived';
    price?: string;
    sku?: string;
  }) {
    if (!input.title?.trim()) throw new ValidationError('Product title is required');

    const product: Record<string, unknown> = {
      title: input.title.trim(),
      body_html: input.bodyHtml ?? '',
      vendor: input.vendor ?? 'Morbeez',
      product_type: input.productType ?? '',
      tags: input.tags ?? '',
      status: input.status ?? 'draft',
      variants: [
        {
          price: input.price ?? '0.00',
          sku: input.sku ?? undefined,
          inventory_management: null,
        },
      ],
    };

    const res = await shopifyAdmin<ProductResponse>('/products.json', {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
    clearProductListCache();
    return mapProduct(res.product);
  },

  async update(
    id: string,
    input: {
      title?: string;
      bodyHtml?: string;
      vendor?: string;
      productType?: string;
      tags?: string;
      status?: 'active' | 'draft' | 'archived';
      price?: string;
      sku?: string;
    }
  ) {
    const existing = await shopifyAdmin<ProductResponse>(`/products/${id}.json`);
    const p = existing.product;
    const variantId = p.variants?.[0]?.id;

    const product: Record<string, unknown> = {
      id: Number(id),
      title: input.title ?? p.title,
      body_html: input.bodyHtml ?? p.body_html,
      vendor: input.vendor ?? p.vendor,
      product_type: input.productType ?? p.product_type,
      tags: input.tags ?? p.tags,
      status: input.status ?? p.status,
    };

    if (input.price !== undefined || input.sku !== undefined) {
      product.variants = [
        {
          id: variantId,
          price: input.price ?? p.variants[0]?.price,
          sku: input.sku ?? p.variants[0]?.sku,
        },
      ];
    }

    const res = await shopifyAdmin<ProductResponse>(`/products/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product }),
    });
    clearProductListCache();
    return mapProduct(res.product);
  },

  async uploadImage(
    productId: string,
    input: { fileName: string; mimeType: string; dataBase64: string; alt?: string }
  ) {
    const raw = input.dataBase64.replace(/^data:[^;]+;base64,/, '').trim();
    if (!raw) throw new ValidationError('Image data is required');

    const image: Record<string, unknown> = {
      attachment: raw,
      filename: input.fileName || 'product-image.jpg',
    };
    if (input.alt) image.alt = input.alt;

    const res = await shopifyAdmin<{ image: ShopifyImage }>(`/products/${productId}/images.json`, {
      method: 'POST',
      body: JSON.stringify({ image }),
    });

    clearProductListCache();
    return {
      id: String(res.image.id),
      src: res.image.src,
      alt: res.image.alt,
      position: res.image.position,
    };
  },

  async deleteImage(productId: string, imageId: string) {
    await shopifyAdminRaw(`/products/${productId}/images/${imageId}.json`, {
      method: 'DELETE',
    });
    clearProductListCache();
    return { ok: true };
  },
};
