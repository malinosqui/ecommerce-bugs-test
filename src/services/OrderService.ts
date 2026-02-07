import { ENV } from "../config/env";
import { FEATURE_FLAGS } from "../config/featureFlags";
import { AppError, ID, Money, nowIso, generateId } from "../models/common";
import {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  OrderTotals,
  ShippingOption
} from "../models/order";
import { PaymentStatus } from "../models/payment";
import { createLogger } from "../utils/logger";
import { addMoney, formatMoney, makeMoney, multiplyMoney, subtractMoney } from "../utils/money";
import { ensureArrayNotEmpty } from "../utils/validators";
import { NotificationService } from "./NotificationService";
import { PaymentService } from "./PaymentService";
import { ProductService } from "./ProductService";
import { UserService } from "./UserService";

export interface OrderServiceDeps {
  userService: UserService;
  productService: ProductService;
  paymentService: PaymentService;
  notificationService: NotificationService;
}

export class OrderService {
  private logger = createLogger("OrderService");
  private orders = new Map<ID, Order>();

  constructor(private deps: OrderServiceDeps) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const items = ensureArrayNotEmpty(input.items, "items");
    const user = await this.deps.userService.getUserById(input.userId);

    await this.deps.userService.requirePrimaryAddress(user.id);

    const orderItems = await this.deps.productService.buildOrderItems(items);
    await this.deps.productService.reserveStock(items);

    const totals = this.calculateTotals(orderItems, input.shippingOption ?? ShippingOption.STANDARD);
    const order: Order = {
      id: generateId("order"),
      userId: user.id,
      items: orderItems,
      totals,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      shippingOption: input.shippingOption ?? ShippingOption.STANDARD,
      notes: input.notes,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    this.orders.set(order.id, order);

    const payment = await this.deps.paymentService.authorizePayment(
      order.id,
      totals.total,
      input.paymentMethod,
      user.email
    );

    order.payment = payment;
    order.paymentStatus = payment.status;

    if (payment.status === PaymentStatus.AUTHORIZED && FEATURE_FLAGS.autoCapturePayments) {
      order.payment = await this.deps.paymentService.capturePayment(payment.id);
      order.paymentStatus = order.payment.status;
    }

    order.status = this.resolveOrderStatus(order.paymentStatus);
    order.updatedAt = nowIso();
    this.orders.set(order.id, order);

    if (order.status === OrderStatus.PAID) {
      await this.deps.notificationService.send("orderConfirmation", user.email, {
        orderId: order.id,
        total: formatMoney(order.totals.total)
      });
    }

    return order;
  }

  async getOrderById(orderId: ID): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new AppError({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
        status: 404,
        details: { orderId }
      });
    }
    return order;
  }

  async syncPaymentStatus(orderId: ID, status: PaymentStatus): Promise<Order> {
    const order = await this.getOrderById(orderId);
    order.paymentStatus = status;
    order.status = this.resolveOrderStatus(status);
    order.updatedAt = nowIso();
    this.orders.set(order.id, order);

    if (status === PaymentStatus.CAPTURED) {
      const user = await this.deps.userService.getUserById(order.userId);
      await this.deps.notificationService.send("orderConfirmation", user.email, {
        orderId: order.id,
        total: formatMoney(order.totals.total)
      });
    }

    if (status === PaymentStatus.FAILED) {
      const user = await this.deps.userService.getUserById(order.userId);
      await this.deps.notificationService.send("paymentFailed", user.email, {
        orderId: order.id,
        reason: order.payment?.failureReason ?? "Provider failure"
      });
    }

    this.logger.info("Order payment status synced", { orderId: order.id, status });
    return order;
  }

  private resolveOrderStatus(status: PaymentStatus): OrderStatus {
    if (status === PaymentStatus.CAPTURED) return OrderStatus.PAID;
    if (status === PaymentStatus.FAILED) return OrderStatus.PENDING_PAYMENT;
    return OrderStatus.PENDING_PAYMENT;
  }

  private calculateTotals(items: OrderItem[], shippingOption: ShippingOption): OrderTotals {
    const currency = items[0]?.unitPrice.currency ?? ENV.DEFAULT_CURRENCY;
    let subtotal = makeMoney(0, currency);

    for (const item of items) {
      subtotal = addMoney(subtotal, item.totalPrice);
    }

    const tax = multiplyMoney(subtotal, ENV.TAX_RATE);
    const shipping = this.calculateShipping(subtotal, shippingOption);
    const discount = this.calculateDiscount(subtotal);
    const total = subtractMoney(addMoney(addMoney(subtotal, tax), shipping), discount);

    return { subtotal, tax, shipping, discount, total };
  }

  private calculateShipping(subtotal: Money, option: ShippingOption): Money {
    const base = ENV.SHIPPING_BASE;
    const multiplier = option === ShippingOption.EXPRESS ? 1.6 : option === ShippingOption.PICKUP ? 0 : 1;
    return makeMoney(base * multiplier, subtotal.currency);
  }

  private calculateDiscount(subtotal: Money): Money {
    if (subtotal.amount >= 2000) {
      return makeMoney(subtotal.amount * 0.05, subtotal.currency);
    }
    return makeMoney(0, subtotal.currency);
  }
}
