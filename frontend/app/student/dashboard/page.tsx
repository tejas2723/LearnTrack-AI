"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  BookOpen, 
  Activity, 
  BrainCircuit, 
  Clock, 
  AlertTriangle,
  Play,
  ArrowRight,
  BookMarked,
  MessageSquare
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        const user = userRes.data;
        if (user.role !== "student") {
          router.push(`/${user.role}/dashboard`);
          return;
        }
        setStudent(user);

        const analyticsRes = await api.get(`/analytics/student/${user.id}`);
        setData(analyticsRes.data);

        try {
          const suggestionsRes = await api.get(`/suggestions/student/${user.id}`);
          setSuggestions(suggestionsRes.data);
        } catch (sErr) {
          console.error("Failed to load suggestions:", sErr);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/suggestions/${id}/read`);
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, is_read: true } : s));
      window.dispatchEvent(new CustomEvent("suggestions-updated"));
    } catch (err) {
      console.error("Failed to mark suggestion as read:", err);
    }
  };

  const getPriorityClasses = (prio: string) => {
    switch (prio.toLowerCase()) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!student || !data) return null;

  return (
    <LayoutWrapper userRole={student.role} userName={student.full_name}>
      {/* Dashboard Welcome Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Welcome back, {student.full_name.split(" ")[0]}!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your performance, review recommendations, and prepare for your exams.
          </p>
        </div>
        <Link href="/student/quiz">
          <Button className="flex items-center gap-2">
            <Play size={16} fill="white" />
            Take Quiz
          </Button>
        </Link>
      </div>

      {/* Grid Cards (4 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
            <span className="text-3xl font-extrabold text-slate-800 mt-2">{data.overall_score}%</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600">
              <TrendingUp size={12} />
              <span>Avg quiz accuracy</span>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quizzes Taken</span>
            <span className="text-3xl font-extrabold text-slate-800 mt-2">{data.quizzes_taken}</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-indigo-600">
              <BookOpen size={12} />
              <span>Completed assessments</span>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Focus Score</span>
            <span className="text-3xl font-extrabold text-slate-800 mt-2">{data.focus_score}/100</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-amber-600">
              <Activity size={12} />
              <span>Concentration metrics</span>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Predicted Exam Score</span>
            <span className="text-3xl font-extrabold text-slate-800 mt-2">{data.predicted_exam_score}%</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-indigo-650">
              <BrainCircuit size={12} className="text-indigo-600" />
              <span className="text-indigo-600">ML-driven projection</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Score Trend - Left 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Score Trend</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Your performance average across the last 10 quiz attempts</p>
            </CardHeader>
            <div className="h-72 w-full mt-4">
              {data.score_trend && data.score_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.score_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No score history recorded. Take a quiz to populate details.
                </div>
              )}
            </div>
          </Card>
          
          {/* Personalized Recommendations Panel */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Personalized Recommendations</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">AI-powered customized action steps based on performance analyses</p>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {data.recommendations && data.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-5 border border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between h-44">
                  <div>
                    <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-extrabold uppercase rounded px-2 py-0.5">
                      {rec.action}
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 mt-2 truncate">{rec.subject}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1 line-clamp-3">
                      {rec.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 mt-3 hover:gap-2 transition-all cursor-pointer">
                    <span>Get Started</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Teacher Suggestions Panel */}
          <Card id="suggestions" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 scroll-mt-6">
            <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Teacher Suggestions</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Direct guidance and action items from your teachers</p>
              </div>
              <span className="p-2 bg-indigo-50 text-indigo-650 rounded-lg">
                <MessageSquare size={20} />
              </span>
            </CardHeader>
            <div className="space-y-4 mt-4">
              {suggestions.length > 0 ? (
                suggestions.map((s) => {
                  const isLong = s.message.length > 120;
                  const isExpanded = !!expandedIds[s.id];
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => !s.is_read && handleMarkAsRead(s.id)}
                      className={`relative p-5 border rounded-xl transition-all cursor-pointer ${
                        s.is_read 
                          ? "bg-slate-50/50 border-slate-200 hover:bg-slate-50" 
                          : "bg-indigo-50/10 border-indigo-150 hover:bg-indigo-50/20"
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {!s.is_read && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full" title="Unread suggestion"></div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getPriorityClasses(s.priority)}`}>
                          {s.priority}
                        </span>
                        {s.student_id === null && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-slate-100 text-slate-600 border-slate-200">
                            Class-Wide
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 ml-auto">
                          {new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800">{s.subject}</h4>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        By {s.teacher_name}
                      </p>

                      <div className="text-xs text-slate-600 leading-relaxed mt-3 whitespace-pre-wrap">
                        {isLong && !isExpanded ? (
                          <>
                            <span className="line-clamp-3">{s.message}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(s.id);
                              }}
                              className="text-[10px] font-bold text-indigo-600 mt-2 block hover:underline"
                            >
                              Show More
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{s.message}</span>
                            {isLong && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(s.id);
                                }}
                                className="text-[10px] font-bold text-indigo-600 mt-2 block hover:underline"
                              >
                                Show Less
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <MessageSquare className="mx-auto text-slate-300 mb-2" size={24} />
                  <p className="text-xs text-slate-550 font-bold">No suggestions yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Your teachers haven't sent any recommendations yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side Panels - 1 Column */}
        <div className="space-y-8">
          
          {/* Weak Topics */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Weak Topics</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Syllabus segments where scores are below 75%</p>
            </CardHeader>
            <div className="space-y-4 mt-4">
              {data.weak_topics && data.weak_topics.length > 0 ? (
                data.weak_topics.map((wt: any, idx: number) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{wt.subject}</span>
                      <span className="font-bold text-rose-600">{wt.score}%</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full" 
                        style={{ width: `${wt.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Excellent work! No weak topics detected.
                </div>
              )}
            </div>
          </Card>

          {/* Study Time Optimizer */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Time Optimizer</span>
              <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                Best study time: <span className="text-indigo-600">{data.best_study_time}</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Derived from peak concentration scores</p>
            </div>
          </Card>
        </div>
      </div>
    </LayoutWrapper>
  );
}
