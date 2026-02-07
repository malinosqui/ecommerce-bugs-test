import { AppError, Currency, Money } from "../models/common";

const round = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const assertFinite = (value: number, context: string): void => {
  if (!Number.isFinite(value)) {
    throw new AppError({
      code: "INVALID_MONEY",
      message: `${context} must be a finite number`,
      status: 400,
      details: { value }
    });
  }
};

export const makeMoney = (amount: number, currency: Currency): Money => {
  assertFinite(amount, "amount");
  return { amount: round(amount), currency };
};

const assertSameCurrency = (left: Money, right: Money): void => {
  if (left.currency !== right.currency) {
    throw new AppError({
      code: "CURRENCY_MISMATCH",
      message: "Money currencies do not match",
      status: 400,
      details: { left: left.currency, right: right.currency }
    });
  }
};

export const addMoney = (left: Money, right: Money): Money => {
  assertSameCurrency(left, right);
  return makeMoney(left.amount + right.amount, left.currency);
};

export const subtractMoney = (left: Money, right: Money): Money => {
  assertSameCurrency(left, right);
  return makeMoney(left.amount - right.amount, left.currency);
};

export const multiplyMoney = (money: Money, multiplier: number): Money => {
  assertFinite(multiplier, "multiplier");
  return makeMoney(money.amount * multiplier, money.currency);
};

export const formatMoney = (money: Money, locale = "pt-BR"): string => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency
  });
  return formatter.format(money.amount);
};
