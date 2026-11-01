import { config } from './config.js';

export const erp = {
  async updateShipment(orderId: string, decision: { carrier: string; warehouseId: string }) {
    const res = await fetch(`${config.erpBaseUrl()}/orders/${encodeURIComponent(orderId)}/shipment`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${config.erpToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ carrier: decision.carrier, warehouseId: decision.warehouseId }),
    });
    // Throwing makes BullMQ retry the job with backoff.
    if (!res.ok) throw new Error(`ERP ${res.status}: ${await res.text()}`);
  },
};
