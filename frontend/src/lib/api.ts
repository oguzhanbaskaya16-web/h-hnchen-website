const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL fehlt. Bitte frontend/.env.local konfigurieren.",
  );
}

export type PaymentMethod = {
  id: number;
  name: string;
  isOnlinePayment: boolean;
};

export type PaymentMethodsResponse = {
  paymentMethods: PaymentMethod[];
};

export type MenuOption = {
  id: number;
  productId: number;
  name: string;
  surcharge: string;
};

export type MenuOptionGroup = {
  id: number;
  name: string;
  optionType: string;
  minSelections: number;
  maxSelections: number;
  options: MenuOption[];
};

export type MenuProduct = {
  id: number;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: string;
  image: string | null;
  preparationTimeMinutes: number | null;
  allergenInformation: string | null;
  isHighlight: boolean;
  optionGroups: MenuOptionGroup[];
};

export type MenuCategory = {
  id: number;
  name: string;
  description: string | null;
  products: MenuProduct[];
};

export type MenuResponse = {
  categories: MenuCategory[];
};

export type CartOption = {
  id: number;
  productId: number;
  name: string;
  surcharge: string;
};

export type CartItem = {
  itemId: number;
  product: {
    id: number;
    name: string;
  };
  quantity: number;
  baseUnitPrice: string;
  options: CartItemOption[];
  optionSurcharge: string;
  unitTotal: string;
  lineTotal: string;
};

export type CartResponse = {
  cartId: string;
  status: string;
  currency: "EUR";
  items: CartItem[];
  subtotal: string;
  createdAt: string;
  updatedAt: string;
};

export type AddCartItemRequest = {
  productId: number;
  quantity: number;
  optionIds?: number[];
};

/*
 * Warenkorb
 */

export type CartItemOption = {
  id: number;
  name: string;
  surcharge: string;
};

export type Cart = {
  cartId: string;
  status: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  total: string;
};

export type AddCartItemInput = {
  productId: number;
  quantity: number;
  optionIds?: number[];
};

export type UpdateCartItemInput = {
  quantity?: number;
  optionIds?: number[];
};

export type OrderCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type OrderPayment = {
  id: number;
  method: {
    id: number;
    name: string;
    isOnlinePayment: boolean;
  };
  amount: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

export type OrderItem = {
  itemId: number;
  product: {
    id: number | null;
    name: string;
  };
  quantity: number;
  baseUnitPrice: string;
  options: CartItemOption[];
  optionSurcharge: string;
  unitTotal: string;
  lineTotal: string;
};

export type Order = {
  orderNumber: string;
  orderType: string;
  status: string;
  orderedAt: string;
  requestedTime: string;
  customer: OrderCustomer | null;
  note: string | null;
  payments: OrderPayment[];
  items: OrderItem[];
  subtotal: string;
  deliveryFee: string;
  discountAmount: string;
  totalAmount: string;
};

export type CreateOrderInput = {
  cartId: string;
  paymentMethodId: number;
  customer: OrderCustomer;
  requestedTime?: string;
  note?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `API-Anfrage fehlgeschlagen (${response.status})`;

    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Antwort war kein JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

/*
 * Menü
 */

export function getMenu(): Promise<MenuResponse> {
  return apiRequest<MenuResponse>("/menu");
}

/*
 * Warenkorb
 */

export function createCart(): Promise<Cart> {
  return apiRequest<Cart>("/carts", {
    method: "POST",
  });
}

export function getCart(cartId: string): Promise<Cart> {
  return apiRequest<Cart>(`/carts/${encodeURIComponent(cartId)}`);
}

export function addCartItem(
  cartId: string,
  input: AddCartItemInput,
): Promise<Cart> {
  return apiRequest<Cart>(`/carts/${encodeURIComponent(cartId)}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCartItem(
  cartId: string,
  itemId: number,
  input: UpdateCartItemInput,
): Promise<Cart> {
  return apiRequest<Cart>(
    `/carts/${encodeURIComponent(cartId)}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function removeCartItem(cartId: string, itemId: number): Promise<Cart> {
  return apiRequest<Cart>(
    `/carts/${encodeURIComponent(cartId)}/items/${itemId}`,
    {
      method: "DELETE",
    },
  );
}

export function clearCart(cartId: string): Promise<Cart> {
  return apiRequest<Cart>(`/carts/${encodeURIComponent(cartId)}/items`, {
    method: "DELETE",
  });
}

/*
 * Hilfsfunktionen
 */

export function formatPrice(value: string | number): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/*
 * Bestellungen
 */

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiRequest<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getOrder(orderNumber: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderNumber)}`);
}

export function getOrderPdfUrl(orderNumber: string): string {
  return `${API_URL}/orders/${encodeURIComponent(orderNumber)}/pdf`;
}

export function getPaymentMethods(): Promise<PaymentMethodsResponse> {
  return apiRequest<PaymentMethodsResponse>("/orders/payment-methods");
}
