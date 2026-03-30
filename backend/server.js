const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/execute", async (req, res) => {
  const { query, user, password, baseUrl } = req.body;

  try {
    const encodedSQL = Buffer.from(query).toString("base64");

    const reportPath = "/Custom/CloudSQL/CloudSQLReport_csv";

    const response = await axios.post(
      `${baseUrl}/xmlpserver/services/rest/v1/reports${reportPath}/run`,
      {
        parameterNameValues: [
          {
            name: "sql_query",
            values: [encodedSQL]
          }
        ]
      },
      {
        auth: {
          username: user,
          password: password
        },
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const reportData = response.data;

    const decoded = Buffer.from(
      reportData.reportBytes,
      "base64"
    ).toString("utf-8");

    res.send(decoded);

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

app.listen(4000, () => {
  console.log("🚀 Server running on port 4000");
});
