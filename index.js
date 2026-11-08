import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("BookNook server is running");
});

app.use("/books", booksRouter);
app.use("/borrows", borrowsRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server" });
});

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