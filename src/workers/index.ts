// Entry point for all BullMQ workers.
// Run with: npx tsx src/workers/index.ts

import "./publishing-worker";
import "./analytics-worker";

console.log("[workers] All workers started.");
