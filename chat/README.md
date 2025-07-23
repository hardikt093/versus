# Versus Chat Backend

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

- Copy .env.example to .env and set veriable values.

- Now in `.env` you need to replace `postgress_username` & `postgress_password` with your postgres crendetails
- DATABASE_URL="postgress_username://postgress_password@localhost:5432/mydb?schema=public"

# Install all the packages

- yarn install

# Start server

- `yarn run dev`

  After running yarn run dev command server will start at http://localhost:8001

# CREATE MODEL

- Go to prisma directory then write your model details in schema.prisma file
- For migrate new model write yarn run migration

# API CREATION

- Go to routes folder, write your route in index.ts file.
- Must use validation while creation of any new api.
- write your controller code.
- write your business login in service file only.

```

```
