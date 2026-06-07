"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ShieldAlert, 
  Award, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

const COLORS = ["#6366f1", "#10b981", "#f59e0b"];

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "admin") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setAdmin(userRes.data);

        const statsRes = await api.get("/admin/stats");
        setStats(statsRes.data);
      } catch (err) {
        console.error("Admin stats failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin || !stats) return null;

  return (
    <LayoutWrapper userRole={admin.role} userName={admin.full_name}>
      
      {/* Title */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Admin Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor platform metrics, role distributions, registration rates, and activity logs.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/analytics">
            <Button variant="outline" className="flex items-center gap-2">
              System Analytics
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button className="flex items-center gap-2">
              Manage Users
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards (5 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Users</span>
          <h3 className="text-2xl font-extrabold text-slate-850 mt-1.5">{stats.total_users}</h3>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
          <h3 className="text-2xl font-extrabold text-slate-850 mt-1.5 text-indigo-600">{stats.total_students}</h3>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Teachers</span>
          <h3 className="text-2xl font-extrabold text-slate-850 mt-1.5 text-emerald-600">{stats.total_teachers}</h3>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Quizzes</span>
          <h3 className="text-2xl font-extrabold text-slate-850 mt-1.5">{stats.total_quizzes}</h3>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Platform Score</span>
          <h3 className="text-2xl font-extrabold text-slate-855 mt-1.5 text-amber-600">{stats.avg_platform_score}%</h3>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Registration Line Chart */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-slate-850">New Registrations (Last 30 Days)</CardTitle>
            <p className="text-[10px] text-slate-400">Chronological growth of user accounts registered on LearnTrack AI</p>
          </CardHeader>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.registrations_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* User Role Distribution Pie Chart */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">User Role Distribution</CardTitle>
            <p className="text-[10px] text-slate-400 mt-0.5">Ratio of students, teachers, and administrators</p>
          </CardHeader>
          <div className="h-48 w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.role_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.role_distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-around text-xs mt-4 font-bold border-t border-slate-100 pt-4">
            {stats.role_distribution.map((entry: any, idx: number) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-500">{entry.name}: <span className="text-slate-800">{entry.value}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <CardHeader className="p-0 pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Recent Platform Activity</CardTitle>
          <p className="text-[10px] text-slate-400 mt-0.5">Auditing the last 10 quiz submissions platform-wide</p>
        </CardHeader>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-3">Student Name</th>
                <th className="p-3">Quiz Challenge</th>
                <th className="p-3 text-center">Score Accuracy</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((act: any) => (
                  <tr key={act.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-850">{act.student_name}</td>
                    <td className="p-3 text-slate-600 font-medium">{act.quiz_title}</td>
                    <td className="p-3 text-center font-extrabold text-slate-800">{act.accuracy}%</td>
                    <td className="p-3 text-right text-slate-400 font-medium">{act.timestamp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">No submissions recorded on the platform yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </LayoutWrapper>
  );
}
