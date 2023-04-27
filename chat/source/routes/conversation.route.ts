import express from "express";

import auth from "../middlewares/auth";
import conversationController from "../conversation/conversation.controller";

const router = express.Router();

/**
 * @swagger
 * definitions:
 *   getconversation :
 *     properties:
 *       conversationId:
 *         type: number
 *         example: 1
 */

/**
 * @swagger
 *path:
 * /conversation/getConversation/{conversationId}:
 *   get:
 *     tags:
 *       - "conversation"
 *     description: get conversation by conversation id
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           $ref: "#/definitions/getconversation"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: get conversation by conversation id
 */
router.get(
  "/getConversation/:id",
  auth,
  conversationController.getConversation
);

export = router;
