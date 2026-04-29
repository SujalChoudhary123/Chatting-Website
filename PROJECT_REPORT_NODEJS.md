# PROJECT REPORT

## Title: PulseChat Full Stack Chat Application
## Backend Used: Node.js

## 1. Abstract

PulseChat is a full stack realtime chat and collaboration application inspired by platforms like WhatsApp, Discord, and Slack. The project was developed to demonstrate frontend development, backend engineering, authentication, networking, database integration, and realtime communication in a single working system. The frontend is built using React and Vite, while the backend in this version is built using Node.js, Express, Socket.IO, MongoDB, and Mongoose.

The Node.js version is the most feature-rich implementation of the project. It supports user registration with Gmail OTP verification, secure login, realtime messaging, online presence, typing indicators, connection requests, emoji reactions, file uploads, and call signaling. MongoDB is used for persistent storage of users, messages, rooms, and requests. This project demonstrates how a modern full stack web application can be designed using modular architecture and realtime event-driven communication.

## 2. Introduction

Communication systems are one of the most important categories of modern web applications. A chat platform is an ideal full stack project because it combines user interface design, backend APIs, authentication, database operations, and realtime communication. PulseChat was built to provide a practical implementation of these concepts.

This report presents the full stack version of PulseChat using the Node.js backend. In this version, the backend handles REST APIs and Socket.IO communication, while the frontend provides a responsive user experience for account creation, chatting, connection requests, and collaboration workflows.

## 3. Problem Statement

Many chat applications require fast message delivery, secure authentication, persistent storage, and a clean user interface. Building such a system from scratch is challenging because it requires multiple technologies working together.

The goal of PulseChat is to solve this by providing:

- Secure user registration and login
- Realtime message delivery
- Persistent chat history
- Presence and typing feedback
- File and image sharing
- A scalable modular full stack architecture

## 4. Objectives

- To build a complete full stack chat application
- To implement secure authentication using OTP verification and password hashing
- To create REST APIs for users, rooms, messages, requests, and profile management
- To enable realtime communication through Socket.IO
- To store application data permanently using MongoDB
- To support attachment sharing through file upload
- To demonstrate clean project structure and modular backend services

## 5. Scope of the Project

The project covers the complete workflow of a modern communication app:

- Frontend interface for signup, login, chat, profile, and connection features
- Backend APIs for authentication and app data
- Realtime communication using sockets
- Persistent database storage
- File handling support

The Node.js version is suitable for demonstrating full stack web development using industry-standard tools and practices.

## 6. Technology Stack

### Frontend Technologies

- React
- Vite
- JavaScript
- CSS
- Socket.IO Client

### Backend Technologies

- Node.js
- Express.js
- Socket.IO
- Multer
- bcryptjs
- JSON Web Token
- Nodemailer
- dotenv
- cors

### Database

- MongoDB
- Mongoose

## 7. System Architecture

PulseChat follows a client-server full stack architecture.

### Frontend Layer

The frontend is built in React and is responsible for:

- Rendering the login and registration flow
- Displaying rooms and messages
- Handling form inputs and user actions
- Connecting to backend APIs
- Maintaining live state from realtime events

### Backend Layer

The Node.js backend handles:

- Authentication APIs
- Room and message APIs
- Connection request management
- Upload handling
- Realtime messaging and call signaling through Socket.IO

### Database Layer

MongoDB stores:

- User accounts
- Room details
- Messages
- Reactions
- Connection requests

## 8. Project Structure

```text
PulseChat/
  backend/
    src/
      config.js
      server.js
      db/
      middleware/
      models/
      services/
      utils/
  frontend/
    src/
      App.jsx
      components/
      hooks/
      lib/
      services/
      utils/
```

## 9. Modules of the Project

### 9.1 Authentication Module

This module handles account creation and login.

Features:

- Gmail OTP verification
- Signup token generation
- Username and password registration
- Secure password hashing using `bcryptjs`
- JWT-based authentication for protected routes and sockets

### 9.2 User Profile Module

This module allows the user to:

- View authenticated profile details
- Update display name
- Update username
- Set avatar URL

### 9.3 Room and Conversation Module

This module manages:

- Direct conversations
- Serialized room lists
- Room metadata
- Conversation lookup between users

### 9.4 Messaging Module

This module is responsible for:

- Sending and receiving messages
- Storing message history
- Loading old messages from the database
- Supporting text and attachments

### 9.5 Realtime Communication Module

This is one of the core strengths of the Node.js version.

It supports:

- Realtime message delivery
- Realtime room updates
- Presence tracking
- Typing indicators
- Connection request updates
- WebRTC call signaling events

### 9.6 File Upload Module

Using Multer, users can upload and share files in chat.

Features:

- File size restriction
- Secure local upload storage
- Attachment metadata generation
- Public file serving from the uploads directory

### 9.7 Connection Request Module

This module allows one user to:

- Search another user
- Send a connection request
- Accept an incoming request
- Automatically create a direct conversation after acceptance

## 10. Database Design

The database contains the following main entities:

### User

- Name
- Email
- Handle
- Avatar URL
- Password hash
- OTP hash
- OTP expiry
- Verification status

### Room

- Room name
- Slug / room id
- Participants
- Type of room

### Message

- Sender information
- Room reference
- Text content
- Attachment
- Reactions
- Timestamp

### Connection Request

- Sender
- Receiver
- Status
- Room reference after acceptance

## 11. Working Procedure

### Registration Flow

1. User enters name and Gmail address
2. Backend validates email and generates OTP
3. OTP is sent using Nodemailer if configured
4. User verifies the OTP
5. Backend issues a signup token
6. User selects username and password
7. Password is hashed and account registration is completed

### Login Flow

1. User enters username and password
2. Backend verifies credentials
3. JWT token is generated
4. User gains access to protected features

### Messaging Flow

1. Authenticated user opens a room
2. Socket connection is established
3. User sends a message
4. Backend stores it in MongoDB
5. Socket.IO broadcasts it to the other participant instantly

## 12. Key Features of the Full Stack Node.js Version

- Modern React frontend
- Secure signup and login flow
- OTP verification
- JWT authentication
- MongoDB persistence
- Realtime messaging
- Typing indicators
- Presence tracking
- Message reactions
- File uploads
- Connection requests
- Call signaling support

## 13. Advantages

- Uses industry-standard web technologies
- Supports rich realtime interaction
- Database-backed persistence
- Easy to extend with new features
- Clean modular structure for maintenance and scalability

## 14. Limitations

- Requires MongoDB server setup
- SMTP configuration is needed for email OTP delivery
- Presence is stored in memory and is not shared across multiple backend instances by default
- Uploads are stored locally rather than in cloud storage

## 15. Testing and Verification

The project was validated by checking:

- Signup and login workflow
- OTP generation and verification
- Token-protected routes
- Realtime messaging
- Room updates
- Reactions
- Upload flow
- Connection request acceptance

Manual testing was used to confirm frontend and backend integration.

## 16. Future Enhancements

- Read receipts
- Push notifications
- Redis adapter for scaling
- Password reset feature
- Cloud storage for uploads
- Admin moderation tools
- Group call support

## 17. Conclusion

PulseChat with the Node.js backend is a complete full stack web application that successfully combines frontend development, backend APIs, realtime communication, security, and database management. It demonstrates practical software engineering concepts used in real production systems. This version is especially strong for showcasing full stack development skills because it covers both traditional REST APIs and modern realtime communication patterns in a single project.
