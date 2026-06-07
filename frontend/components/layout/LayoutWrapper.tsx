import React from "react";
import Sidebar from "./sidebar";
import ChatWidget from "../chatbot/ChatWidget";

interface LayoutWrapperProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
}

export default function LayoutWrapper({ children, userRole, userName }: LayoutWrapperProps) {
  return (
    <div className="flex bg-slate-50 min-h-screen w-full">
      {/* Navigation Sidebar */}
      <Sidebar userRole={userRole} userName={userName} />
      
      {/* Core Page Content */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen w-full">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Floating Doubt Assistant Chatbot */}
      {userRole === "student" && <ChatWidget />}
    </div>
  );
}
