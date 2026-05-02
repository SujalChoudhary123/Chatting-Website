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

## Core Features

- Create an account with Gmail OTP verification
- Chat in real time across rooms and direct conversations
- See who is online and who is typing
- Send files and images inside conversations
- React to messages and track unread activity
- Search users, messages, and shared media
- Edit profile details and upload an avatar
- Start voice and video calls from the chat UI

## Core Features

- Create an account with Gmail OTP verification
- Chat in real time across rooms and direct conversations
- See who is online and who is typing
- Send files and images inside conversations
- React to messages and track unread activity
- Search users, messages, and shared media
- Edit profile details and upload an avatar
- Start voice and video calls from the chat UI

## Deployment

- Frontend: deploy `frontend/` to Vercel
- Backend: deploy `backend/` to Render with `render.yaml`
- Database: use MongoDB Atlas

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
