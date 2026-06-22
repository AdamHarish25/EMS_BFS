import pool from './lib/db';
async function test() {
  try {
    const res = await pool.query('SELECT * FROM "BFS_EMS_ALARM_Duration"');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
