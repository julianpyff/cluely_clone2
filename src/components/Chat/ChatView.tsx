import React, { useState, useEffect, useRef } from 'react';
import './ChatView.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  type?: 'log' | 'error' | 'thought' | 'todo'; // For richer agent messages
}

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleAgentResponse = (agentMsgData: any) => {
    const newMessages: Message[] = [];
    const baseId = Date.now().toString();

    if (typeof agentMsgData === 'string') {
      newMessages.push({ id: `${baseId}-text`, text: agentMsgData, sender: 'agent' });
    } else if (typeof agentMsgData === 'object' && agentMsgData !== null) {
      // Handle structured messages, including plans
      if (agentMsgData.type === "agent_plan_response") {
        if (agentMsgData.thought) {
          newMessages.push({ id: `${baseId}-thought`, text: `Thought: ${agentMsgData.thought}`, sender: 'agent', type: 'thought' });
        }
        if (agentMsgData.message) { // General message accompanying the plan
          newMessages.push({ id: `${baseId}-main`, text: agentMsgData.message, sender: 'agent'});
        }
        if (agentMsgData.todo_list && Array.isArray(agentMsgData.todo_list)) {
          const todoText = agentMsgData.todo_list.map((item: any, index: number) =>
            `${index + 1}. ${item.description} (${item.status})`
          ).join('\n');
          if (todoText) {
            newMessages.push({ id: `${baseId}-todo`, text: `To-Do List:\n${todoText}`, sender: 'agent', type: 'todo' });
          }
        }
      } else if (agentMsgData.message) { // Generic structured message
         newMessages.push({ id: `${baseId}-main`, text: agentMsgData.message, sender: 'agent', type: agentMsgData.type as Message['type'] });
      } else if (agentMsgData.result) { // For playwright_task_response etc.
         newMessages.push({ id: `${baseId}-main`, text: `Result: ${agentMsgData.result}`, sender: 'agent', type: agentMsgData.type as Message['type'] || 'log' });
      } else if (agentMsgData.analysis_result) { // For screenshot/audio analysis
        newMessages.push({ id: `${baseId}-main`, text: `Analysis: ${agentMsgData.analysis_result}`, sender: 'agent', type: agentMsgData.type as Message['type'] || 'log' });
      } else if (agentMsgData.error_message) { // Handle errors from Python
        newMessages.push({ id: `${baseId}-error`, text: `Agent Error: ${agentMsgData.error_message}`, sender: 'agent', type: 'error' });
      } else { // Fallback for other object structures
        newMessages.push({ id: `${baseId}-json`, text: JSON.stringify(agentMsgData, null, 2), sender: 'agent', type: 'log' });
      }
    } else { // Fallback for unexpected types
      newMessages.push({ id: `${baseId}-unknown`, text: String(agentMsgData), sender: 'agent', type: 'log' });
    }

    if (newMessages.length > 0) {
      setMessages((prevMessages) => [...prevMessages, ...newMessages]);
    }
  };

  // Listener for agent messages from Electron main
  useEffect(() => {
    // Ensure window.electronAPI and onAgentResponse are defined before calling
    if (window.electronAPI && typeof window.electronAPI.onAgentResponse === 'function') {
      const cleanup = window.electronAPI.onAgentResponse((agentMessageData: any) => {
        handleAgentResponse(agentMessageData);
      });
      // Return the cleanup function to be called when the component unmounts or dependencies change
      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
    // If onAgentResponse is not available, return a no-op cleanup function
    return () => {};
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount


  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      // This will be the actual call to send message to Agent-S via main process
      const response = await window.electronAPI?.sendUserMessageToAgent({ type: "user_chat", payload: inputValue });
      // For now, the Python script's stdout is logged in main.ts.
      // Actual agent responses will come via the onAgentResponse listener.
      // If sendUserMessageToAgent itself returns a direct acknowledgement:
      if (response && response.status === 'error') {
        handleAgentResponse(`Error sending message: ${response.error_message}`, 'error');
      } else if (response && response.status === 'success' && response.immediate_response) {
        // If there's an immediate, simple response from the bridge itself
        handleAgentResponse(response.immediate_response, 'log');
      }

    } catch (error: any) {
        console.error("Error sending message via IPC:", error);
        handleAgentResponse(`Failed to send message: ${error.message || 'Unknown error'}`, 'error');
    }

    setInputValue('');
  };

  // Enhanced styling for message bubbles based on type for macOS feel
  const getMessageBubbleStyle = (msg: Message) => {
    let styles = "mb-2 p-3 rounded-xl max-w-lg break-words whitespace-pre-wrap shadow-md "; // Common styles
    if (msg.sender === 'user') {
      styles += "bg-blue-500 text-white ml-auto"; // User messages: Apple blue
    } else {
      styles += "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 mr-auto"; // Agent messages: Light gray / dark mode adjusted
      if (msg.type === 'error') {
        styles = "bg-red-100 text-red-700 border border-red-300 dark:bg-red-800 dark:text-red-200 dark:border-red-600 " + styles; // Error: Light red with border
      } else if (msg.type === 'thought') {
        styles = "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:border-purple-600 text-sm " + styles; // Thought: Light purple
      } else if (msg.type === 'todo') {
        styles = "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-600 text-sm " + styles; // To-do: Light yellow
      } else if (msg.type === 'log') {
        styles = "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs italic " + styles; // Log: Very light gray, smaller, italic
      }
    }
    return styles;
  };


  return (
    // Main container with a lighter overall background, more padding, and using system font stack
    <div className="chat-view-container bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col h-full p-3 rounded-lg shadow-lg font-sans">
      {/* Messages Area: Increased padding, softer scrollbars (via CSS), slightly lighter background */}
      <div className="chat-messages-area flex-grow overflow-y-auto mb-3 p-3 bg-white dark:bg-slate-800 rounded-md shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={getMessageBubbleStyle(msg)}
          >
            <strong className="capitalize block mb-1 text-xs font-semibold">{msg.sender}{msg.type && msg.type !== 'log' && msg.sender === 'agent' ? ` (${msg.type})` : ''}:</strong>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area: Modern feel, clear separation */}
      <div className="chat-input-area flex items-center p-1 bg-gray-100 dark:bg-slate-700 rounded-md shadow">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Message Agent-S..."
          className="flex-grow p-3 border-transparent rounded-md bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-shadow duration-150 ease-in-out shadow-sm"
        />
        <button
          onClick={handleSendMessage}
          className="ml-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50 transition-colors duration-150 ease-in-out shadow hover:shadow-md"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatView;
