import { MongoClient, ServerApiVersion } from "mongodb";

let db;
let connecting;

// Connects to MongoDB Atlas. It is safe to call many times:
// the first call connects, and every later call reuses that connection.
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

      // One user cannot borrow the same book twice at the same time
      await database
        .collection("borrows")
        .createIndex({ bookId: 1, userEmail: 1 }, { unique: true });

      db = database;
      console.log("Connected to MongoDB:", db.databaseName);
      return db;
    })().catch((error) => {
      // Allow a fresh try on the next request if this attempt failed
      connecting = undefined;
      throw error;
    });
  }

  return connecting;
}

// Other files call this to get the database
export function getDB() {
  if (!db) {
    throw new Error("Database is not connected yet");
  }
  return db;
}