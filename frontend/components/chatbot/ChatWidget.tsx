"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, MessageSquare, Send, X, Bot, User, BrainCircuit } from "lucide-react";
import api from "@/lib/api";

interface Message {
  id?: number;
  role: "user" | "assistant";
  message: string;
  created_at?: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session and load student details
  useEffect(() => {
    // 1. Get or create session ID in sessionStorage
    let storedSessionId = sessionStorage.getItem("learntrack_chat_session");
    if (!storedSessionId) {
      storedSessionId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      sessionStorage.setItem("learntrack_chat_session", storedSessionId);
    }
    setSessionId(storedSessionId);

    // 2. Fetch student profile/analytics to get weak topics
    async function fetchStudentData() {
      try {
        const userRes = await api.get("/auth/me");
        const user = userRes.data;
        if (user.role === "student") {
          const analyticsRes = await api.get(`/analytics/student/${user.id}`);
          if (analyticsRes.data && analyticsRes.data.weak_topics) {
            setWeakTopics(analyticsRes.data.weak_topics);
          }
        }
      } catch (err) {
        console.error("Failed to load student analytics for chatbot:", err);
      }
    }
    fetchStudentData();
  }, []);

  // Fetch chat history once session ID and open state are ready
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    async function fetchHistory() {
      try {
        const historyRes = await api.get(`/chatbot/history/${sessionId}`);
        if (historyRes.data) {
          setMessages(historyRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    }
    fetchHistory();
  }, [isOpen, sessionId]);

  // Auto scroll to bottom when messages or typing states change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typing]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userText = textToSend;
    setInputText("");
    setLoading(true);
    setTyping(true);

    // Append user message immediately
    setMessages(prev => [...prev, { role: "user", message: userText }]);

    try {
      // Use standard fetch to read streamed response
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId,
        }),
        credentials: "include", // Ensure session cookies are sent
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. Please sign in again.");
        } else if (response.status === 404) {
          throw new Error("Chatbot endpoint or student context not found (404).");
        } else {
          throw new Error(`Server returned error status: ${response.status}`);
        }
      }

      if (!response.body) {
        throw new Error("ReadableStream is not supported by response.");
      }

      setTyping(false);

      // Append empty assistant message slot to stream content into
      setMessages(prev => [...prev, { role: "assistant", message: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        assistantMsg += textChunk;

        // Update assistant message with streaming text
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1].message = assistantMsg;
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setTyping(false);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          message: err.message || "I encountered a connection issue. Please make sure the backend server is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  // Generate dynamic quick suggestions based on weak topics
  const getSuggestionChips = () => {
    const chips = ["How can I improve my overall score?"];
    if (weakTopics && weakTopics.length > 0) {
      weakTopics.forEach((topicObj: any) => {
        const sub = topicObj.subject;
        chips.push(`Give me a study guide for ${sub}`);
        chips.push(`Explain the core topics of ${sub}`);
      });
    } else {
      chips.push("Suggest a study schedule");
      chips.push("Explain how compiler parsing works");
    }
    return chips.slice(0, 3); // Limit to top 3 choices
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Panel */}
      {isOpen && (
        <div 
          className="mb-4 w-[380px] h-[520px] bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white relative">
                <BrainCircuit size={18} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-indigo-600"></span>
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">Gemini Doubt Assistant</h3>
                <span className="text-[10px] text-indigo-200">Personalized Academic Tutor</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4 scrollbar-thin"
          >
            {messages.length === 0 && !typing && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Bot size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Ask your academic doubts!</h4>
                  <p className="text-xs text-slate-400 max-w-[220px] mx-auto mt-1 leading-relaxed">
                    I know your weak areas and recent scores. Try asking me a concept question or choosing a prompt below.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div 
                  className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm border ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none" 
                      : "bg-white text-slate-700 border-slate-200/80 rounded-tl-none"
                  }`}
                >
                  {msg.message}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {/* Bouncing typing dots */}
            {typing && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-xl rounded-tl-none px-3.5 py-3.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {!loading && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
              {getSuggestionChips().map((chipText, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(chipText)}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-650 hover:text-indigo-600 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all shadow-sm flex items-center gap-1"
                >
                  <Sparkles size={8} className="text-indigo-550" />
                  {chipText}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Form */}
          <form 
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask an academic question..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-colors flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20"
        style={{ boxShadow: "0 4px 20px rgba(79, 70, 229, 0.3)" }}
        aria-label="Toggle chatbot"
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </div>
  );
}
