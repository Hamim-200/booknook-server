import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

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