export type ID = string;

export type ISODateString = string;

export enum Currency {
  BRL = "BRL",
  USD = "USD",
  EUR = "EUR"
}

export interface Money {
  amount: number;
  currency: Currency;
}

export interface AppErrorDetails {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(options: AppErrorDetails) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export const nowIso = (): ISODateString => new Date().toISOString();

export const generateId = (prefix: string): ID => {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
};
