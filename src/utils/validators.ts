import { AppError } from "../models/common";

export const requireNonEmptyString = (value: string | undefined, field: string): string => {
  if (!value || value.trim().length === 0) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `${field} is required`,
      status: 400
    });
  }
  return value.trim();
};

export const validateEmail = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new AppError({
      code: "INVALID_EMAIL",
      message: "Invalid email address",
      status: 400,
      details: { email: value }
    });
  }
  return normalized;
};

export const ensurePositiveInt = (value: number, field: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError({
      code: "INVALID_QUANTITY",
      message: `${field} must be a positive integer`,
      status: 400,
      details: { value }
    });
  }
  return value;
};

export const ensureArrayNotEmpty = <T>(value: T[] | undefined, field: string): T[] => {
  if (!value || value.length === 0) {
    throw new AppError({
      code: "EMPTY_ARRAY",
      message: `${field} cannot be empty`,
      status: 400
    });
  }
  return value;
};
