// Daily shadow check: validation catches broken answers, not mediocre ones. Re-run yesterday's sampled
// cheap answers on the large model and count how often they disagree. Run it from a scheduler once a day.
import { readSamples } from './log.js';
import { callModel, MODEL_ID } from './models.js';
import { makeRequest } from './request.js';
import type { Task } from './types.js';

const MAX_PER_DAY = 50;

// Tasks with a single right answer compare automatically; free text goes to a person to read side by side.
const agree: Partial<Record<Task, (cheap: any, large: any) => boolean>> = {
  classify_ticket: (cheap, large) => cheap.label === large.label,
  extract_invoice: (cheap, large) => Math.abs(cheap.total - large.total) < 0.01,
};

const since = Date.now() - 24 * 60 * 60 * 1000;
const samples = readSamples()
  .filter((s) => Date.parse(s.at) >= since)
  .slice(-MAX_PER_DAY);

let compared = 0;
let disagreed = 0;
for (const s of samples) {
  const large = await callModel(MODEL_ID.large, makeRequest('shadow', s.task, s.input));
  const same = agree[s.task];
  if (!same) {
    console.log(`review ${s.task} (${s.tier})\n  cheap: ${JSON.stringify(s.json)}\n  large: ${JSON.stringify(large.json)}`);
    continue;
  }
  compared++;
  if (!same(s.json, large.json)) {
    disagreed++;
    console.log(`disagree ${s.task} (${s.tier})\n  cheap: ${JSON.stringify(s.json)}\n  large: ${JSON.stringify(large.json)}`);
  }
}
console.log(`${samples.length} samples · ${compared} compared · ${disagreed} disagreements`);
