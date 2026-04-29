# PulseChat

PulseChat is a richer real-time team chat application inspired by WhatsApp, Discord, and Slack. It is designed to showcase the exact skills recruiters look for in networking-heavy full-stack projects:

- Real-time messaging with Socket.IO
- Online and offline presence tracking
- Typing indicators
- File and image sharing
- Group chat rooms
- JWT authentication
- MongoDB persistence for users, rooms, and messages
- Emoji reactions on messages
- Unread room badges and room activity previews
- Search across messages and attachments
- Favorite rooms and collaboration-focused UI

## Tech Stack

- Frontend: React + Vite + Socket.IO Client
- Backend option 1: Node.js + Express + Socket.IO + Multer + JWT
- Backend option 2: Java `HttpServer` + multithreaded executor + JWT-style signed tokens + file persistence
- Backend option 3: C++17 + WinSock HTTP/SSE server + DSA-backed in-memory indexes + JSON file persistence
- Database:
  Node backend: MongoDB + Mongoose
  Java backend: local serialized data store
- Auth: Email/password login with hashed passwords and JWT-secured APIs/sockets

## Project Structure

```text
package.json
backend/
  src/
    config.js
    db/connect.js
    middleware/auth.js
    models/
    server.js
    services/
    utils/message.js
frontend/
  src/
    App.jsx
    components/
    hooks/
    lib/
    main.jsx
    services/
    styles.css
backend-java/
  src/
    PulseChatJavaServer.java
backend-cpp/
  src/
    PulseChatCppServer.cpp
```

## Getting Started

### 1. Install dependencies

```bash
cd .
npm install
cd backend
npm install
cd ../frontend
npm install
```

### 2. Choose a backend

#### Option A: Node.js backend

Use the existing MongoDB-backed backend when you want the full feature set, including Socket.IO chat, realtime presence, typing indicators, file uploads, WebRTC call signaling, and recruiter-friendly sockets/networking coverage.

Set your frontend env to:

```bash
VITE_BACKEND_RUNTIME=node
VITE_API_URL=http://localhost:4000
```

Required backend env values in [backend/src/.env](backend/src/.env):

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/pulsechat
JWT_SECRET=change-this-in-production
CLIENT_URL=http://localhost:5173
```

Run it with:

```bash
npm run dev:backend
npm run dev:frontend:node
```

#### Option B: Java backend

Use the separate Java backend when you want a second implementation without disturbing the Node server. It keeps the same REST-style app flow for auth, rooms, messages, reactions, and connection requests.

Set your frontend env to:

```bash
VITE_BACKEND_RUNTIME=java
VITE_API_URL=http://localhost:8080
```

Optional Java backend env values in `backend-java/.env`:

```bash
PORT=8080
CLIENT_URL=http://localhost:5173
JWT_SECRET=java-backend-secret
OTP_TTL_MINUTES=5
EXPOSE_DEV_OTP=true
DATA_FILE=backend-java/data/pulsechat-java.ser
```

Run it with:

```bash
npm run dev:backend:java
npm run dev:frontend:java
```

#### Option C: C++ backend

Use the C++ backend when you want a third independent implementation that keeps the app working while showcasing backend DSA in a practical way.

Set your frontend env to:

```bash
VITE_BACKEND_RUNTIME=cpp
VITE_API_URL=http://localhost:8091
```

Optional C++ backend env values in `backend-cpp/.env`:

```bash
PORT=8091
CLIENT_URL=http://localhost:5173
JWT_SECRET=cpp-backend-secret
OTP_TTL_MINUTES=5
EXPOSE_DEV_OTP=true
DATA_FILE=backend-cpp/data/pulsechat-cpp.json
```

Run it with:

```bash
npm run dev:backend:cpp
npm run dev:frontend:cpp
```

You can also skip manual frontend env edits and use the runtime-specific frontend env files that these scripts load:

- `frontend/.env.node`
- `frontend/.env.java`
- `frontend/.env.cpp`

Notes for C++ mode:

- It follows the same REST-style flow as the Java backend and uses SSE for live updates
- It keeps the Node and Java backends untouched
- It uses `unordered_map` indexes for fast entity lookup and a direct-message graph to rank user search results by relevance and mutual connections
- File uploads remain disabled just like the Java backend, while avatar images still work through stored URLs/data URLs

Notes for Java mode:

- It uses Java networking via `HttpServer`
- It uses multithreading via a fixed thread-pool executor
- The overall project still includes sockets through the existing Node.js + Socket.IO backend
- Java mode uses polling instead of Socket.IO, so voice/video calls and file uploads stay on the Node backend

### 3. Start the frontend

```bash
npm run dev:frontend
```

The generic `npm run dev:frontend` command uses whatever is currently in `frontend/.env`.

If you want a guaranteed backend-specific frontend config, use:

```bash
npm run dev:frontend:node
npm run dev:frontend:cpp
```

You can also run the same mode-specific commands inside `frontend/`:

```bash
npm run dev:node
npm run dev:cpp
```

The frontend runs on `http://localhost:5173`.

### 4. Create an account

- Open the frontend
- Sign up with name, email, and password
- The app stores your account in MongoDB and uses JWT for authenticated API and socket access

## Feature Walkthrough

### Real-time messaging

- Users join rooms over Socket.IO
- Messages are broadcast instantly to everyone in the same room
- Each room tracks live activity previews and latest message metadata
- Message history is stored in MongoDB instead of resetting on server restart

### Authentication

- Users register and log in with email and password
- Passwords are hashed with `bcryptjs`
- REST APIs require a bearer token
- Socket.IO connections are authenticated with the same JWT

### Presence

- Each connected user is tracked in-memory
- Room member lists update when users connect, switch rooms, or disconnect
- Members get lightweight profile metadata for avatars and visual identity

### Typing indicators

- The frontend emits a typing event when the user types
- The backend relays typing state to other room members
- Typing state clears on send, room switch, and disconnect

### File and image sharing

- Files are uploaded to the backend using `multipart/form-data`
- Uploaded files are served statically and shared in chat as message attachments

### Group chats

- Users can join existing rooms or create new ones from the UI
- Each room maintains its own message history and member list

### Product-style collaboration features

- Favorite important rooms so they stay pinned higher in the list
- See unread badges for rooms you are not actively viewing
- Search messages and shared files inside the active room
- React to messages with emojis to simulate modern team chat workflows
- View room topics, last-message previews, and lightweight activity stats

### Better project structure

- Backend is split into models, auth middleware, database services, and socket handling
- Frontend logic is split into components, services, and small hooks
- Environment variables let you change the backend URL, MongoDB connection, upload rules, and JWT secret

## Interview Talking Points

- Explain how JWT-secured sockets differ from open socket connections
- Discuss why MongoDB fits chat-style message documents and room/message relationships
- Talk about how presence is kept in memory while durable chat history lives in MongoDB
- Mention how file uploads and static serving work end-to-end
- Walk through how message reactions and unread counters depend on event-driven state updates
- Describe how you would extend this with refresh tokens, direct messages, notifications, and read receipts

## Good Next Upgrades

- Redis adapter for horizontal scaling
- Refresh tokens and password reset flow
- Read receipts and message delivery states
- Direct messages and invite-only private rooms
- Rich media previews and drag-and-drop uploads
