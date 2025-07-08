const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const port = 3003;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM organizers WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).send("Cannot find user");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      const accessToken = jwt.sign(payload, process.env.JWT_SECRET);
      res.json({ accessToken: accessToken });
    } else {
      res.status(401).send("Not Allowed");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.listen(port, () => {
  console.log(`User Authentication Service listening on port ${port}`);
});