import { ID, ISODateString, Money } from "./common";
import { Payment, PaymentMethod, PaymentStatus } from "./payment";

export enum OrderStatus {
  CREATED = "CREATED",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED"
}

export enum ShippingOption {
  STANDARD = "STANDARD",
  EXPRESS = "EXPRESS",
  PICKUP = "PICKUP"
}

export interface OrderItem {
  productId: ID;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}

export interface OrderItemInput {
  productId: ID;
  quantity: number;
}

export interface CreateOrderInput {
  userId: ID;
  items: OrderItemInput[];
  shippingOption?: ShippingOption;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface OrderTotals {
  subtotal: Money;
  tax: Money;
  shipping: Money;
  discount: Money;
  total: Money;
}

export interface Order {
  id: ID;
  userId: ID;
  items: OrderItem[];
  totals: OrderTotals;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment?: Payment;
  shippingOption: ShippingOption;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
