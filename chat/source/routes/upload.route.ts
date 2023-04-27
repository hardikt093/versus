import express from "express";
import auth from "../middlewares/auth";
import uploadController from "../upload/upload.controller";
const router = express.Router();

/**
 * @swagger
 * definitions:
 *   uploadFile:
 */

/**
 * @swagger
 *path:
 * /file/fileUpload:
 *   post:
 *     tags:
 *       - "upload"
 *     description: upload file
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         schema:
 *            $ref: "#/definitions/uploadFile"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: upoad file
 */
router.post("/fileUpload", auth, uploadController.uploadFiles);
export = router;
