const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/execute", async (req, res) => {
  const { query, user, password, connectString } = req.body;

  let connection;

  try {
    // Create connection
    connection = await oracledb.getConnection({
      user: user,
      password: password,
      connectString: connectString
    });

    // Execute query
    const result = await connection.execute(query, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    // Send data
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));
