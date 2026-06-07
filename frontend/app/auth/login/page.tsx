"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Mail, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { role, access_token } = res.data;
      
      // Save token to localStorage for cross-domain auth
      if (access_token) {
        localStorage.setItem("access_token", access_token);
      }
      
      // Redirect based on backend role
      if (role === "student") {
        router.push("/student/dashboard");
      } else if (role === "teacher") {
        router.push("/teacher/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand logo header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3 shadow-sm border border-indigo-100">
            <GraduationCap size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to your LearnTrack AI account</p>
        </div>

        {/* Login Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Account Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  Remember me
                </label>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer helper links */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-750">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
