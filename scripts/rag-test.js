const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim(); }
(async () => {
  const { ask } = require('../lib/rag/workflow');
  const questions = [
    "באילו מדינות יש לנו אירועים?",
    "מה הגיל המינימלי לאירועי ENG Tours?",
    "באיזה מלונות יש לנו חוזים?",
    "כמה טיסות יש ל-BCN (ברצלונה)?",
    "מה מחיר הכרטיס הזול ביותר במערכת?",
    "מי הספק של חברת התעופה של El Al?",
  ];
  for (const q of questions) {
    console.log('\n❓ ' + q);
    try {
      const r = await ask(q);
      console.log('   Grade: ' + r.grade + ' | retries: ' + r.retry_count + ' | ' + (r.elapsed_ms/1000).toFixed(1) + 's');
      console.log('   ' + r.answer.split('\n').join('\n   '));
      console.log('   Top sources: ' + r.retrieved.slice(0,3).map(d=>`${d.source}/${(d.title||'').slice(0,30)}`).join(' | '));
    } catch (e) {
      console.log('   ERROR: ' + e.message);
    }
  }
})();
