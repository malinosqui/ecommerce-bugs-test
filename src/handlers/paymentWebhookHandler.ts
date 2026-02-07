import { AppError } from "../models/common";
import { PaymentWebhookEvent } from "../models/payment";
import { NotificationService } from "../services/NotificationService";
import { OrderService } from "../services/OrderService";
import { PaymentService } from "../services/PaymentService";
import { ProductService } from "../services/ProductService";
import { UserService } from "../services/UserService";

export interface WebhookRequest {
  body: unknown;
  headers?: Record<string, string>;
}

export interface WebhookResponse {
  statusCode: number;
  body: unknown;
}

const notificationService = new NotificationService();
const userService = new UserService(notificationService);
const productService = new ProductService();
const paymentService = new PaymentService(notificationService);
const orderService = new OrderService({
  userService,
  productService,
  paymentService,
  notificationService
});

export const paymentWebhookHandler = async (request: WebhookRequest): Promise<WebhookResponse> => {
  try {
    const event: PaymentWebhookEvent = paymentService.parseWebhook(request.body);
    const payment = await paymentService.applyWebhook(event);
    const order = await orderService.syncPaymentStatus(event.orderId, event.status);

    return {
      statusCode: 200,
      body: {
        orderId: order.id,
        paymentId: payment.id,
        paymentStatus: payment.status,
        orderStatus: order.status
      }
    };
  } catch (error) {
    return handleError(error);
  }
};

const handleError = (error: unknown): WebhookResponse => {
  if (error instanceof AppError) {
    return {
      statusCode: error.status,
      body: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "Unexpected error"
    }
  };
};
