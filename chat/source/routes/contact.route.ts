import express from "express";

import validate from "../middlewares/validate";
import contactController from "../contact/contact.controller";
import contactValidation from "../contact/contact.validation";
import auth from "../middlewares/auth";

const router = express.Router();

/**
 * @swagger
 * definitions:
 *   getContacts:
 */

/**
 * @swagger
 *
 * /contact/getContacts:
 *   get:
 *     tags:
 *       - "contact"
 *     description: get users contact list
 *     produces:
 *       - application/json
 *     parameters:
 *         description: get users contact list
 *         schema:
 *           $ref: "#/definitions/getContacts"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: get users contact list
 */
router.get("/getContacts", auth, contactController.getContacts);

/**
 * @swagger
 * definitions:
 *   createContact:
 *     required:
 *       - email
 *     properties:
 *       email:
 *         type: string
 *         example: abcd@mailinator.com
 */

/**
 * @swagger
 *
 * /contact/createContact:
 *   post:
 *     tags:
 *       - "contact"
 *     description: add user in contact list
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description:  add user in contact list
 *         in: body
 *         schema:
 *           $ref: "#/definitions/createContact"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description:  add user in contact list
 */
router.post(
  "/createContact",
  auth,
  validate(contactValidation.createContact),
  contactController.createContact
);

export = router;
