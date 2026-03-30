const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/execute", (req, res) => {
  const { query } = req.body;

  // Dummy response (for now)
  res.json({
    message: "Query received successfully",
    query: query
  });
});

app.listen(4000, () => console.log("Server running on port 4000"));
