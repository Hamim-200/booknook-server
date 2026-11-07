import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const LOAN_DAYS = 7;

// Sends errors from async routes to the error handler in index.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Returns an ObjectId, or null if the text is not a valid id
function parseId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id)
    ? new ObjectId(id)
    : null;
}

// 6) POST /borrows  (logged in)
// Body: { "bookId": "..." }
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookId = parseId(req.body?.bookId);
    if (!bookId) return res.status(400).json({ message: "Invalid book id" });

    const db = getDB();
    const books = db.collection("books");
    const borrows = db.collection("borrows");

    const book = await books.findOne({ _id: bookId });
    if (!book) return res.status(404).json({ message: "Book not found" });

    // No double borrow
    const alreadyBorrowed = await borrows.findOne({
      bookId,
      userEmail: req.user.email,
    });
    if (alreadyBorrowed) {
      return res
        .status(409)
        .json({ message: "You have already borrowed this book" });
    }

    // Take one copy, but only if at least one is available.
    // This check and the decrease happen together in one step.
    const updatedBook = await books.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } }
    );
    if (!updatedBook) {
      return res.status(409).json({ message: "This book is not available" });
    }

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + LOAN_DAYS);

    const borrow = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      // Name and email come from the logged-in user, never from the request body
      userName: req.user.name,
      userEmail: req.user.email,
      borrowDate,
      returnDate,
    };

    try {
      const result = await borrows.insertOne(borrow);
      res.status(201).json({ ...borrow, _id: result.insertedId });
    } catch (error) {
      // Give the copy back if saving the borrow failed
      await books.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } });

      // 11000 = the unique index caught a double borrow (two requests at once)
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "You have already borrowed this book" });
      }
      throw error;
    }
  })
);

// 7) GET /borrows  (logged in)
// Returns only the borrows of the logged-in user, newest first
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const list = await getDB()
      .collection("borrows")
      .find({ userEmail: req.user.email })
      .sort({ borrowDate: -1 })
      .toArray();

    res.json(list);
  })
);

// 8) DELETE /borrows/:id  (logged in, own borrow only) = return the book
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid borrow id" });

    const db = getDB();
    const borrows = db.collection("borrows");

    const borrow = await borrows.findOne({ _id: id });
    if (!borrow) return res.status(404).json({ message: "Borrow not found" });

    if (borrow.userEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "You can only return your own borrowed books" });
    }

    // Delete first. Only one request can delete it, so the copy
    // is added back only once, even if the button is clicked twice.
    const deleted = await borrows.findOneAndDelete({ _id: id });
    if (!deleted) return res.status(404).json({ message: "Borrow not found" });

    await db
      .collection("books")
      .updateOne({ _id: borrow.bookId }, { $inc: { availableCopies: 1 } });

    res.json({ message: "Book returned" });
  })
);

export default router;