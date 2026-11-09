import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";

const app = express();
const port = process.env.PORT || 5000;

// Only these websites may call this server from a browser.
// CLIENT_URL can hold several addresses, separated by commas.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
// Allow the server to read JSON sent in request bodies (up to 100 KB)
app.use(express.json({ limit: "100kb" }));

// A simple test route to check that the server is alive
app.get("/", (req, res) => {
  res.send("BookNook server is running");
});

// All book routes live under /books
app.use("/books", booksRouter);
// All borrow routes live under /borrows
app.use("/borrows", borrowsRouter);

// Any other address gets a clear JSON message instead of an HTML page
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Catches any error that a route did not handle
app.use((err, req, res, next) => {
  // Broken JSON sent by the client is the client's mistake, not a server bug
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// Connect to the database first, then start listening for requests
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`BookNook server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  });