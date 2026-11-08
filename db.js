import { MongoClient, ServerApiVersion } from "mongodb";

let db;

export async function connectDB() {
    const client = new MongoClient(process.env.MONGODB_URI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    await client.connect();
    db = client.db(process.env.DB_NAME || "booknook");

    await db
        .collection("borrows")
        .createIndex({ bookId: 1, userEmail: 1 }, { unique: true });

    console.log("Connected to MongoDB:", db.databaseName);
    return db;
}

// Other files call this to get the database
export function getDB() {
    if (!db) {
        throw new Error("Database is not connected yet");
    }
    return db;
}