const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "BFS_EMS_ALARM_Duration"');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
test();
