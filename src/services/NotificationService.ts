import { FEATURE_FLAGS } from "../config/featureFlags";
import { TEMPLATES, TemplateId } from "../config/templates";
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
  templateId: TemplateId;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  sentAt: ISODateString;
}

export class NotificationService {
  private logger = createLogger("NotificationService");

  async send(
    templateId: TemplateId,
    recipient: string,
    data: Record<string, string | number>,
    channel: NotificationChannel = NotificationChannel.EMAIL
  ): Promise<NotificationReceipt> {
    const template = TEMPLATES[templateId];
    if (!template) {
      throw new AppError({
        code: "TEMPLATE_NOT_FOUND",
        message: `Template ${templateId} not found`,
        status: 500
      });
    }

    const shouldSkip =
      !FEATURE_FLAGS.enablePaymentNotifications &&
      (templateId === "paymentFailed" || templateId === "paymentCaptured");

    if (shouldSkip) {
      this.logger.info("Notification skipped by feature flag", { templateId, recipient });
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
    this.logger.info("Notification dispatched", { templateId, recipient, channel, message });

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
