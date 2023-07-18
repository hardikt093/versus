// import { Request, Response } from "express";
// import httpStatus from "http-status";

// import createResponse from "../utils/response";
// import contactService from "../contact/contact.service";
// import { IUser } from "../interfaces/input";

// const getContacts = async (req: Request, res: Response) => {
//   try {
//     const getContacts = await contactService.getContacts(
//       req?.loggedInUser as IUser
//     );
//     createResponse(res, httpStatus.OK, "", getContacts);
//   } catch (error: any) {
//     createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
//   }
// };

// const createContact = async (req: Request, res: Response) => {
//   try {
//     const createContact = await contactService.createContact(
//       req.loggedInUser as IUser,
//       req.body
//     );
//     createResponse(res, httpStatus.OK, "", createContact);
//   } catch (error: any) {
//     createResponse(res, httpStatus.BAD_REQUEST, error.message, {});
//   }
// };

// export default { getContacts, createContact };
