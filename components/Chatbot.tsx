import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import useLocalization from '../hooks/useLocalization';
import { ai } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Chatbot = () => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const systemInstruction = `You are a friendly and helpful AI assistant for the "Grievance Redressal Portal". Your role is to answer user questions about the app.
  Key features of the app you should know about:
  - Users can submit complaints (grievances) about civic issues like Sanitation, Roads, Water Supply, etc.
  - To submit, users go to the "New Complaint" tab, fill in a title, category, description, attach photos, and provide their location.
  - Users can view the status of their submitted complaints under the "My Complaints" tab. Statuses include Submitted, In Progress, Resolved.
  - The app automatically routes complaints to the correct department using AI, especially for the 'Other' category.
  - The app supports multiple languages (English, Spanish, Hindi). Users can change the language in the header.
  - Users can save incomplete complaints as drafts from the "Drafts" tab and continue them later.
  - The app works offline. Complaints submitted offline are synced when the user is back online.

  Your instructions:
  - ONLY answer questions related to using this application.
  - If a user asks an unrelated question, politely decline and steer the conversation back to the app's features. For example, say "I can only help with questions about the Grievance Redressal Portal. How can I assist you with filing a complaint?"
  - Be concise and clear in your answers.
  - Do not invent features that don't exist.
  - You cannot perform actions for the user (like filing a complaint for them). You can only guide them on how to do it themselves.
  - Start the conversation with a friendly welcome message.`;

  useEffect(() => {
    if (ai) {
      const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
        },
      });
      setChat(chatSession);
      setMessages([
        { role: 'model', text: t('chatBotWelcome') }
      ]);
    }
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const stream = await chat.sendMessageStream({ message: trimmedInput });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ai) {
    return null; // Don't render the chatbot if the API key is not configured.
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 md:right-8 w-[calc(100%-2rem)] max-w-sm h-[60vh] max-h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-40 transition-transform duration-300 ease-out transform-gpu translate-y-0 opacity-100">
          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-bold text-lg">{t('chatBotTitle')}</h3>
            <button onClick={toggleChat} className="p-1 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Messages */}
          <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-xl px-4 py-2 max-w-[80%] ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-2 max-w-[80%] bg-gray-200 text-gray-800">
                      <div className="flex items-center justify-center space-x-1 h-5">
                          <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                      </div>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input Form */}
          <div className="border-t p-3 bg-white rounded-b-lg">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('chatBotPlaceholder')}
                className="flex-grow border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                aria-label="Chat input"
              />
              <button type="submit" disabled={isLoading || !inputValue.trim()} className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-4 sm:right-6 md:right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-50 transition-transform duration-200 hover:scale-110"
        aria-label="Open support chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </>
  );
};

export default Chatbot;
