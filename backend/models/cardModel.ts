import mongoose from "mongoose";
import folderModel from "./folderModel";
const cardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      required: true,
    },
    EF: { type: Number, default: 2.5 }, // Easiness Factor
    interval: { type: Number, default: 1 },
    repetitions: { type: Number, default: 0 },
    dueDate: {
      type: Date,
      default: () => new Date(new Date().setHours(0, 0, 0, 0)),
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for common query patterns to improve performance
cardSchema.index({ user: 1, dueDate: 1 }); // For getDueCards query
cardSchema.index({ user: 1, folder: 1 }); // For folder filtering

cardSchema.post('save', async function(doc){
  // Use findOneAndUpdate with upsert to avoid separate find + create operations
  // This is more efficient as it's a single atomic operation
  await folderModel.findOneAndUpdate(
    { user: doc.user, name: doc.folder },
    { user: doc.user, name: doc.folder },
    { upsert: true, setDefaultsOnInsert: true }
  );
});

const cardModel = mongoose.model("Card", cardSchema);

export default cardModel;
