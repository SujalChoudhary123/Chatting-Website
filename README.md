Website Link 👉 : https://pulsechatapp.vercel.app/
# PulseChat

PulseChat is a full-stack real-time chat application built for modern collaboration. It combines Gmail OTP onboarding, live messaging, presence, file sharing, and voice or video calling in one polished product.

## Why PulseChat

- Real-time messaging with Socket.IO
- Gmail OTP signup with Brevo email delivery
- Voice and video calling with WebRTC signaling
- Online presence, typing indicators, and unread badges
- File and image sharing
- Emoji reactions, favorites, search, and call history
- JWT-secured APIs and sockets
- Deploy-ready for Vercel, Render, and MongoDB Atlas

## Tech Stack

- Frontend: React, Vite, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, Multer
- Database: MongoDB, Mongoose
- Auth: JWT + OTP verification
- Email: Brevo API
- Deployment: Vercel + Render
<<<<<<< HEAD
=======

## Core Features

- Create an account with Gmail OTP verification
- Chat in real time across rooms and direct conversations
- See who is online and who is typing
- Send files and images inside conversations
- React to messages and track unread activity
- Search users, messages, and shared media
- Edit profile details and upload an avatar
- Start voice and video calls from the chat UI
>>>>>>> d5b564b (update)

## Core Features

<<<<<<< HEAD
- Create an account with Gmail OTP verification
- Chat in real time across rooms and direct conversations
- See who is online and who is typing
- Send files and images inside conversations
- React to messages and track unread activity
- Search users, messages, and shared media
- Edit profile details and upload an avatar
- Start voice and video calls from the chat UI

## Deployment
=======
```text
.
|-- backend/
|   |-- src/
|   `-- uploads/
|-- frontend/
|   |-- src/
|   `-- dist/
|-- render.yaml
`-- DEPLOY_FREE.md
```

This repository currently ships the Node.js backend used by the app.

## Quick Start
>>>>>>> d5b564b (update)

- Frontend: deploy `frontend/` to Vercel
- Backend: deploy `backend/` to Render with `render.yaml`
- Database: use MongoDB Atlas

<<<<<<< HEAD

=======
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Create your backend env file

```bash
cp backend/src/.env.example backend/src/.env
```

Set at least these values in `backend/src/.env`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/pulsechat
JWT_SECRET=change-this-in-production
```

The repo already includes `frontend/.env.node` for the local Node backend.

### 3. Start the app

```bash
npm run dev:backend
npm run dev:frontend:node
```

Open `http://localhost:5173`.

## OTP Email Setup

For local development, you can keep OTP in dev mode:

```env
EXPOSE_DEV_OTP=true
BREVO_API_KEY=
```

For real email OTP delivery through Brevo:

1. Verify a sender email or domain in Brevo.
2. Add these values to `backend/src/.env`.
3. Restart the backend.

```env
BREVO_API_KEY=your-brevo-api-key
BREVO_API_URL=https://api.brevo.com/v3/smtp/email
OTP_FROM_NAME=PulseChat
OTP_FROM_EMAIL=your-verified-sender@gmail.com
SMTP_ENABLED=false
EXPOSE_DEV_OTP=false
```

Note: the current signup flow accepts Gmail addresses only.

## Deployment

- Frontend: deploy `frontend/` to Vercel
- Backend: deploy `backend/` to Render with `render.yaml`
- Database: use MongoDB Atlas
- Full guide: [DEPLOY_FREE.md](DEPLOY_FREE.md)

Recommended production frontend env:

```env
VITE_BACKEND_RUNTIME=node
VITE_API_URL=https://your-render-service.onrender.com
```

>>>>>>> d5b564b (update)
## What This Project Shows

- Real-time architecture with Socket.IO
- Secure auth with OTP verification and JWT
- File upload handling and media workflows
- Presence, reactions, unread state, and search UX
- WebRTC call signaling inside a full-stack product
- Production-minded deployment and environment setup

## Next Improvements

- Read receipts and delivery states
- Push notifications
- Redis adapter for horizontal scaling
- Better moderation and admin controls
- Rich media previews and drag-and-drop uploads
