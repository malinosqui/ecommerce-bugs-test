export const TEMPLATES = {
  welcome: "Bem-vindo, {{name}}! Sua conta foi criada com sucesso.",
  orderConfirmation: "Pedido {{orderId}} confirmado. Total: {{total}}.",
  paymentFailed: "Pagamento do pedido {{orderId}} falhou: {{reason}}.",
  paymentCaptured: "Pagamento do pedido {{orderId}} aprovado. Obrigado pela compra!",
  manualReview: "Pedido {{orderId}} está em análise manual. Em breve atualizaremos."
} as const;

export type TemplateId = keyof typeof TEMPLATES;
