const { Pool } = require('pg');

const pool = new Pool({
  user: 'appuser',
  host: '10.165.41.45',
  database: 'production',
  password: 'appuser',
  port: 5432,
});

async function test() {
  const res = await pool.query(`
    SELECT id, "timestamp", unit_id 
    FROM public."BFS_EMS_Sensor" 
    WHERE unit_id = 'Mixing' 
    ORDER BY "timestamp" DESC LIMIT 5
  `);
  console.log(res.rows);

  const query = `
      SELECT 
        id, $1::timestamp, $2::timestamp, $3::text, $4::text, unit_id, now(), now(), $4::text, temperature, relative_humidity, differential_pressure
      FROM public."BFS_EMS_Sensor"
      WHERE unit_id = $5 
        AND "timestamp" >= EXTRACT(EPOCH FROM $1::timestamp AT TIME ZONE 'Asia/Jakarta') * 1000
        AND "timestamp" <= EXTRACT(EPOCH FROM $2::timestamp AT TIME ZONE 'Asia/Jakarta') * 1000
    `;

  const values = [
    "2026-05-13 12:00:00",
    "2026-05-13 13:00:00",
    "Fumigasi",
    "admin@base44.io",
    "Mixing"
  ];

  const res2 = await pool.query(query, values);
  console.log(res2.rows);

  await pool.end();
}

test();
