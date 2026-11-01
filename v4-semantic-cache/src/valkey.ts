import { GlideClusterClient } from '@valkey/valkey-glide';

export const config = {
  addresses: [{ host: process.env.VALKEY_HOST ?? 'localhost', port: Number(process.env.VALKEY_PORT ?? 6379) }],
  useTLS: process.env.VALKEY_TLS !== 'false',
};

// Created once per Lambda container, outside the handler: warm invocations reuse the connection.
export const valkey = await GlideClusterClient.createClient(config);
