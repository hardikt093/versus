import { model, Schema } from "mongoose";
import ITeamImagesModel from "../../interfaces/teamImage.interface";

var leagueSchema = new Schema(
    {
        teamId: { required: true, type: Schema.Types.ObjectId, ref: "nhlTeam" },
        goalServeTeamId: Number,
        image: { type: String, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const teamImageNHL = model<ITeamImagesModel>("NhlTeamImage", leagueSchema);

export default teamImageNHL;
