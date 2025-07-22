# Pace Chat Web App

A modern web application for the Pace Chat platform, built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- 🔐 Authentication (Login/Register)
- 💬 Real-time messaging
- 🌙 Dark/Light theme support
- 📱 Responsive design
- 🚀 Modern UI with Framer Motion
- 🔄 Global error handling
- **Real-time**: Native WebSocket

## Global Error Handling

The application includes a comprehensive global error handling system for development mode:

### Development Mode Features

- **Automatic Toast Notifications**: All API errors are automatically displayed as toast messages
- **Detailed Error Information**: Shows HTTP status, endpoint, and error details
- **Console Logging**: Detailed error information is logged to browser console for debugging
- **Error Categorization**: Different handling for various HTTP status codes

### Error Types Handled

- **400 Bad Request**: Validation errors, malformed requests
- **401 Unauthorized**: Authentication failures
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **422 Validation Error**: Request validation failures
- **429 Rate Limited**: Too many requests
- **500 Server Error**: Internal server errors
- **502 Bad Gateway**: Gateway errors
- **503 Service Unavailable**: Service unavailable
- **Network Errors**: Connection issues
- **Request Errors**: Request setup failures

### Console Debugging

In development mode, errors are logged to console with:
- Error status and endpoint
- Full error response data
- Request configuration
- Complete error object

### Production Mode

In production mode, global error handling is disabled to avoid exposing sensitive information to users.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000/v1)
- `NODE_ENV`: Environment mode (development/production)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Real-time**: Native WebSocket
- **HTTP Client**: Axios

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                 # Utility functions
├── services/            # API and WebSocket services
├── store/               # Zustand stores
└── types/               # TypeScript type definitions
```

## Development

### Global Error Handling

The global error handling system is implemented in `src/services/api.ts` and automatically:

1. Catches all API errors in development mode
2. Shows appropriate toast messages
3. Logs detailed information to console
4. Provides context for debugging

### Adding New API Endpoints

When adding new API endpoints, the global error handling will automatically work for them. No additional configuration needed.

### Custom Error Handling

For specific cases where you need custom error handling, you can still catch errors in your components and handle them specifically while the global system provides the base error information.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
