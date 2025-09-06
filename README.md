
Near-Miss Fullstack Prototype
============================

This repository contains a simple React (Vite) client and a small Express server (lowdb) to store reports.

Client:
- Located in /client
- Dev: `cd client && npm install && npm run dev`
- Build: `cd client && npm run build`

Server:
- Located in /server
- Dev: `cd server && npm install && npm run dev` (nodemon)
- Start: `cd server && npm install && npm start`
- Server will run by default on port 4000 and expose API endpoints under /api/reports

Integration notes:
- Client attempts to POST to /api/reports — when serving client separately during development, you can use a proxy (Vite) or run server on same host.
- For production, build the client and copy the build into server/client-build (or configure a reverse proxy).

Files included:
- client/src/App.jsx    (React app using localStorage + tries to call server API)
- client/src/main.jsx
- client/index.html
- client/index.css
- client/package.json, tailwind & postcss configs
- server/index.js       (Express + lowdb)
- server/db.json
- server/package.json

