# Pace Chat Backend

Welcome to the **Pace Chat Backend** repository! This service powers the Pace Chat application, providing both the core RESTful API and real-time WebSocket communication. It's built with **Kotlin** and the **Vert.x toolkit**, offering a reactive and high-performance foundation.

---

## 🚀 Quick Start for Developers

Follow these steps to get the Pace Chat Backend up and running on your local machine and to enable debugging.

### 1. Prerequisites

Make sure you have the following installed:

* **Java Development Kit (JDK) 17 or higher:** Required for Kotlin and Vert.x.
* **Git:** For cloning the repository.

### 2. Get the Code

First, clone the repository and navigate into the backend directory:

```bash
git clone [https://github.com/tai-tran-tan/pace-chat.git](https://github.com/tai-tran-tan/pace-chat.git)
cd pace-chat/backend
```
3. Build the Project
Build the project to download dependencies and compile the source code. This uses the Gradle Wrapper, so you don't need a separate Gradle installation.

```
./gradlew build
```

4. Run the Application
You can start the Vert.x application directly using the Gradle Wrapper:

```
./gradlew run
```

Once started, you'll see log messages confirming the server is active:

[main] INFO  com.pacechat.MainVerticle - HTTP and WebSocket server started on port 8080
HTTP API Base URL: http://localhost:8080/v1
WebSocket Endpoint: ws://localhost:8080/ws/chat
Important for Clients: If you're running a mobile emulator (like Android Emulator) or a separate physical device, localhost refers to its own loopback. To connect to your host machine's backend, configure your client app to use http://10.0.2.2:8080/v1 (for HTTP) and ws://10.0.2.2:8080/ws/chat (for WebSockets). For web clients on the same machine, localhost typically works.

🐞 Debugging with IntelliJ IDEA
IntelliJ IDEA is highly recommended for developing and debugging this Kotlin/Vert.x project.

Open the Project:

Open IntelliJ IDEA.
Select File -> Open...
Navigate to and select the pace-chat/backend directory. IntelliJ should recognize it as a Gradle project and import it.
Configure Remote JVM Debug:
To debug your application, you'll attach IntelliJ's debugger to the running JVM process.

Go to Run -> Edit Configurations...
Click the + button and select Remote JVM Debug.
Set the Port to 5005 (this is a common default, but can be any available port).
Copy the Command line arguments for remote JVM string provided by IntelliJ (it will look like -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005).
Give this configuration a descriptive Name like PaceChatBackend Debug Attach. Click OK.
Enable Debug Mode for vertxRun Task:
Now, tell Gradle to start your application with the debug agent enabled.

In the Run -> Edit Configurations... window, find your Gradle configuration. It's usually listed under the Gradle category and might be named backend [vertxRun] or similar.
In the VM options field for this Gradle task, paste the -agentlib: string you copied in the previous step.
Click Apply then OK.
Start and Attach Debugger:

Step 1: Run the Backend:

Open the Gradle tool window (usually on the right sidebar).
Navigate to Tasks -> application -> vertxRun. Double-click this task to run it.
The backend will start and print a message indicating it's listening for a debugger on port 5005 (e.g., Listening for transport dt_socket at address: 5005).
Step 2: Attach the Debugger:

Once the backend is running and listening, go to Run -> Debug 'PaceChatBackend Debug Attach' (the Remote JVM Debug configuration you created).
IntelliJ's debugger will connect. You can now set breakpoints in your Kotlin code, and the execution will pause when those breakpoints are hit, allowing you to inspect variables and step through your code.
💡 API Endpoints
For a detailed specification of all HTTP endpoints, their request/response formats, and WebSocket message types, please refer to the OpenAPI specification located in the docs/api.yaml file within this repository.

💾 Database
This backend utilizes an in-memory database (InMemoryDatabase.kt). This means:

All data (users, conversations, messages, etc.) is stored in RAM.
Data is reset every time the application restarts.
This setup is ideal for local development and testing but is not suitable for production environments, which would require a persistent database like PostgreSQL, MongoDB, etc.
⚠️ Important Notes
Security: The JWT secret (JwtConfig.kt) and dummy user passwords (InMemoryDatabase.kt) are hardcoded for simplicity. NEVER use these in a production environment. Always use strong, randomly generated secrets and proper password hashing (e.g., BCrypt).
CORS: The server is configured with a broad CORS policy (anyHost()) to facilitate local development. For production, restrict this to specific origins for security.
File Uploads: The /v1/messages/upload endpoint is a dummy implementation. A real application would integrate with cloud storage (e.g., AWS S3, Google Cloud Storage).