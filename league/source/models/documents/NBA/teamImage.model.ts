import { model, Schema } from "mongoose";
import ITeamImagesModel from "../../interfaces/teamImage.interface";

var nbaImageSchema = new Schema(
    {
        teamId: { required: true, type: Schema.Types.ObjectId, ref: "nbaTeam" },
        goalServeTeamId: Number,
        image: { type: String, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const TeamImageNBA = model<ITeamImagesModel>("NbaTeamImage", nbaImageSchema);

export default TeamImageNBA;
