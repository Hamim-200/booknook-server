import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const CATEGORIES = ["Fiction", "Science", "History", "Kids", "Others"];

// Sends errors from async routes to the error handler in index.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Returns an ObjectId, or null if the text is not a valid id
function parseId(id) {
  return /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null;
}

// Checks and cleans the book data sent by the client.
// requireAll = true  -> used when adding a book (every field needed)
// requireAll = false -> used when updating (only changed fields needed)
function cleanBookData(body = {}, requireAll) {
  const data = {};

  for (const field of ["title", "author", "image", "description"]) {
    if (body[field] !== undefined) {
      const value = String(body[field]).trim();
      if (!value) return { error: `${field} cannot be empty` };
      data[field] = value;
    } else if (requireAll) {
      return { error: `${field} is required` };
    }
  }

  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      return { error: `category must be one of: ${CATEGORIES.join(", ")}` };
    }
    data.category = body.category;
  } else if (requireAll) {
    return { error: "category is required" };
  }

  if (body.totalCopies !== undefined) {
    const copies = Number(body.totalCopies);
    if (!Number.isInteger(copies) || copies < 1) {
      return { error: "totalCopies must be a whole number of at least 1" };
    }
    data.totalCopies = copies;
  } else if (requireAll) {
    return { error: "totalCopies is required" };
  }

  return { data };
}

// 1) GET /books  (public)
// Optional query: ?email=someone@mail.com  -> only that user's books
// Optional query: ?limit=6                 -> only the newest 6
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { email, limit } = req.query;

    const filter = {};
    if (email) filter.addedByEmail = String(email);

    // Newest books first
    let cursor = getDB()
      .collection("books")
      .find(filter)
      .sort({ createdAt: -1 });

    const max = parseInt(limit, 10);
    if (max > 0) cursor = cursor.limit(Math.min(max, 100));

    res.json(await cursor.toArray());
  })
);

// 2) GET /books/:id  (logged in)
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const book = await getDB().collection("books").findOne({ _id: id });
    if (!book) return res.status(404).json({ message: "Book not found" });

    res.json(book);
  })
);

// 3) POST /books  (logged in)
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data, error } = cleanBookData(req.body, true);
    if (error) return res.status(400).json({ message: error });

    const book = {
      ...data,
      availableCopies: data.totalCopies, // a new book starts fully available
      // Name and email come from the logged-in user, never from the request body
      addedByName: req.user.name,
      addedByEmail: req.user.email,
      createdAt: new Date(),
    };

    const result = await getDB().collection("books").insertOne(book);
    res.status(201).json({ ...book, _id: result.insertedId });
  })
);

// 4) PATCH /books/:id  (logged in, owner only)
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const books = getDB().collection("books");
    const book = await books.findOne({ _id: id });
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.addedByEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "You can only edit your own books" });
    }

    const { data, error } = cleanBookData(req.body, false);
    if (error) return res.status(400).json({ message: error });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // If total copies changes, keep available copies correct.
    // Copies currently borrowed = total - available.
    if (data.totalCopies !== undefined) {
      const borrowedCount = book.totalCopies - book.availableCopies;
      if (data.totalCopies < borrowedCount) {
        return res.status(400).json({
          message: `${borrowedCount} copies are currently borrowed, so total copies cannot be less than that`,
        });
      }
      data.availableCopies = data.totalCopies - borrowedCount;
    }

    await books.updateOne({ _id: id }, { $set: data });
    res.json(await books.findOne({ _id: id }));
  })
);

// 5) DELETE /books/:id  (logged in, owner only)
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid book id" });

    const db = getDB();
    const book = await db.collection("books").findOne({ _id: id });
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.addedByEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "You can only delete your own books" });
    }

    await db.collection("books").deleteOne({ _id: id });
    // Also remove borrow records of this book so nothing is left behind
    await db.collection("borrows").deleteMany({ bookId: id });

    res.json({ message: "Book deleted" });
  })
);

export default router;