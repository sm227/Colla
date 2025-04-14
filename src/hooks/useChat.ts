"use client";

import { useState, useCallback } from 'react';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean;
};

export type ChatState = {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
};

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string, hidden: boolean = false) => {
    if (!content.trim()) return;

    try {
      // Add user message to state (only if not hidden)
      const userMessage: Message = { role: 'user', content, hidden };
      
      if (!hidden) {
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, userMessage],
          isLoading: true,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }

      // Get all messages for context, including hidden ones
      const messagesForAPI = [...state.messages];
      if (hidden) {
        messagesForAPI.push(userMessage);
      }

      // Send message to API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: hidden ? messagesForAPI : [...state.messages, userMessage],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `Server responded with ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      if (!data.content) {
        throw new Error('Invalid response format from server');
      }

      // Add assistant response to state
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        hidden: false, // Always show assistant responses
      };

      setState((prev) => ({
        ...prev,
        messages: hidden 
          ? [...prev.messages, assistantMessage] // Skip adding the hidden user message
          : [...prev.messages, assistantMessage],
        isLoading: false,
      }));

      return assistantMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, [state.messages]);

  const clearChat = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    messages: state.messages.filter(msg => !msg.hidden), // Only expose non-hidden messages
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    clearChat,
  };
}; 