import express from "express";
import generalController from "../goalserve/general/general.controller";

const router = express.Router();

router.get(
    "/upcoming2DaysMatch",
    generalController.upcoming2DaysMatch
);
export default router;