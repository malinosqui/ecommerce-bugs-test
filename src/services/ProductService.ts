import { FEATURE_FLAGS } from "../config/featureFlags";
import { ENV } from "../config/env";
import { AppError, ID, generateId } from "../models/common";
import { Product, Category, InventoryStatus } from "../models/product";
import { OrderItem, OrderItemInput } from "../models/order";
import { createLogger } from "../utils/logger";
import { makeMoney, multiplyMoney } from "../utils/money";
import { ensurePositiveInt } from "../utils/validators";

export class ProductService {
  private logger = createLogger("ProductService");
  private products = new Map<ID, Product>();

  constructor() {
    this.seed();
  }

  async getProductById(productId: ID): Promise<Product> {
    const product = this.products.get(productId);
    if (!product || !product.active) {
      throw new AppError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
        status: 404,
        details: { productId }
      });
    }
    return product;
  }

  async buildOrderItems(items: OrderItemInput[]): Promise<OrderItem[]> {
    const result: OrderItem[] = [];

    for (const item of items) {
      const quantity = ensurePositiveInt(item.quantity, "quantity");
      const product = await this.getProductById(item.productId);

      if (product.stock < quantity && !FEATURE_FLAGS.allowBackorder) {
        throw new AppError({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient stock for ${product.name}`,
          status: 409,
          details: { productId: product.id, stock: product.stock, requested: quantity }
        });
      }

      result.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.price,
        totalPrice: multiplyMoney(product.price, quantity)
      });
    }

    return result;
  }

  async reserveStock(items: OrderItemInput[]): Promise<void> {
    for (const item of items) {
      const quantity = ensurePositiveInt(item.quantity, "quantity");
      const product = await this.getProductById(item.productId);
      product.stock = Math.max(0, product.stock - quantity);
      product.inventoryStatus = this.evaluateStatus(product.stock);
      this.products.set(product.id, product);
    }
  }

  private evaluateStatus(stock: number): InventoryStatus {
    if (stock <= 0) return InventoryStatus.OUT_OF_STOCK;
    if (stock <= 5) return InventoryStatus.LOW_STOCK;
    return InventoryStatus.IN_STOCK;
  }

  private seed(): void {
    const products: Product[] = [
      {
        id: "prod_001",
        sku: "HEADPHONE-900",
        name: "Headphone Studio X",
        description: "Fone com cancelamento de ruido e bateria de longa duracao.",
        price: makeMoney(899.9, ENV.DEFAULT_CURRENCY),
        categories: [Category.ELECTRONICS],
        inventoryStatus: InventoryStatus.IN_STOCK,
        stock: 12,
        active: true
      },
      {
        id: "prod_002",
        sku: "COFFEE-01",
        name: "Cafeteira Pro",
        description: "Cafeteira com moedor integrado e controle de temperatura.",
        price: makeMoney(1299, ENV.DEFAULT_CURRENCY),
        categories: [Category.HOME],
        inventoryStatus: InventoryStatus.LOW_STOCK,
        stock: 4,
        active: true
      },
      {
        id: generateId("prod"),
        sku: "RUN-500",
        name: "Tenis Runner 500",
        description: "Tenis leve para corrida com amortecimento responsivo.",
        price: makeMoney(399.9, ENV.DEFAULT_CURRENCY),
        categories: [Category.SPORTS],
        inventoryStatus: InventoryStatus.IN_STOCK,
        stock: 25,
        active: true
      }
    ];

    for (const product of products) {
      this.products.set(product.id, product);
    }
  }
}
