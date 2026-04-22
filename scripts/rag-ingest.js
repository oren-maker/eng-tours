// Standalone ingest runner. Uses the compiled TS via tsx.
// Run with: npx tsx scripts/rag-ingest.js
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim(); }
(async () => {
  const { ingestAll } = require('../lib/rag/ingest');
  const started = Date.now();
  let last = 0;
  const r = await ingestAll({
    onProgress: (done, total, source) => {
      if (done - last >= 20 || done === total) {
        console.log(`  ${done}/${total} (${source})`);
        last = done;
      }
    },
  });
  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)}s:`);
  console.log(JSON.stringify(r, null, 2));
})();
