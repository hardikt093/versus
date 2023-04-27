# Versus Backend

# SETUP

- Copy .env.example to .env and set veriable values.

# Install all the packages

- yarn install

# Generate build of the project

- yarn run build

# Migrate database

- yarn run migration

# Start server

- yarn run dev
  After running yarn run dev command server will start at http://localhost:8000

# CREATE MODEL

- Go to prisma directory then write your model details in schema.prisma file
- For migrate new model write yarn run migration

# API CREATION

- Go to routes folder, write your route in index.ts file.
- Must use validation while creation of any new api.
- write your controller code.
- write your business login in service file only.
