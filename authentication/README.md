# Versus Backend

# 🟢 Node.js Installation Guide

Install Node.js (LTS version recommended) on your system by following the steps below.

---

## 🪟 Windows

1. Go to the official Node.js download page:  
   👉 [https://nodejs.org](https://nodejs.org)

2. Download the **LTS** version for Windows.

3. Run the installer:

   - Follow the installation wizard.
   - Ensure the checkbox for **"Add to PATH"** is selected.
   - Optionally install npm (Node Package Manager).

4. Verify installation:

```bash
node -v
npm -v
```

# SETUP

- Copy `.env.example` to `.env` and set veriable values.

- Now in `.env` you need to replace `postgress_username` & `postgress_password` with your postgres crendetails
- DATABASE_URL="postgress_username://postgress_password@localhost:5432/mydb?schema=public"

# Install all the packages

- `npm install --global yarn`

- `yarn install`

# Migrate database

- `yarn run migration`

# Start server

- `yarn run dev`

  To start the server, run the command `yarn run dev` in your terminal. Once the server is up and running, you can access it at `http://localhost:8000`.

  In addition to the server, you can also access the Swagger documentation at `http://localhost:8000/api-docs/`.

# CREATE MODEL

- Go to `prisma` directory then write your model details in `schema.prisma` file
- For migrate new model write `yarn run migration`

# API CREATION

- Open the `index.ts` file located in the routes folder of your project, and write the route for your new API.
- Make sure to include validation while creating the API.
- Write the controller code to handle requests and responses for your API.
- Write your business login in service file associated with your API.

```

```
