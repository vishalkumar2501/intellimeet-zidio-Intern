# IntellMeet

AI-Powered Enterprise Meeting & Collaboration Platform built with the MERN stack.

## Backend Dependencies

- **express**: Web framework for Node.js.
- **mongoose**: MongoDB object modeling tool.
- **dotenv**: Loads environment variables from a .env file.
- **cors**: Enables Cross-Origin Resource Sharing.
- **helmet**: Secures Express apps by setting various HTTP headers.
- **socket.io**: Enables real-time, bi-directional communication, chat functionality, and notifications.
- **bcryptjs**: Used for password hashing.
- **jsonwebtoken**: For secure stateless authentication.
- **cookie-parser**: Parses cookie headers to handle refresh tokens.
- **cloudinary**: Cloud-based image and video management service.
- **multer**: Middleware for handling multipart/form-data for file uploads.
- **multer-storage-cloudinary**: Custom storage engine for multer to upload directly to Cloudinary.
- **express-rate-limit**: Basic rate-limiting middleware for Express.
- **nanoid**: Generates short, unique meeting codes.
- **redis**: In-memory data structures store used for ultra-fast caching.
- **@socket.io/redis-adapter**: Allows real-time events to work across multiple server instances.

## Frontend Dependencies

- **React 19**: Modern UI library with hooks.
- **Zustand**: Lightweight and scalable state management.
- **TanStack Query (v5)**: Efficient server-state management and caching.
- **Tailwind CSS**: Utility-first styling with modern aesthetics.
- **shadcn/ui**: High-quality, accessible UI components.
- **sonner**: Beautiful and customizable toast notifications.

## Features

- **Participants List**: Real-time list of all users in the meeting with host identification.
- **Meeting History**: Track and view previous meeting data and codes from your dashboard.
- **Persistent Chat**: In-meeting chat with history powered by Redis and MongoDB.
- **Secure Auth**: JWT-based authentication with secure cookie-based refresh tokens.
- **Responsive Grid**: Adaptive video gallery that adjusts to participant count.

## Setup

1. Clone the repository.
2. Setup environment variables:
   - Create a `.env` file in the `backend/` folder.
   - Refer to `backend/.env.example` for all required keys.
3. Install dependencies:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`

## Run Development Server

### Backend

1. Go to the backend folder: `cd backend`
2. Start the server: `npm run dev`

### Frontend

1. Go to the frontend folder: `cd frontend`
2. Start the vite server: `npm run dev`

## WebRTC Signaling

Signaling is the process where browsers exchange setup information through a server to establish a direct Peer-to-Peer (P2P) connection. This project uses Socket.io to relay these signals.

| Term              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| **Offer**         | User A proposes a session with their media capabilities.            |
| **Answer**        | User B accepts and shares their media capabilities.                 |
| **ICE Candidate** | A list of possible IP addresses/network paths to reach the browser. |
