import { FEATURE_FLAGS } from "../config/featureFlags";
import { ENV } from "../config/env";
import { AppError, ID, Money, generateId, nowIso } from "../models/common";
import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookEvent
} from "../models/payment";
import { createLogger } from "../utils/logger";
import { formatMoney } from "../utils/money";
import { requireNonEmptyString } from "../utils/validators";
import { NotificationService } from "./NotificationService";

export class PaymentService {
  private logger = createLogger("PaymentService");
  private payments = new Map<ID, Payment>();
  private paymentByOrder = new Map<ID, ID>();

  constructor(private notificationService: NotificationService) {}

  async authorizePayment(
    orderId: ID,
    amount: Money,
    method: PaymentMethod,
    customerEmail: string
  ): Promise<Payment> {
    if (method === PaymentMethod.BANK_SLIP && !FEATURE_FLAGS.enableBankSlip) {
      throw new AppError({
        code: "BANK_SLIP_DISABLED",
        message: "Bank slip payments are disabled",
        status: 400
      });
    }

    await this.simulateProviderLatency();

    const status = this.needsManualReview(amount) ? PaymentStatus.PENDING : PaymentStatus.AUTHORIZED;
    const provider = this.selectProvider(method);

    const payment: Payment = {
      id: generateId("pay"),
      orderId,
      amount,
      status,
      method,
      provider,
      customerEmail,
      providerReference: generateId("ref"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      authorizedAt: status === PaymentStatus.AUTHORIZED ? nowIso() : undefined
    };

    this.payments.set(payment.id, payment);
    this.paymentByOrder.set(orderId, payment.id);

    this.logger.info("Payment authorized", {
      orderId,
      paymentId: payment.id,
      status: payment.status,
      amount: formatMoney(amount)
    });

    if (status === PaymentStatus.PENDING && FEATURE_FLAGS.enablePaymentNotifications) {
      await this.notificationService.send("manualReview", customerEmail, { orderId });
    }

    return payment;
  }

  async capturePayment(paymentId: ID): Promise<Payment> {
    const payment = this.getPayment(paymentId);
    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new AppError({
        code: "CAPTURE_NOT_ALLOWED",
        message: "Payment is not authorized for capture",
        status: 409,
        details: { paymentId, status: payment.status }
      });
    }

    await this.simulateProviderLatency();

    payment.status = PaymentStatus.CAPTURED;
    payment.capturedAt = nowIso();
    payment.updatedAt = nowIso();
    this.payments.set(payment.id, payment);

    if (FEATURE_FLAGS.enablePaymentNotifications && payment.customerEmail) {
      await this.notificationService.send("paymentCaptured", payment.customerEmail, { orderId: payment.orderId });
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: ID): Promise<Payment | undefined> {
    const paymentId = this.paymentByOrder.get(orderId);
    return paymentId ? this.payments.get(paymentId) : undefined;
  }

  async applyWebhook(event: PaymentWebhookEvent): Promise<Payment> {
    const existing = await this.getPaymentByOrderId(event.orderId);
    if (!existing) {
      throw new AppError({
        code: "PAYMENT_NOT_FOUND",
        message: "Payment not found for order",
        status: 404,
        details: { orderId: event.orderId }
      });
    }

    existing.status = event.status;
    existing.providerReference = event.providerReference;
    existing.updatedAt = nowIso();
    if (event.status === PaymentStatus.CAPTURED) {
      existing.capturedAt = nowIso();
    }
    this.payments.set(existing.id, existing);

    if (event.status === PaymentStatus.FAILED && FEATURE_FLAGS.enablePaymentNotifications) {
      await this.notificationService.send("paymentFailed", existing.customerEmail ?? "", {
        orderId: existing.orderId,
        reason: existing.failureReason ?? "Provider failure"
      });
    }

    return existing;
  }

  parseWebhook(payload: unknown): PaymentWebhookEvent {
    if (!payload || typeof payload !== "object") {
      throw new AppError({
        code: "INVALID_WEBHOOK",
        message: "Webhook payload must be an object",
        status: 400
      });
    }

    const body = payload as Record<string, string>;
    const orderId = requireNonEmptyString(body.orderId, "orderId");
    const providerReference = requireNonEmptyString(body.providerReference, "providerReference");
    const provider = (body.provider as PaymentProvider) || PaymentProvider.STRIPE;
    const status = (body.status as PaymentStatus) || PaymentStatus.FAILED;

    return {
      orderId,
      provider,
      providerReference,
      status,
      occurredAt: nowIso()
    };
  }

  private getPayment(paymentId: ID): Payment {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new AppError({
        code: "PAYMENT_NOT_FOUND",
        message: "Payment not found",
        status: 404,
        details: { paymentId }
      });
    }
    return payment;
  }

  private selectProvider(method: PaymentMethod): PaymentProvider {
    if (method === PaymentMethod.PIX) return PaymentProvider.MERCADO_PAGO;
    if (method === PaymentMethod.BANK_SLIP) return PaymentProvider.ADYEN;
    return PaymentProvider.STRIPE;
  }

  private needsManualReview(amount: Money): boolean {
    return FEATURE_FLAGS.enableManualReview && amount.amount > 5000;
  }

  private async simulateProviderLatency(): Promise<void> {
    const latency = Math.min(ENV.PAYMENT_PROVIDER_TIMEOUT_MS, 300);
    await new Promise((resolve) => setTimeout(resolve, latency));
  }
}
