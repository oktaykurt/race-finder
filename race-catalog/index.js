const express = require('express');
const { Pool } = require('pg');
const os = require('os');

const app = express();
const port = 3001;
const hostname = os.hostname();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get('/races', async (req, res) => {
    console.log(`Request for /races handled by container: ${hostname}`);
    const { search, country, exactDate, startDate, endDate, distance } = req.query;

    let baseQuery = `
        SELECT r.*, 
               (SELECT json_agg(d.*) FROM distances d WHERE d.race_id = r.id) as distances 
        FROM races r
    `;
    
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
        conditions.push(`(r.name ILIKE $${paramIndex} OR r.city ILIKE $${paramIndex})`);
        values.push(`%${search}%`);
        paramIndex++;
    }

    if (country) {
        conditions.push(`r.country ILIKE $${paramIndex}`);
        values.push(`%${country}%`);
        paramIndex++;
    }

    if (exactDate) {
        conditions.push(`r.date = $${paramIndex}`);
        values.push(exactDate);
        paramIndex++;
    } else {
        if (startDate) {
            conditions.push(`r.date >= $${paramIndex}`);
            values.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            conditions.push(`r.date <= $${paramIndex}`);
            values.push(endDate);
            paramIndex++;
        }
    }
    
    if (distance) {
        conditions.push(`EXISTS (SELECT 1 FROM distances d WHERE d.race_id = r.id AND d.distance_name ILIKE $${paramIndex})`);
        values.push(distance);
        paramIndex++;
    }

    if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    baseQuery += ' ORDER BY r.date;';

    try {
        const result = await pool.query(baseQuery, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/races/:id', async (req, res) => {
    console.log(`Request for /races/:id handled by container: ${hostname}`);
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT r.*, 
                    (SELECT json_agg(d.*) FROM distances d WHERE d.race_id = r.id) as distances 
             FROM races r WHERE r.id = $1`,
            [id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/health', (req, res) => {
    console.log(`Health check received by container: ${hostname}`);
    res.status(200).send('OK');
});


app.listen(port, () => {
  console.log(`Race Catalog Service listening on port ${port} from container ${hostname}`);
});
