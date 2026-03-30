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

    const url = `${baseUrl}/xmlpserver/services/rest/v1/reports/Custom/CloudSQL/CloudSQLReport_csv/run`;

    const payload = {
      reportRequest: {
        attributeFormat: "csv",   // 🔥 VERY IMPORTANT
        flattenXML: true,         // 🔥 IMPORTANT
        byPassCache: true,        // 🔥 IMPORTANT

        parameterNameValues: {
          listOfParamNameValues: [
            {
              name: "sql_query",
              values: [encodedSQL]
            }
          ]
        }
      }
    };

    const response = await axios.post(url, payload, {
      auth: {
        username: user,
        password: password
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    const reportBytes = response.data.reportBytes;

    const decoded = Buffer.from(reportBytes, "base64").toString("utf-8");

    res.send(decoded);

  } catch (err) {
    console.error("FULL ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

app.listen(4000, () => {
  console.log("🚀 Server running on port 4000");
});
