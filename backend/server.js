const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { parseStringPromise } = require("xml2js");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * STEP 1: LOGIN AND GET SESSION COOKIE
 */
async function getSession(baseUrl, user, password) {
  const res = await axios.get(
    `${baseUrl}/analytics/saw.dll?Logon`,
    {
      auth: {
        username: user,
        password: password
      },
      validateStatus: () => true
    }
  );

  const cookies = res.headers["set-cookie"];

  if (!cookies) {
    throw new Error("Login failed. No cookies received.");
  }

  return cookies.map(c => c.split(";")[0]).join("; ");
}

/**
 * STEP 2: BUILD SOAP
 */
function buildSOAP(encodedSQL) {
  return `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:v2="http://xmlns.oracle.com/oxp/service/v2">

    <soapenv:Header/>

    <soapenv:Body>
      <v2:runReport>
        <v2:reportRequest>
          <v2:reportAbsolutePath>/Custom/CloudSQL/CloudSQLReport_csv</v2:reportAbsolutePath>
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
 * MAIN EXECUTION
 */
app.post("/execute", async (req, res) => {
  const { query, user, password, baseUrl } = req.body;

  try {
    // 🔥 STEP 1: LOGIN
    const cookie = await getSession(baseUrl, user, password);

    // 🔥 STEP 2: ENCODE SQL
    const encodedSQL = Buffer.from(query).toString("base64");

    const soapBody = buildSOAP(encodedSQL);

    // 🔥 STEP 3: CALL SOAP WITH SESSION
    const response = await axios.post(
      `${baseUrl}/xmlpserver/services/v2/ReportService`,
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "Cookie": cookie
        }
      }
    );

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false
    });

    const reportBytes =
      parsed["soapenv:Envelope"]["soapenv:Body"]["ns2:runReportResponse"]["ns2:runReportReturn"]["ns2:reportBytes"];

    const result = Buffer.from(reportBytes, "base64").toString("utf-8");

    res.send(result);

  } catch (err) {
    console.error("FINAL ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: err.response?.data || err.message
    });
  }
});

app.listen(4000, () => {
  console.log("🚀 FINAL SERVER RUNNING ON 4000");
});
