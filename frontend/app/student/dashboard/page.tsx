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
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
            <span className="text-3xl font-extrabold text-slate-800 mt-2">{data.overall_score}%</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-600">
              <TrendingUp size={12} />
              <span>Avg quiz accuracy</span>
            </div>
          </div>
        </Card>

        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Quizzes Attempted</span>
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
          
          {/* Learning Recommendations Panel */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Learning Recommendations</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">AI-powered customized action steps based on performance analyses</p>
            </CardHeader>
            
            {data.latest_quiz_suggestions ? (
              <div className="space-y-4 mt-4">
                {/* Performance suggestion */}
                <div className={`p-4 rounded-xl border leading-relaxed text-xs font-semibold ${
                  data.overall_score > 70 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-805" 
                    : data.overall_score >= 40 
                    ? "bg-amber-50 border-amber-100 text-amber-805" 
                    : "bg-rose-50 border-rose-100 text-rose-805"
                }`}>
                  <span className="font-extrabold uppercase text-[9px] block mb-1">Performance Insight:</span>
                  {data.latest_quiz_suggestions.performance_suggestion}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject Suggestions */}
                  {data.latest_quiz_suggestions.subject_suggestions && data.latest_quiz_suggestions.subject_suggestions.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50">
                      <span className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider block mb-2">
                        Subject Study Plan
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-655 font-semibold">
                        {data.latest_quiz_suggestions.subject_suggestions.map((sug: string, idx: number) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Topic Suggestions */}
                  {data.latest_quiz_suggestions.topic_suggestions && data.latest_quiz_suggestions.topic_suggestions.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50">
                      <span className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider block mb-2">
                        Topics to Review
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-655 font-semibold">
                        {data.latest_quiz_suggestions.topic_suggestions.map((sug: string, idx: number) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Fallback to general recommendations
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {data.recommendations && data.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="p-5 border border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between h-44">
                    <div>
                      <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-extrabold uppercase rounded px-2 py-0.5">
                        {rec.action}
                      </span>
                      <h4 className="text-xs font-bold text-slate-700 mt-2 truncate">{rec.subject}</h4>
                      <p className="text-[11px] text-slate-505 leading-relaxed mt-1 line-clamp-3">
                        {rec.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-650 mt-3 hover:gap-2 transition-all cursor-pointer">
                      <span>Get Started</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Quiz Activity Card */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Recent Quiz Activity</CardTitle>
                <p className="text-xs text-slate-450 mt-0.5">Summary of your latest 5 quiz submissions</p>
              </div>
              <Link href="/student/results">
                <span className="text-xs font-bold text-indigo-650 hover:underline cursor-pointer">View All History</span>
              </Link>
            </CardHeader>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold select-none">
                    <th className="p-3">Subject</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Accuracy</th>
                    <th className="p-3 text-center">Performance Level</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_activity && data.recent_activity.length > 0 ? (
                    data.recent_activity.map((act: any) => (
                      <tr key={act.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-805">{act.subject}</td>
                        <td className="p-3 text-slate-405 font-medium">
                          {new Date(act.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3 text-center text-slate-600 font-semibold">
                          {act.score} / {act.total_questions}
                        </td>
                        <td className="p-3 text-center font-extrabold text-indigo-650">{Math.round(act.accuracy)}%</td>
                        <td className="p-3 text-center">
                          <Badge variant={act.performance_level.toLowerCase() === "high" ? "success" : act.performance_level.toLowerCase() === "medium" ? "warning" : "danger"}>
                            {act.performance_level}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/student/results?id=${act.id}`}>
                            <span className="text-[10px] font-bold text-indigo-650 hover:underline cursor-pointer">
                              Review
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No quiz attempts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
          
          {/* Strong Subjects */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Strong Subjects</CardTitle>
              <p className="text-xs text-slate-450 mt-0.5">Average accuracy score is 70% or above</p>
            </CardHeader>
            <div className="flex flex-wrap gap-2 mt-4">
              {data.strong_subjects && data.strong_subjects.length > 0 ? (
                data.strong_subjects.map((sub: any, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-805 text-xs font-semibold shadow-sm">
                    {sub.subject}: {sub.score}%
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-medium">No strong subjects detected yet.</span>
              )}
            </div>
          </Card>

          {/* Weak Subjects */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Weak Subjects</CardTitle>
              <p className="text-xs text-slate-450 mt-0.5">Average accuracy score is below 70%</p>
            </CardHeader>
            <div className="flex flex-wrap gap-2 mt-4">
              {data.weak_subjects && data.weak_subjects.length > 0 ? (
                data.weak_subjects.map((sub: any, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-805 text-xs font-semibold shadow-sm animate-pulse">
                    {sub.subject}: {sub.score}%
                  </span>
                ))
              ) : (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                  Excellent work! No weak subjects detected.
                </span>
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
