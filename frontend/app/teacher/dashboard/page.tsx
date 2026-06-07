"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  BookOpen, 
  ChevronRight,
  TrendingDown,
  Brain
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "teacher") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setTeacher(userRes.data);

        const statsRes = await api.get("/teacher/dashboard-stats");
        setStats(statsRes.data);
      } catch (err) {
        console.error("Teacher dashboard stats load failed:", err);
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

  if (!teacher || !stats) return null;

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low": return "success";
      case "medium": return "warning";
      case "high": return "danger";
      default: return "neutral";
    }
  };

  return (
    <LayoutWrapper userRole={teacher.role} userName={teacher.full_name}>
      
      {/* Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor classroom metrics, topic mastery distributions, and student risk standings.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/teacher/quizzes">
            <Button variant="outline" className="flex items-center gap-2">
              <BookOpen size={16} />
              Manage Quizzes
            </Button>
          </Link>
          <Link href="/teacher/students">
            <Button className="flex items-center gap-2">
              <Users size={16} />
              Student Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards (4 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-650 rounded-xl">
              <Users size={22} className="text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
              <h3 className="text-2xl font-extrabold text-slate-850 mt-0.5">{stats.total_students}</h3>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-650 rounded-xl">
              <TrendingUp size={22} className="text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Class Score</span>
              <h3 className="text-2xl font-extrabold text-slate-850 mt-0.5">{stats.class_average}%</h3>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-650 rounded-xl">
              <ShieldAlert size={22} className="text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wider block text-rose-600">At-Risk Students</span>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-0.5">{stats.at_risk_count}</h3>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-655 rounded-xl">
              <BookOpen size={22} className="text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quizzes Created</span>
              <h3 className="text-2xl font-extrabold text-slate-850 mt-0.5">{stats.quizzes_created}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Class topic performance bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">Class Average per Topic</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Average scores registered across all students per subject area</p>
          </CardHeader>
          <div className="h-72 w-full mt-4">
            {stats.class_averages && stats.class_averages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.class_averages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg_score" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Average Score %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No class averages recorded yet.
              </div>
            )}
          </div>
        </Card>

        {/* At-Risk Students list */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-800">At-Risk Students Table</CardTitle>
            <p className="text-[10px] text-slate-400 mt-0.5">Students with Medium or High risk standings requiring attention</p>
          </CardHeader>
          <div className="flex-1 overflow-y-auto max-h-60 mt-4 pr-1 space-y-3">
            {stats.at_risk_students && stats.at_risk_students.length > 0 ? (
              stats.at_risk_students.map((student: any) => (
                <div key={student.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{student.name}</h4>
                    <span className="text-[10px] text-slate-450 font-semibold">Last quiz: {student.last_score}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getRiskBadgeVariant(student.risk_level)}>
                      {student.risk_level}
                    </Badge>
                    <Link href={`/teacher/students?id=${student.id}`}>
                      <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-750 flex items-center gap-0.5">
                        <span>Profile</span>
                        <ChevronRight size={10} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-8 text-center">
                Outstanding! No students in risk standings.
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* Rank Lists (Top performing vs Struggling side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Top performing */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award size={16} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Top Performing Students</CardTitle>
              <p className="text-[10px] text-slate-400">Classroom headers ranked by average accuracy scores</p>
            </div>
          </CardHeader>
          <div className="space-y-3 mt-5">
            {stats.top_performing && stats.top_performing.map((student: any, idx: number) => (
              <div key={student.id} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                  <span className="text-xs font-semibold text-slate-750">{student.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-800">{student.score}%</span>
                  <Badge variant="success">Low Risk</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Struggling */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown size={16} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Struggling Students</CardTitle>
              <p className="text-[10px] text-slate-400">Classroom segments requiring educational intervention</p>
            </div>
          </CardHeader>
          <div className="space-y-3 mt-5">
            {stats.struggling && stats.struggling.map((student: any, idx: number) => (
              <div key={student.id} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                  <span className="text-xs font-semibold text-slate-755">{student.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-800">{student.score}%</span>
                  <Badge variant={getRiskBadgeVariant(student.risk_level)}>
                    {student.risk_level} Risk
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </LayoutWrapper>
  );
}
