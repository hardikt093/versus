import { model, Schema } from "mongoose";
import ITeamImagesModel from "../../interfaces/teamImage.interface";
var nflImageSchema = new Schema(
    {
        teamId: { required: true, type: Schema.Types.ObjectId, ref: "NflStanding" },
        goalServeTeamId: Number,
        image: { type: String, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const TeamImageNFL = model<ITeamImagesModel>("NflTeamImage", nflImageSchema);

export default TeamImageNFL;