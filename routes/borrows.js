import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const LOAN_DAYS = 7;


const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function parseId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id)
    ? new ObjectId(id)
    : null;
}

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

    const alreadyBorrowed = await borrows.findOne({
      bookId,
      userEmail: req.user.email,
    });
    if (alreadyBorrowed) {
      return res
        .status(409)
        .json({ message: "You have already borrowed this book" });
    }

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
      userName: req.user.name,
      userEmail: req.user.email,
      borrowDate,
      returnDate,
    };

    try {
      const result = await borrows.insertOne(borrow);
      res.status(201).json({ ...borrow, _id: result.insertedId });
    } catch (error) {
      await books.updateOne({ _id: bookId }, { $inc: { availableCopies: 1 } });

      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "You have already borrowed this book" });
      }
      throw error;
    }
  })
);

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
    const deleted = await borrows.findOneAndDelete({ _id: id });
    if (!deleted) return res.status(404).json({ message: "Borrow not found" });

    await db
      .collection("books")
      .updateOne({ _id: borrow.bookId }, { $inc: { availableCopies: 1 } });

    res.json({ message: "Book returned" });
  })
);

export default router;