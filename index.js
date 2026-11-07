import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 5000;

// Allow other websites (our Next.js client) to call this server
app.use(cors());
// Allow the server to read JSON sent in request bodies
app.use(express.json());

// A simple test route to check that the server is alive
app.get("/", (req, res) => {
  res.send("BookNook server is running");
});

app.listen(port, () => {
  console.log(`BookNook server listening on port ${port}`);
});