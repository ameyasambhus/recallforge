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

cardSchema.post('save', async function(doc){
  const existingFolder=await folderModel.findOne({user:doc.user, name: doc.folder});
  if(!existingFolder){
    await folderModel.create({
    user: doc.user,
    name: doc.folder
  });
  }
});

const cardModel = mongoose.model("Card", cardSchema);

export default cardModel;
