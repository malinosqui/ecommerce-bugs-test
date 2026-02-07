import { TemplateId } from "./templates";

export const NOTIFICATION_EVENTS: Record<string, TemplateId> = {
  "user.welcome": "welcome",
  "order.confirmed": "orderConfirmation",
  "payment.captured": "paymentCaptured",
  "payment.failed": "paymentFailed",
  "review.manual": "manualReview"
};

export type NotificationEvent = keyof typeof NOTIFICATION_EVENTS;
