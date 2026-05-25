import { shopifyAdmin } from './shopify.client.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  tags: string;
  created_at: string;
  updated_at: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string | null;
    inventory_quantity: number;
  }>;
  image?: { src: string } | null;
}

interface ProductsResponse {
  products: ShopifyProduct[];
}

interface ProductResponse {
  product: ShopifyProduct;
}

function mapProduct(p: ShopifyProduct & { body_html?: string }) {
  const v = p.variants?.[0];
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
    imageUrl: p.image?.src ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export const shopifyProductsService = {
  async list(query: ProductListQuery) {
    const limit = Math.min(50, Math.max(1, query.limit ?? 25));
    const page = Math.max(1, query.page ?? 1);

    let path = `/products.json?limit=${limit}&fields=id,title,handle,status,vendor,product_type,tags,created_at,updated_at,variants,image`;
    if (query.search?.trim()) {
      path += `&title=${encodeURIComponent(query.search.trim())}`;
    }

    const res = await shopifyAdmin<ProductsResponse>(path);
    const products = (res.products ?? []).map(mapProduct);

    return {
      products,
      pagination: {
        page,
        limit,
        total: products.length,
        pages: products.length < limit ? page : page + 1,
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
      body_html: input.bodyHtml ?? undefined,
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
    return mapProduct(res.product);
  },
};
