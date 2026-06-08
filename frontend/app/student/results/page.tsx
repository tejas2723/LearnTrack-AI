"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  BrainCircuit,
  Award,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Star,
  BookOpen,
  History,
  GraduationCap,
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Select } from "@/components/ui";

const SUBJECTS_KEYS: Record<string, string> = {
  "compiler_design": "Compiler Design",
  "computer_networks": "Computer Networks",
  "machine_learning": "Machine Learning",
  "internet_of_things": "Internet of Things",
  "development_engineering": "Development Engineering",
  "competitive_programming": "Competitive Programming",
  "java": "Java",
  "dbms": "DBMS"
};

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");
  
  const [student, setStudent] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        setStudent(userRes.data);
        
        if (resultId) {
          const res = await api.get(`/results/${resultId}`);
          setResult(res.data);
        } else {
          const res = await api.get("/results/my-history");
          setHistory(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load results data:", err);
        setLoadError("Could not load your quiz records. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resultId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!student) return null;

  const getPerformanceBadgeVariant = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "success";
      case "medium":
        return "warning";
      case "low":
        return "danger";
      default:
        return "neutral";
    }
  };

  // 1. Render Quiz History list
  if (!resultId) {
    const filteredHistory = history.filter(h => {
      if (subjectFilter === "All") return true;
      return h.subject === subjectFilter;
    });

    return (
      <LayoutWrapper userRole={student.role} userName={student.full_name}>
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <History size={30} className="text-indigo-650" />
              Quiz Attempt History
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              View your past academic quiz attempts, percentage scores, and performance levels.
            </p>
          </div>
          <Link href="/student/quiz">
            <Button className="w-fit flex items-center gap-2">
              <BookOpen size={16} />
              Take New Quiz
            </Button>
          </Link>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle size={18} className="text-rose-600" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Filters bar */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Completed Quizzes: <span className="text-indigo-600 font-extrabold text-sm">{filteredHistory.length}</span>
          </div>
          <div className="w-48">
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="All">All Subjects</option>
              {Object.entries(SUBJECTS_KEYS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
        </Card>

        {/* History table */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold select-none">
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 text-center">Percentage</th>
                  <th className="p-4 text-center">Performance Level</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">
                        {SUBJECTS_KEYS[item.subject] || item.subject.replace("_", " ").toUpperCase()}
                      </td>
                      <td className="p-4 text-slate-400 font-medium">
                        {new Date(item.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="p-4 text-center text-slate-600 font-semibold">
                        {item.score} / {item.total_questions}
                      </td>
                      <td className="p-4 text-center font-extrabold text-indigo-650">
                        {Math.round(item.accuracy)}%
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={getPerformanceBadgeVariant(item.performance_level)}>
                          {item.performance_level}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/student/results?id=${item.id}`}>
                          <Button variant="outline" className="text-[10px] font-bold py-1 px-3 h-8 shadow-sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      No quiz attempts found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </LayoutWrapper>
    );
  }

  // 2. Render Single Result details
  if (!result) return null;

  const correctAnswers = result.score;
  const incorrectAnswers = result.total_questions - result.score;

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "danger";
      default:
        return "neutral";
    }
  };

  const toggleQuestion = (qId: number) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <LayoutWrapper userRole={student.role} userName={student.full_name}>
      
      {/* Navigation header */}
      <Link 
        href="/student/results"
        className="inline-flex items-center gap-2 text-slate-450 hover:text-slate-655 text-sm mb-6 transition-colors font-semibold"
      >
        <ArrowLeft size={16} />
        Back to Quiz History
      </Link>

      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Core Result stats */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-2">Quiz Performance: {result.quiz_title}</h2>
          <p className="text-xs text-slate-400 mb-6">Completed on {new Date(result.timestamp).toLocaleDateString([], { dateStyle: "long" })}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Accuracy</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-2">{Math.round(result.accuracy)}%</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wide">Correct</span>
              <span className="text-2xl font-extrabold text-emerald-600 mt-2 flex items-center gap-1.5">
                <CheckCircle2 size={18} />
                <span>{correctAnswers}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col justify-between">
              <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wide">Incorrect</span>
              <span className="text-2xl font-extrabold text-rose-600 mt-2 flex items-center gap-1.5">
                <XCircle size={18} />
                <span>{incorrectAnswers}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Time Taken</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-2 flex items-center gap-1.5">
                <Clock size={18} className="text-slate-400" />
                <span>{result.time_taken_seconds}s</span>
              </span>
            </div>

          </div>
        </Card>

        {/* AI Insights panel */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg">
              <BrainCircuit size={20} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">AI Cognitive Performance Insights</CardTitle>
              <p className="text-[10px] text-slate-400">Gradient Boosting analytics and curriculum study recommendations</p>
            </div>
          </CardHeader>

          <CardContent className="p-0 pt-6 space-y-6">
            
            {/* Risk & Predicted score banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projected Exam Grade</span>
                  <div className="text-2xl font-extrabold text-indigo-650 mt-1">{Math.round(result.ai_insights.predicted_score)}%</div>
                </div>
                <div className="p-2 bg-indigo-100/40 text-indigo-600 rounded-full">
                  <Star size={20} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calculated Risk Profile</span>
                  <div className="mt-1">
                    <Badge variant={getRiskBadgeVariant(result.ai_insights.risk_level)}>
                      {result.ai_insights.risk_level} Risk
                    </Badge>
                  </div>
                </div>
                <div className="p-2 bg-slate-200/60 text-slate-650 rounded-full">
                  <Award size={20} />
                </div>
              </div>
            </div>

            {/* Weak Topics */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weak Topics Detected</span>
              <div className="flex flex-wrap gap-2">
                {result.ai_insights.weak_topics && result.ai_insights.weak_topics.length > 0 ? (
                  result.ai_insights.weak_topics.map((wt: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1.5 rounded-lg border border-rose-205 bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 animate-pulse"
                    >
                      <AlertTriangle size={12} className="text-rose-500" />
                      <span>{wt}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                    No weak topics detected. Great job!
                  </span>
                )}
              </div>
            </div>

            {/* Personalized Recommendations */}
            {result.personalized_suggestions && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Personalized Study Recommendations
                </span>
                
                {/* Performance feedback */}
                <div className={`p-4 rounded-xl border leading-relaxed text-xs font-medium ${
                  result.accuracy > 70 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : result.accuracy >= 40 
                    ? "bg-amber-50 border-amber-105 text-amber-800" 
                    : "bg-rose-50 border-rose-100 text-rose-805"
                }`}>
                  <span className="font-extrabold uppercase text-[10px] block mb-1">Performance Feedback:</span>
                  {result.personalized_suggestions.performance_suggestion}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject-Based Suggestions */}
                  {result.personalized_suggestions.subject_suggestions && result.personalized_suggestions.subject_suggestions.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50">
                      <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">
                        Subject-Specific suggestions
                      </span>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-655 font-semibold">
                        {result.personalized_suggestions.subject_suggestions.map((sug: string, idx: number) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Topic-Based Suggestions */}
                  {result.personalized_suggestions.topic_suggestions && result.personalized_suggestions.topic_suggestions.length > 0 && (
                    <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50">
                      <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block mb-2">
                        Suggested Topics to Revise
                      </span>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-655 font-semibold">
                        {result.personalized_suggestions.topic_suggestions.map((sug: string, idx: number) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Study Plan Actions</span>
              <div className="space-y-2.5">
                {result.ai_insights.recommendations && result.ai_insights.recommendations.map((rec: string, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-slate-200/60 hover:bg-slate-50/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-505 font-bold text-sm bg-indigo-50 border border-indigo-100 rounded-lg w-7 h-7 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-750 leading-relaxed">{rec}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Per-Question Review Panel */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Per-Question Review</CardTitle>
              <p className="text-[10px] text-slate-400">Detailed logs comparing response times and explanation details</p>
            </div>
            <span className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
              <HelpCircle size={20} />
            </span>
          </CardHeader>

          <div className="mt-6 space-y-4">
            {result.attempts && result.attempts.length > 0 ? (
              result.attempts.map((att: any, idx: number) => {
                const isExpanded = !!expandedQuestions[att.question_id];
                
                return (
                  <div 
                    key={att.question_id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      att.is_correct 
                        ? "border-emerald-100 bg-emerald-50/10" 
                        : "border-rose-100 bg-rose-50/10"
                    }`}
                  >
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => toggleQuestion(att.question_id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="mt-0.5">
                          {att.is_correct ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <XCircle size={16} className="text-rose-600" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={att.question_text}>
                            Question {idx + 1}: {att.question_text}
                          </p>
                          <div className="flex flex-wrap gap-2 items-center mt-1.5 text-[9px] font-bold text-slate-450 uppercase">
                            <span className="bg-slate-105 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                              {att.is_correct ? "Correct" : "Incorrect"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              <span>Time: {att.time_taken_seconds}s (Avg: {att.avg_time_taken_seconds}s)</span>
                            </span>
                            {att.confidence_level && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 flex items-center gap-0.5">
                                  <span>Confidence:</span>
                                  {Array.from({ length: att.confidence_level }).map((_, i) => (
                                    <Star key={i} size={8} className="fill-amber-400 text-amber-400" />
                                  ))}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <ChevronDown 
                        size={16} 
                        className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} 
                      />
                    </div>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 text-xs space-y-4 bg-white/50">
                        {/* Options List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {[
                            { code: "a", text: att.option_a },
                            { code: "b", text: att.option_b },
                            { code: "c", text: att.option_c },
                            { code: "d", text: att.option_d }
                          ].map((opt) => {
                            const isSelected = att.selected_option === opt.code;
                            const isCorrect = att.correct_option === opt.code;
                            
                            let optStyle = "border-slate-200 bg-white text-slate-600";
                            if (isCorrect) {
                              optStyle = "border-emerald-300 bg-emerald-50/50 text-emerald-800 font-semibold";
                            } else if (isSelected) {
                              optStyle = "border-rose-350 bg-rose-50/50 text-rose-800 font-semibold";
                            }
                            
                            return (
                              <div key={opt.code} className={`p-3 rounded-lg border text-[11px] flex items-center justify-between ${optStyle}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                                    isCorrect 
                                      ? "border-emerald-400 bg-emerald-500 text-white" 
                                      : isSelected 
                                      ? "border-rose-400 bg-rose-500 text-white" 
                                      : "border-slate-300 bg-slate-50 text-slate-400"
                                  }`}>
                                    {opt.code.toUpperCase()}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-wider">
                                  {isCorrect && <span className="text-emerald-700">Correct Answer</span>}
                                  {!isCorrect && isSelected && <span className="text-rose-700">Your Answer</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation block */}
                        {att.explanation && (
                          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 text-indigo-950">
                            <span className="block font-bold text-[9px] text-indigo-700 uppercase tracking-wide mb-1">Explanation:</span>
                            {att.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No question review attempts recorded for this result.</p>
            )}
          </div>
        </Card>

        {/* Dashboard button */}
        <div className="text-center pt-2">
          <Link href="/student/results">
            <Button className="w-full sm:w-48">Back to Quiz History</Button>
          </Link>
        </div>

      </div>
    </LayoutWrapper>
  );
}

export default function StudentResults() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
