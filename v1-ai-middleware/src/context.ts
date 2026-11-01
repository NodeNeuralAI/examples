import type { Order } from './events.js';

// In production these come from the ERP or a config table; the model only chooses among them.
const WAREHOUSES = [
  { id: 'WH-SP-01', country: 'BR', ships: ['LOCAL_FLEET', 'DHL', 'FEDEX'] },
  { id: 'WH-MIA-02', country: 'US', ships: ['FEDEX', 'DHL'] },
];

export const SYSTEM_PROMPT = `You route e-commerce orders. Choose one carrier and one warehouse from the lists given.
Prefer LOCAL_FLEET for domestic standard orders under 30 kg. Express orders need DHL or FEDEX.
Set confidence below 0.85 whenever the rules do not clearly decide, and explain why in reason.`;

export const buildContext = (order: Order) =>
  JSON.stringify({ order, warehouses: WAREHOUSES, carriers: ['DHL', 'FEDEX', 'LOCAL_FLEET'] }, null, 2);
