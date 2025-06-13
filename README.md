# Pace: Your Real-time Chat Application

Welcome to **Pace**, a general-purpose chat application designed for seamless real-time communication. This README provides a quick overview to help developers understand its core architecture and how to get started.

## 🏗️ Architecture Overview

Pace is built with a modern, scalable architecture:

### 📱 Mobile App (React Native + Expo)
- **Framework**: React Native with Expo managed workflow
- **Language**: TypeScript with strict mode
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation v7
- **State Management**: Zustand for global state
- **Network**: Axios for HTTP, Socket.io-client for WebSocket
- **Platforms**: iOS and Android

### 🔧 Backend (Kotlin + Vert.x)
- **Language**: Kotlin
- **Framework**: Vert.x for reactive programming
- **Authentication**: JWT with Auth0 java-jwt
- **Database**: In-memory database (development)
- **Serialization**: Jackson + Kotlinx Serialization
- **Logging**: KLogging
- **Build Tool**: Gradle

## 🌐 Communication Protocols

Pace's backend leverages two key communication protocols:

* **HTTP/REST**: Handles all standard client-server interactions. This includes user authentication, managing profiles, fetching historical chat messages, and handling file uploads.
* **WebSockets (WSS)**: Powers the real-time aspects of the app. This is how messages are sent and received instantly, typing indicators appear, and user presence (online/offline status) is updated live.

This design ensures both robust data management and fluid, instantaneous communication.

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** for mobile app development
- **Java 17+** for backend development
- **Expo CLI** for mobile app
- **IntelliJ IDEA** (recommended for backend)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/tai-tran-tan/pace-chat.git
   cd pace-chat
   ```

2. **Start the Backend**
   ```bash
   cd backend
   ./gradlew run
   ```
   Backend will start on `http://localhost:8080`

3. **Start the Mobile App**
   ```bash
   cd mobile-app
   npm install
   npm start
   ```

### 1. API Documentation

The complete API specification is available in **OpenAPI (formerly Swagger) format** at `backend/docs/api.yaml`. This document details all HTTP endpoints, their request/response schemas, and the various message types exchanged over the WebSocket connection.

### 2. Authentication

All sensitive operations, including real-time WebSocket communication, require authentication. Pace uses **JWT (JSON Web Tokens)** with Auth0 library for secure access. You'll obtain these tokens via standard HTTP login endpoints, and then use them to authenticate both your REST API calls and your WebSocket connection.

### 3. Real-time Communication

Once authenticated, your client will establish a **WebSocket connection** to the dedicated WSS endpoint. All real-time events, such as sending a message, receiving a new message, typing notifications, and presence updates, will occur over this persistent connection.

### 4. File Uploads

Pace supports sharing media and files within conversations. Files are uploaded via a dedicated **HTTP endpoint** and then referenced in messages exchanged over WebSockets.

## 📁 Project Structure

```
pace-chat/
├── mobile-app/           # React Native + Expo app
│   ├── components/       # Reusable UI components
│   │   ├── screens/          # Screen components
│   │   ├── services/         # API and WebSocket services
│   │   ├── store/           # Zustand state stores
│   │   └── types/           # TypeScript type definitions
│   ├── backend/             # Kotlin + Vert.x backend
│   │   ├── src/main/kotlin/com/pace/
│   │   │   ├── router/      # API route handlers
│   │   │   ├── data/        # Data models and database
│   │   │   ├── security/    # JWT authentication
│   │   │   └── ws/          # WebSocket handlers
│   │   └── docs/           # API documentation
│   └── docs/               # Project documentation
```

## 🛠️ Development

### Mobile App Development
- Use Expo CLI for development and testing
- Follow React Native Paper design guidelines
- Implement proper error handling for network requests
- Use Zustand for state management
- Follow TypeScript strict mode guidelines

### Backend Development
- Use IntelliJ IDEA for Kotlin development
- Follow Vert.x reactive programming patterns
- Implement proper JWT token validation
- Use KLogging for structured logging
- Follow Kotlin idiomatic code style

## 🔒 Security Notes

⚠️ **Important**: The current implementation uses hardcoded JWT secrets and dummy user passwords for development. NEVER use these in a production environment. Always use strong, randomly generated secrets and proper password hashing.

## 🤝 Contributing

We welcome contributions! If you're interested in helping develop Pace, please refer to our `CONTRIBUTING.md` guide (if available) or reach out to the project maintainers.

Ready to dive in and start building with Pace? Feel free to explore the OpenAPI documentation and experiment with the API.