"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  History, 
  Users, 
  Settings, 
  LogOut,
  UserCheck,
  User,
  BarChart3,
  MessageSquare,
  Library,
  UserPlus
} from "lucide-react";
import api from "@/lib/api";

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

export default function Sidebar({ userRole: propRole, userName: propName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState(propRole || "");
  const [name, setName] = useState(propName || "");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // If props are not passed, fetch current user info from session/API
    if (!role) {
      api.get("/auth/me")
        .then(res => {
          setRole(res.data.role);
          setName(res.data.full_name);
        })
        .catch(() => {
          // If unauthenticated, redirect to login
          router.push("/auth/login");
        });
    }
  }, [role, router]);

  useEffect(() => {
    const fetchUnread = () => {
      if (role === "student") {
        api.get("/auth/me")
          .then(res => {
            return api.get(`/suggestions/student/${res.data.id}`);
          })
          .then(res => {
            const count = res.data.filter((s: any) => !s.is_read).length;
            setUnreadCount(count);
          })
          .catch(err => {
            console.error("Failed to fetch suggestions unread count:", err);
          });
      }
    };

    fetchUnread();

    window.addEventListener("suggestions-updated", fetchUnread);
    return () => {
      window.removeEventListener("suggestions-updated", fetchUnread);
    };
  }, [role, pathname]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
      // Hard redirect just in case
      window.location.href = "/auth/login";
    }
  }

  // Define links based on user role
  const getNavLinks = () => {
    if (role === "student") {
      return [
        { href: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { href: "/student/dashboard#suggestions", label: "Suggestions", icon: <MessageSquare size={18} />, badge: unreadCount },
        { href: "/student/materials", label: "Study Materials", icon: <Library size={18} /> },
        { href: "/student/quiz", label: "Take Quiz", icon: <BookOpen size={18} /> },
        { href: "/student/results", label: "My Results", icon: <History size={18} /> },
        { href: "/student/profile", label: "Profile", icon: <User size={18} /> },
      ];
    } else if (role === "teacher") {
      return [
        { href: "/teacher/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { href: "/teacher/students", label: "Student Roster", icon: <Users size={18} /> },
        { href: "/teacher/suggestions", label: "Suggestions", icon: <MessageSquare size={18} /> },
        { href: "/teacher/materials", label: "Study Materials", icon: <Library size={18} /> },
        { href: "/teacher/quizzes", label: "Manage Quizzes", icon: <BookOpen size={18} /> },
      ];
    } else if (role === "admin") {
      return [
        { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
        { href: "/admin/pending", label: "Pending Students", icon: <UserPlus size={18} /> },
        { href: "/admin/users", label: "Users", icon: <UserCheck size={18} /> },
        { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <div className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between flex-shrink-0">
      <div>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200 flex items-center gap-2.5">
          <GraduationCap className="text-indigo-600" size={28} />
          <div>
            <span className="font-bold text-slate-800 tracking-tight text-lg">LearnTrack AI</span>
            <span className="block text-[10px] font-semibold text-slate-400 tracking-wide uppercase mt-0.5">Performance Engine</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-5 bg-slate-50 border border-slate-100 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
          <p className="text-sm font-bold text-slate-700 mt-0.5 truncate">{name || "Loading..."}</p>
          <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 text-[10px] font-bold mt-2 uppercase tracking-wide">
            {role || "user"}
          </span>
        </div>

        {/* Links Section */}
        <nav className="px-4 space-y-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 font-semibold" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="bg-indigo-650 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
