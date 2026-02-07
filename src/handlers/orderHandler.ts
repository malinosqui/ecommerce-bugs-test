import { AppError } from "../models/common";
import { CreateOrderInput } from "../models/order";
import { NotificationService } from "../services/NotificationService";
import { OrderService } from "../services/OrderService";
import { PaymentService } from "../services/PaymentService";
import { ProductService } from "../services/ProductService";
import { UserService } from "../services/UserService";

export interface HttpRequest<T> {
  body: T;
  headers?: Record<string, string>;
}

export interface HttpResponse {
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

export const createOrderHandler = async (
  request: HttpRequest<CreateOrderInput>
): Promise<HttpResponse> => {
  try {
    const order = await orderService.createOrder(request.body);

    return {
      statusCode: 201,
      body: {
        orderId: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.totals.total
      }
    };
  } catch (error) {
    return handleError(error);
  }
};

const handleError = (error: unknown): HttpResponse => {
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
