const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { parseStringPromise } = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Build SOAP request (NO AUTH HEADER)
 */
function buildSOAPRequest(reportPath, encodedSQL) {
  return `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v2="http://xmlns.oracle.com/oxp/service/v2">

    <soapenv:Header/>

    <soapenv:Body>
      <v2:runReport>
        <v2:reportRequest>
          <v2:reportAbsolutePath>${reportPath}</v2:reportAbsolutePath>
          <v2:sizeOfDataChunkDownload>-1</v2:sizeOfDataChunkDownload>

          <v2:parameterNameValues>
            <v2:listOfParamNameValues>
              <v2:item>
                <v2:name>sql_query</v2:name>
                <v2:values>
                  <v2:item>${encodedSQL}</v2:item>
                </v2:values>
              </v2:item>
            </v2:listOfParamNameValues>
          </v2:parameterNameValues>

        </v2:reportRequest>
      </v2:runReport>
    </soapenv:Body>

  </soapenv:Envelope>
  `;
}

/**
 * Execute SQL via BI Publisher
 */
app.post("/execute", async (req, res) => {
  const { query, user, password, baseUrl } = req.body;

  try {
    const encodedSQL = Buffer.from(query).toString("base64");

    const reportPath = "/Custom/CloudSQL/CloudSQLReport_csv";

    const soapBody = buildSOAPRequest(reportPath, encodedSQL);

    const response = await axios.post(
      `${baseUrl}/xmlpserver/services/v2/ReportService`,
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8"
        },
        auth: {
          username: user,
          password: password
        }
      }
    );

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false
    });

    const reportBytes =
      parsed["soapenv:Envelope"]["soapenv:Body"]["ns2:runReportResponse"]["ns2:runReportReturn"]["ns2:reportBytes"];

    const decodedResult = Buffer.from(reportBytes, "base64").toString("utf-8");

    res.send(decodedResult);

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
