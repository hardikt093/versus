import express from "express";
import walletController from "../wallet/wallet.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.post("/deduct", walletController.walletDeduction);
export default router;