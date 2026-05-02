# PLM CMS Meeting Tracker

A lightweight in-house web app to track people you meet, their business details, and your running meeting notes timeline.

## Features

- Contact records with fields like name, company, email, phone, website, LinkedIn, tags, and next meeting date.
- Search contacts quickly.
- Per-contact timeline notes so you can review latest context before your next meeting.
- Team user splash screen to select active team member before entering the workspace.
- First-time password setup per team user on splash selection, then password login on later access.
- Editable profile details for each team member (role, email, phone, notes).
- Change attribution with user name and timestamp for contact create/update and timeline notes.
- Business-card image OCR upload that attempts to auto-fill contact details.
- Local JSON persistence in `data/db.json`.
- Passwords are never returned to the frontend and are stored as one-way hashes with per-user salts.

## Tech Stack

- Backend: Node.js + Express
- OCR: tesseract.js
- Frontend: Vanilla HTML/CSS/JavaScript

## Run Locally

1. Install dependencies:

   npm install

2. Start the app:

   npm run dev

3. Open in browser:

   http://localhost:3000

## Deploy On Railway (JSON Storage)

This app can run with plain JSON storage on Railway when you mount a persistent volume.

1. Create a Railway project and deploy this repository.
2. Add a persistent volume (for example mounted at `/data`).
3. Set environment variable `DB_PATH=/data/db.json`.
4. Ensure Railway starts the app with `npm start`.

If `DB_PATH` is not set, the app defaults to `data/db.json` in the project folder.

## Deploy On Vercel (KV Storage)

Use this path if you want to stay on Vercel and avoid database/certificate setup.

1. Import/deploy this repository in Vercel.
2. In your Vercel project, open `Storage` and add/connect `KV` (Upstash Redis).
3. Redeploy the project.

When KV env vars are present, the app uses KV automatically for persistent storage.

## API Overview

- `GET /api/users`: List team users
- `PUT /api/users/:id`: Update user profile fields
- `POST /api/users/:id/auth`: First-time set password or verify existing password
- `GET /api/contacts?search=`: List contacts
- `POST /api/contacts`: Create contact
- `GET /api/contacts/:id`: Get contact
- `PUT /api/contacts/:id`: Update contact
- `DELETE /api/contacts/:id`: Delete contact
- `POST /api/contacts/:id/notes`: Add timeline note
- `POST /api/ocr/business-card`: Upload business-card image as form field `cardImage`

## Notes

- OCR extraction quality depends on image clarity and card design.
- Uploaded files are temporary and deleted after OCR processing.
- For production JSON persistence, the runtime filesystem must be writable and persistent (Railway volume, VPS disk, etc.).
