import dotenv from "dotenv";
import path from "path";
import Joi from "@hapi/joi";

dotenv.config({ path: path.join(__dirname, "./../../.env") });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid("production", "development", "test")
      .required(),
    PORT: Joi.number().default(3000),
    JWT_SECRET: Joi.string().required().description("JWT secret key"),
    SENDGRID_KEY: Joi.string().required().description("Send grid key"),
    DATABASE_URL: Joi.string().required().description("Mongo DB url"),
    GOAL_SERVE_API_KEY: Joi.string()
      .required()
      .description("Goal serve api key"),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description("Minutes after which access tokens expire"),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description("Days after which refresh tokens expire"),
    SMTP_HOST: Joi.string().description("Server that will send the emails"),
    SMTP_PORT: Joi.number().description("Port to connect to the email server"),
    SMTP_USERNAME: Joi.string().description("Username for email server"),
    SMTP_PASSWORD: Joi.string().description("Password for email server"),
    EMAIL_FROM: Joi.string().description(
      "The from field in the emails sent by the app"
    ),
    AUTH_SERVER_URL: Joi.string().required().description("Auth Server Url")

  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV,
  authServerUrl : envVars.AUTH_SERVER_URL,
  goalServeApiKey: envVars.GOAL_SERVE_API_KEY,
  port: envVars.PORT,
  mongoose: {
    url: envVars.DATABASE_URL + (envVars.NODE_ENV === "test" ? "-test" : ""),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_EXPIRATION_MINUTES,
    verifyPasswordExpirationMinutes: envVars.JWT_VERIFY_EXPIRATION_MINUTES, // expire token after 1 year
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  sendgrid: envVars.SENDGRID_KEY,
};
