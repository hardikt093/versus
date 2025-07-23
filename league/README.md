# Versus League Backend

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

# 📦 MongoDB Installation Guide

Install MongoDB Community Edition on your system using the steps below.

---

## 🪟 Windows

1. **Download the MongoDB Installer**  
   👉 [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

2. **Run the Installer:**

   - Choose **MSI** package.
   - Select **Complete** installation.
   - Install MongoDB as a **Windows service** (recommended).
   - Optionally install **MongoDB Compass** (GUI).

3. **Verify Installation:**

```bash
mongod --version
```

## 🪟 Linux (Ubuntu/Debian)

Follow the steps below to install **MongoDB Community Edition** on a Ubuntu or Debian system.

---

## 📥 1. Import the MongoDB public GPG key

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

## 📥 2. Create the MongoDB source list

```bash
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

## 📥 3. Update package index

```bash
sudo apt update
```

## 📥 4. Install MongoDB

```bash
sudo apt install -y mongodb-org
```

## 📥 5. Start and enable MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 📥 6. Verify installation

```bash
mongod --version
```

## 📥 7. Connect to MongoDB shell

```bash
mongosh
```

## 🪟 macOS (Homebrew)

Follow the steps below to install **MongoDB Community Edition** on macOS using [Homebrew](https://brew.sh).

---

## ☑️ Prerequisites

Make sure [Homebrew](https://brew.sh) is installed.  
If not, install it using the following command:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 📥 1. Tap the MongoDB formula

```bash
brew tap mongodb/brew
```

## 📥 2. Install MongoDB Community Edition

```bash
brew install mongodb-community@7.0
```

## 📥 3. Start MongoDB as a service

```bash
brew services start mongodb-community@7.0
```

## 📥 4. (Optional) Stop MongoDB service

```bash
brew services stop mongodb-community@7.0
```

## 📥 5. Verify installation

```bash
mongod --version
```

## 📥 6. Connect to MongoDB shell

```bash
mongosh
```

# NOW SETUP IN LOCAL

- Copy `.env.example` to `.env` and set variable values.

## Install all the packages

- `npm install --global yarn`
- `yarn install`

## Start server

- `yarn run dev`

To start the server, run the command `yarn run dev` in your terminal. Once the server is up and running, you can access it at `http://localhost:8002`.

In addition to the server, you can also access the Swagger documentation at `http://localhost:8002/api-docs/`.

---

## CREATE MODEL

- Go to `prisma` directory then write your model details in `schema.prisma` file.
- For migrating new model changes, run:
  `yarn run migration`

---

## API CREATION

- Open the `index.ts` file located in the routes folder of your project, and write the route for your new API.
- Make sure to include validation while creating the API.
- Write the controller code to handle requests and responses for your API.
- Write your business logic in the service file associated with your API.

---
