const initSqlJs = require('sql.js');
const fs = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('./data/gacha.db');
  const db = new SQL.Database(buf);
  const stmt = db.prepare('SELECT * FROM characters ORDER BY id');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  console.log(JSON.stringify(rows, null, 2));
  db.close();
})();