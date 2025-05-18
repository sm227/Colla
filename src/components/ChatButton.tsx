"use client";

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBot } from '@/components/ChatBot';

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg z-40"
        size="icon"
        aria-label="Open AI Chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
      
      <ChatBot 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
} 