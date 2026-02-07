import { Currency } from "../models/common";

const readString = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : fallback;
};

const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readCurrency = (key: string, fallback: Currency): Currency => {
  const value = process.env[key];
  if (value && Object.values(Currency).includes(value as Currency)) {
    return value as Currency;
  }
  return fallback;
};

export const ENV = {
  NODE_ENV: readString("NODE_ENV", "development"),
  DEFAULT_CURRENCY: readCurrency("DEFAULT_CURRENCY", Currency.BRL),
  TAX_RATE: readNumber("TAX_RATE", 0.12),
  SHIPPING_BASE: readNumber("SHIPPING_BASE", 19.9),
  PAYMENT_PROVIDER_TIMEOUT_MS: readNumber("PAYMENT_PROVIDER_TIMEOUT_MS", 1200),
  LOG_LEVEL: readString("LOG_LEVEL", "info")
};
