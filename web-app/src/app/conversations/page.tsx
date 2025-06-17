"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import socketService from "@/services/socket";
import { useConversationStore } from "@/store/useConversationStore";

export default function ConversationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const {
    isLoading: isConvoLoading,
    error,
    fetchConversations
  } = useConversationStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Disconnect WebSocket when leaving conversations section
  useEffect(() => {
    return () => {
      socketService.disconnect();
      console.log("WebSocket disconnected (left conversations)");
    };
  }, []);

  if (isLoading || isConvoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-100 text-red-700 rounded-md px-6 py-4 mb-4">
          {error}
        </div>
        <button
          onClick={() => fetchConversations()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No conversations yet</p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              onClick={() => {
                // Focus on search bar in sidebar
                const searchInput = document.querySelector(
                  'input[placeholder*="Search"]'
                ) as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                }
              }}
            >
              Start a conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
