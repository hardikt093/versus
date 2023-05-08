import { model, Schema } from "mongoose";
import IPlayerModel from "../interfaces/player.interface";
var playerSchema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: String },
    leagueId: { type: Schema.Types.ObjectId, ref: "league" },
    teamId: { type: Schema.Types.ObjectId, ref: "team" },
    goalServePlayerId: { type: Number, required: true },
    age: { type: Number, required: true },
    bats: {
      type: String,
      enum: ["R", "L", "B"],
    },
    height: { type: String, required: true },
    number: { type: Number, required: true },
    position: {
      type: String,
      required: true,
      enum: [
        "RP",
        "LP",
        "SS",
        "1B",
        "C",
        "2B",
        "3B",
        "LF",
        "RF",
        "CF",
        "SP",
        "DH",
        'OF'
      
      ],
    },
    salary: { type: String },
    throws: {
      type: String,
      enum: ["R", "L"],
    },
    weight: { type: String, required: true },
    isDeleted: { type: Boolean, default: false},
  },
  {
    timestamps: true,
  }
);
const Player = model<IPlayerModel>("player", playerSchema);

export default Player;
