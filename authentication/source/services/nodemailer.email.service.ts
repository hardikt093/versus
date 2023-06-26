const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
    process.env.CLIENT_ID, // ClientID
    process.env.CLIENT_SECRET, // Client Secret
    process.env.OAUTH_REDIRECT// Redirect URL
);
oauth2Client.setCredentials({
    refresh_token:  process.env.REFRESHTOKEN
});
const accessToken = oauth2Client.getAccessToken()

export const sendMail = async () => {
    console.log("function called")
    try {
        const smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                 type: "OAuth2",
                 user: process.env.MAILER_EMAIL_ID, 
                 clientId: process.env.CLIENT_ID,
                 clientSecret:process.env.CLIENT_SECRET,
                 refreshToken: process.env.REFRESHTOKEN,
                 accessToken: accessToken
            },
            tls: {
                rejectUnauthorized: false
              }
       });

        const html = fs.readFileSync(path.join(__dirname, "../public/template/verifyAccount.html"),
            { encoding: "utf-8" }
          );
    
   
        const template = handlebars.compile(html)({
            name: "hello",
          });
        const mailOptions = {
            from: '"noreply@test.com "<noreply@test.com>',
            to: '',
            cc:  [],
            subject: "This is a subject",
            generateTextFromHTML: true,
            html: template
       };

       smtpTransport.sendMail(mailOptions, (error:any, response:any) => {
        error ? console.log("error",error) : console.log(response);
        smtpTransport.close();
   });
    }
    catch (error) { console.error(error); }
};
