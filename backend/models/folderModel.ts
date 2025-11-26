import mongoose, { mongo } from "mongoose";
const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

folderSchema.index({ name: 1, user: 1 }, { unique: true });

const folderModel=mongoose.model("Folder", folderSchema)
export default folderModel;
