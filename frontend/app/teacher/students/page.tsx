"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft,
  Search, 
  ChevronRight, 
  X, 
  Clock, 
  Activity, 
  BrainCircuit, 
  TrendingUp, 
  ArrowUpDown,
  BookOpen,
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
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from "@/components/ui";

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("id");

  const [teacher, setTeacher] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting state
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Selected student details modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Suggestion drawer state
  const [showSuggestionDrawer, setShowSuggestionDrawer] = useState(false);
  const [suggestionStudent, setSuggestionStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState("Compiler Design");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [message, setMessage] = useState("");
  const [sendClassWide, setSendClassWide] = useState(false);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "teacher") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setTeacher(userRes.data);

        const rosterRes = await api.get("/teacher/students");
        setStudents(rosterRes.data);

        // Check if query parameter ID is present to auto-open drawer
        if (studentIdParam) {
          openStudentDetails(studentIdParam);
        }
      } catch (err) {
        console.error("Teacher students load failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentIdParam, router]);

  async function openStudentDetails(id: string) {
    setSelectedStudentId(id);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/teacher/students/${id}`);
      setStudentDetails(res.data);
    } catch (err) {
      console.error("Failed to load student details:", err);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeStudentDetails() {
    setSelectedStudentId(null);
    setStudentDetails(null);
    // Remove query parameter from URL
    router.replace("/teacher/students");
  }

  function openSuggestionDrawer(student: any) {
    setSuggestionStudent(student);
    setSelectedSubject("Compiler Design");
    setPriority("medium");
    setMessage("");
    setSendClassWide(false);
    setSuggestionError("");
    setShowSuggestionDrawer(true);
  }

  async function handleSendSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setSuggestionError("");
    
    if (!message.trim()) {
      setSuggestionError("Message cannot be empty.");
      return;
    }
    if (message.length > 500) {
      setSuggestionError("Message cannot exceed 500 characters.");
      return;
    }

    setSubmittingSuggestion(true);
    try {
      await api.post("/suggestions", {
        student_id: sendClassWide ? null : suggestionStudent.id,
        subject: selectedSubject,
        message: message.trim(),
        priority: priority
      });
      setShowSuggestionDrawer(false);
    } catch (err: any) {
      console.error("Failed to send suggestion:", err);
      setSuggestionError(err.response?.data?.detail || "An error occurred.");
    } finally {
      setSubmittingSuggestion(false);
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedRoster = () => {
    // 1. Filter by search query
    const filtered = students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort results
    return filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" 
          ? valA - valB 
          : valB - valA;
      }
    });
  };

  const sortedRoster = getSortedRoster();

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low": return "success";
      case "medium": return "warning";
      case "high": return "danger";
      default: return "neutral";
    }
  };

  return (
    <LayoutWrapper userRole={teacher?.role} userName={teacher?.full_name}>
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, sort, and inspect analytical profiles for all monitored students.
          </p>
        </div>
        
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <Input
            type="text"
            placeholder="Search student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Directory Table */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold select-none">
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1.5">
                    <span>Name</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("email")}>
                  <div className="flex items-center gap-1.5">
                    <span>Email</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("avg_score")}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Avg Score</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("quizzes_taken")}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Quizzes Taken</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("risk_level")}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Risk Level</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("last_active")}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Last Active</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRoster.length > 0 ? (
                sortedRoster.map((student: any) => (
                  <tr 
                    key={student.id} 
                    onClick={() => openStudentDetails(student.id.toString())}
                    className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-800">{student.name}</td>
                    <td className="p-4 text-slate-500">{student.email}</td>
                    <td className="p-4 text-center font-extrabold text-slate-800">{student.avg_score}%</td>
                    <td className="p-4 text-center font-semibold text-slate-500">{student.quizzes_taken}</td>
                    <td className="p-4 text-center">
                      <Badge variant={getRiskBadgeVariant(student.risk_level)}>
                        {student.risk_level}
                      </Badge>
                    </td>
                    <td className="p-4 text-right text-xs text-slate-400 font-medium">{student.last_active}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openSuggestionDrawer(student)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-105 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100/50 transition-all"
                      >
                        <MessageSquare size={12} />
                        <span>Suggest</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-450">No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details drawer Overlay */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto border-l border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-850">Student Performance Profile</h3>
                <p className="text-xs text-slate-400 mt-1">PRN: {studentDetails?.prn_no || "Loading..."}</p>
              </div>
              <button 
                onClick={closeStudentDetails}
                className="p-1 rounded-lg hover:bg-slate-105 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex-grow flex items-center justify-center flex-col py-10">
                <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 mt-2">Retrieving performance aggregates...</p>
              </div>
            ) : studentDetails ? (
              <div className="space-y-6">
                
                {/* Score & Risk banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projected Grade</span>
                    <div className="text-3xl font-extrabold text-indigo-650 mt-1">{studentDetails.predicted_score}%</div>
                  </div>
                  <div>
                    <Badge variant={getRiskBadgeVariant(studentDetails.risk_level)}>
                      {studentDetails.risk_level} Risk Level
                    </Badge>
                    <p className="text-[9px] text-slate-400 font-bold text-right mt-1.5 uppercase">{studentDetails.class_name}</p>
                  </div>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
                    <span className="text-base font-extrabold text-slate-800 mt-1 block">{studentDetails.overall_score}%</span>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Study Style</span>
                    <span className="text-xs font-bold text-slate-700 mt-1.5 block truncate">{studentDetails.preferred_style}</span>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                    <span className="text-xs font-bold text-slate-700 mt-1.5 block truncate">{studentDetails.email}</span>
                  </div>
                </div>

                {/* Score Trend Line Chart */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Score Trend</h4>
                  <div className="h-48 w-full border border-slate-200 rounded-xl p-4 bg-white">
                    {studentDetails.score_trend && studentDetails.score_trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={studentDetails.score_trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} name="Accuracy %" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-450">
                        No quiz attempts recorded.
                      </div>
                    )}
                  </div>
                </div>

                {/* Weak Topics */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Weak Topics</h4>
                  <div className="space-y-3">
                    {studentDetails.weak_topics && studentDetails.weak_topics.length > 0 ? (
                      studentDetails.weak_topics.map((wt: any, idx: number) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">{wt.subject}</span>
                            <span className="font-bold text-rose-600">{wt.score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${wt.score}%` }}></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-center">
                        No weak topics registered.
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Target AI Interventions</h4>
                  <div className="space-y-2">
                    {studentDetails.recommendations && studentDetails.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="p-3 border border-slate-200 bg-slate-50/50 rounded-xl flex items-start gap-2.5">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase mt-0.5 flex-shrink-0">
                          {rec.action}
                        </span>
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-750">{rec.subject}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-slate-400 text-xs text-center">Failed to fetch summary logs.</div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over suggestion drawer Overlay */}
      {showSuggestionDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
          onClick={() => setShowSuggestionDrawer(false)}
        >
          <div 
            className="w-full max-w-sm bg-white h-full shadow-none flex flex-col p-6 overflow-y-auto border-l border-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowSuggestionDrawer(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-6 border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Send Suggestion</h3>
              <p className="text-xs text-slate-500 mt-1">
                {sendClassWide ? "Send class-wide suggestion" : `Suggestions for: ${suggestionStudent?.name}`}
              </p>
            </div>

            <form onSubmit={handleSendSuggestion} className="space-y-5 flex-grow flex flex-col justify-between">
              <div className="space-y-5">
                {suggestionError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold">
                    {suggestionError}
                  </div>
                )}

                {/* Toggle: Class-wide suggestion */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <span className="text-xs font-bold text-slate-600">Send to entire class?</span>
                  <input 
                    type="checkbox" 
                    checked={sendClassWide} 
                    onChange={(e) => setSendClassWide(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Subject Select */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Compiler Design">Compiler Design</option>
                    <option value="Computer Networks">Computer Networks</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Internet of Things">Internet of Things</option>
                    <option value="Development Engineering">Development Engineering</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Priority Level</label>
                  <div className="flex gap-2">
                    {[
                      { val: "low", label: "Low", theme: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      { val: "medium", label: "Medium", theme: "bg-amber-50 text-amber-700 border-amber-200" },
                      { val: "high", label: "High", theme: "bg-rose-50 text-rose-700 border-rose-200" }
                    ].map((p) => {
                      const isSel = priority === p.val;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setPriority(p.val as any)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isSel 
                              ? `${p.theme} ring-2 ring-indigo-500 ring-offset-1`
                              : "bg-slate-50 border-slate-200 text-slate-655 hover:bg-slate-100"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Textarea for message */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 block">Personalized Suggestion</label>
                    <span className={`text-[10px] font-bold ${message.length > 500 ? "text-rose-600" : "text-slate-400"}`}>
                      {message.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    maxLength={500}
                    placeholder="Provide actionable suggestions..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={submittingSuggestion || !message.trim() || message.length > 500}
                className="w-full mt-4"
              >
                {submittingSuggestion ? "Sending..." : "Submit Suggestion"}
              </Button>
            </form>
          </div>
        </div>
      )}

    </LayoutWrapper>
  );
}

export default function TeacherStudents() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <StudentsContent />
    </Suspense>
  );
}
