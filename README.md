# Pace: Your Real-time Chat Application

Welcome to **Pace**, a general-purpose chat application designed for seamless real-time communication. This README provides a quick overview to help developers understand its core architecture and how to get started.

## Core Technologies

Pace's backend is built with a hybrid approach, leveraging the strengths of two key communication protocols:

* **HTTP/REST**: Handles all standard client-server interactions. This includes user authentication, managing profiles, fetching historical chat messages, and handling file uploads.
* **WebSockets (WSS)**: Powers the real-time aspects of the app. This is how messages are sent and received instantly, typing indicators appear, and user presence (online/offline status) is updated live.

This design ensures both robust data management and fluid, instantaneous communication.

## Getting Started

To get Pace up and running for development or to integrate with its API, you'll need to understand a few key areas:

### 1. API Documentation

The complete API specification is available in **OpenAPI (formerly Swagger) format**. This document details all HTTP endpoints, their request/response schemas, and the various message types exchanged over the WebSocket connection. It's your primary resource for understanding how to interact with Pace's backend.

### 2. Authentication

All sensitive operations, including real-time WebSocket communication, require authentication. Pace uses **JWT (JSON Web Tokens)** for secure access. You'll obtain these tokens via standard HTTP login endpoints, and then use them to authenticate both your REST API calls and your WebSocket connection.

### 3. Real-time Communication

Once authenticated, your client will establish a **WebSocket connection** to the dedicated WSS endpoint. All real-time events, such as sending a message, receiving a new message, typing notifications, and presence updates, will occur over this persistent connection. Refer to the OpenAPI spec for the exact JSON formats of these WebSocket messages.

### 4. File Uploads

Pace supports sharing media and files within conversations. Files are uploaded via a dedicated **HTTP endpoint** and then referenced in messages exchanged over WebSockets.

## Contributing

We welcome contributions! If you're interested in helping develop Pace, please refer to our `CONTRIBUTING.md` guide (if available) or reach out to the project maintainers.

Ready to dive in and start building with Pace? Feel free to explore the OpenAPI documentation and experiment with the API.