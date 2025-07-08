const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
const port = 3002;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send('Forbidden: Admins only');
    }
    next();
};

app.post('/races', authenticateToken, async (req, res) => {
    const { name, date, city, country, distances } = req.body;
    const organizerId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const raceResult = await client.query(
            'INSERT INTO races (name, date, city, country, organizer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, date, city, country, organizerId]
        );
        const raceId = raceResult.rows[0].id;
        if (distances && Array.isArray(distances)) {
            for (const dist of distances) {
                await client.query(
                    'INSERT INTO distances (race_id, distance_name, distance_in_km, race_link) VALUES ($1, $2, $3, $4)',
                    [raceId, dist.distance_name, dist.distance_in_km, dist.race_link]
                );
            }
        }
        await client.query('COMMIT');
        res.status(201).send('Race created successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

app.delete('/races/:id', authenticateToken, async (req, res) => {
    const raceId = req.params.id;
    const user = req.user;
    try {
        const raceResult = await pool.query('SELECT organizer_id FROM races WHERE id = $1', [raceId]);
        if (raceResult.rows.length === 0) {
            return res.status(404).send(`Race with ID ${raceId} not found.`);
        }
        const race = raceResult.rows[0];
        if (user.role === 'admin' || race.organizer_id === user.id) {
            await pool.query('DELETE FROM races WHERE id = $1', [raceId]);
            res.status(200).send(`Race with ID ${raceId} deleted successfully.`);
        } else {
            res.status(403).send('Forbidden: You do not have permission to delete this race.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.put('/races/:id', authenticateToken, async (req, res) => {
    const raceId = req.params.id;
    const user = req.user;
    const { name, date, city, country } = req.body;
    try {
        const raceResult = await pool.query('SELECT organizer_id FROM races WHERE id = $1', [raceId]);
        if (raceResult.rows.length === 0) {
            return res.status(404).send(`Race with ID ${raceId} not found.`);
        }
        const race = raceResult.rows[0];
        if (user.role === 'admin' || race.organizer_id === user.id) {
            await pool.query(
                'UPDATE races SET name = $1, date = $2, city = $3, country = $4 WHERE id = $5',
                [name, date, city, country, raceId]
            );
            res.send('Race updated successfully');
        } else {
            res.status(403).send('Forbidden: You do not have permission to update this race.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/organizers', authenticateToken, authenticateAdmin, async (req, res) => {
    const { username, password } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'INSERT INTO organizers (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, 'organizer']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/organizers/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    const organizerId = req.params.id;
    if (String(req.user.id) === String(organizerId)) {
        return res.status(403).send('Forbidden: You cannot delete your own account.');
    }
    try {
        await pool.query('DELETE FROM organizers WHERE id = $1', [organizerId]);
        res.status(200).send(`Organizer with ID ${organizerId} deleted successfully.`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.listen(port, () => {
  console.log(`Race Submission Service listening on port ${port}`);
});