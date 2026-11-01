const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} (see .env.example)`);
  return value;
};

export const config = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  webhookSecret: () => required('ERP_WEBHOOK_SECRET'),
  erpBaseUrl: () => required('ERP_BASE_URL'),
  erpToken: () => required('ERP_API_TOKEN'),
  modelId: () => required('BEDROCK_MODEL_ID'),
  port: Number(process.env.PORT ?? 3000),
};
