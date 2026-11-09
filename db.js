import { MongoClient, ServerApiVersion } from "mongodb";

let db;
let connecting;

export function connectDB() {
  if (db) return Promise.resolve(db);

  if (!connecting) {
    connecting = (async () => {
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });

      await client.connect();
      const database = client.db(process.env.DB_NAME || "booknook");

      await database
        .collection("borrows")
        .createIndex({ bookId: 1, userEmail: 1 }, { unique: true });

      db = database;
      console.log("Connected to MongoDB:", db.databaseName);
      return db;
    })().catch((error) => {
      connecting = undefined;
      throw error;
    });
  }

  return connecting;
}

export function getDB() {
  if (!db) {
    throw new Error("Database is not connected yet");
  }
  return db;
}