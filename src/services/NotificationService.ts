import { FEATURE_FLAGS } from "../config/featureFlags";
import { NOTIFICATION_EVENTS, NotificationEvent } from "../config/notificationEvents";
import { TEMPLATES } from "../config/templates";
import { AppError, ID, ISODateString, generateId, nowIso } from "../models/common";
import { createLogger } from "../utils/logger";

export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  WHATSAPP = "WHATSAPP"
}

export type NotificationStatus = "SENT" | "SKIPPED";

export interface NotificationReceipt {
  id: ID;
  templateId: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  sentAt: ISODateString;
}

export class NotificationService {
  private logger = createLogger("NotificationService");

  async send(
    eventName: string,
    recipient: string,
    data: Record<string, string | number>,
    channel: NotificationChannel = NotificationChannel.EMAIL
  ): Promise<NotificationReceipt> {
    const templateId = NOTIFICATION_EVENTS[eventName as NotificationEvent];
    const template = templateId ? TEMPLATES[templateId] : undefined;
    if (!template) {
      throw new AppError({
        code: "UNKNOWN_NOTIFICATION_EVENT",
        message: `Notification event ${eventName} not supported`,
        status: 500,
        details: { eventName }
      });
    }

    const shouldSkip =
      !FEATURE_FLAGS.enablePaymentNotifications && eventName.startsWith("payment.");

    if (shouldSkip) {
      this.logger.info("Notification skipped by feature flag", { eventName, recipient });
      return {
        id: generateId("notif"),
        templateId,
        channel,
        recipient,
        status: "SKIPPED",
        sentAt: nowIso()
      };
    }

    const message = this.render(template, data);
    this.logger.info("Notification dispatched", { eventName, recipient, channel, message });

    return {
      id: generateId("notif"),
      templateId,
      channel,
      recipient,
      status: "SENT",
      sentAt: nowIso()
    };
  }

  private render(template: string, data: Record<string, string | number>): string {
    return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
      const value = data[key];
      return value === undefined ? "" : String(value);
    });
  }
}
