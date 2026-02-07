import { ID, ISODateString, Money } from "./common";

export enum PaymentMethod {
  CARD = "CARD",
  PIX = "PIX",
  BANK_SLIP = "BANK_SLIP"
}

export enum PaymentProvider {
  STRIPE = "STRIPE",
  ADYEN = "ADYEN",
  MERCADO_PAGO = "MERCADO_PAGO"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

export interface Payment {
  id: ID;
  orderId: ID;
  amount: Money;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  customerEmail?: string;
  providerReference?: string;
  failureReason?: string;
  authorizedAt?: ISODateString;
  capturedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PaymentWebhookEvent {
  orderId: ID;
  provider: PaymentProvider;
  providerReference: string;
  status: PaymentStatus;
  occurredAt: ISODateString;
}
