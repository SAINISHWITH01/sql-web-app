const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { parseStringPromise } = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Build SOAP request for BI Publisher
 */
function buildSOAPRequest(reportPath, encodedSQL) {
  return `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">
    <soapenv:Header/>
    <soapenv:Body>
      <pub:runReport>
        <pub:reportRequest>
          <pub:reportAbsolutePath>${reportPath}</pub:reportAbsolutePath>
          <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>
          <pub:parameterNameValues>
            <pub:item>
              <pub:name>sql_query</pub:name>
              <pub:values>
                <pub:item>${encodedSQL}</pub:item>
              </pub:values>
            </pub:item>
          </pub:parameterNameValues>
        </pub:reportRequest>
      </pub:runReport>
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
    // Encode SQL (same as Datafusing)
    const encodedSQL = Buffer.from(query).toString("base64");

    // Your report path (IMPORTANT)
    const reportPath = "/Custom/CloudSQL/CloudSQLReport_csv";

    // Build SOAP request
    const soapBody = buildSOAPRequest(reportPath, encodedSQL);

    // Call Fusion BI Publisher
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

    // Parse XML response
    const parsed = await parseStringPromise(response.data, {
      explicitArray: false
    });

    const reportBytes =
      parsed["soapenv:Envelope"]["soapenv:Body"]["ns2:runReportResponse"]["ns2:runReportReturn"]["ns2:reportBytes"];

    // Decode Base64 result
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
