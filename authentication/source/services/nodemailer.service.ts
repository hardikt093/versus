import * as handlebars from "handlebars";
import { google } from "googleapis";

var nodemailer = require("nodemailer");
const OAuth2 = google.auth.OAuth2;

let BASE_PATH: string | Array<string> | undefined;
BASE_PATH = __dirname.split("\\");

BASE_PATH.splice(-1, 1);
BASE_PATH = BASE_PATH.join("/");
export const sendMail = async (mail: any) => {
  try {
    const oauth2Client = new OAuth2(
      process.env.CLEINT_ID, // ClientID
      process.env.CLIENT_SECRET, // Client Secret
      process.env.REDIRECT_URI // Redirect URL
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESHTOKEN,
    });
    const accessToken = oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "joseph.meza112@gmail.com",
        clientId: process.env.CLEINT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESHTOKEN,
        accessToken: process.env.ACCESSTOKEN,
      },
      // tls: {
      //   rejectUnauthorized: false,
      // },
    });
    const template = handlebars.compile(mail.html)({
      url: mail.url,
    });
    const mailOptions = {
      from: '"joseph.meza112@gmail.com" "<joseph.meza112@gmail.com">',
      to: mail.to,
      cc: [],
      subject: mail.subject,
      generateTextFromHTML: true,
      html: template,
    };

    smtpTransport.sendMail(mailOptions, (error: Error, response: string) => {
      error ? console.error("error", error) : console.info(response);
      smtpTransport.close();
    });
    return true;
  } catch (error) {
    console.error(error);
  }
};
