"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Play, 
  Upload, 
  Download, 
  Database,
  Layers,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from "@/components/ui";

export default function TeacherQuizzes() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control: "editor" or "bank"
  const [activeTab, setActiveTab] = useState<"editor" | "bank">("editor");

  // Quiz form state
  const [title, setTitle] = useState("");
  const [quizSubject, setQuizSubject] = useState("compiler_design");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([
    { 
      question_text: "", 
      option_a: "", 
      option_b: "", 
      option_c: "", 
      option_d: "", 
      correct_option: "a", 
      difficulty: "medium", 
      explanation: "", 
      topic: "Basics",
      marks: 2, 
      time_limit_seconds: 60 
    }
  ]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Standalone Question Modal Form State
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
  const [standaloneText, setStandaloneText] = useState("");
  const [standaloneA, setStandaloneA] = useState("");
  const [standaloneB, setStandaloneB] = useState("");
  const [standaloneC, setStandaloneC] = useState("");
  const [standaloneD, setStandaloneD] = useState("");
  const [standaloneCorrect, setStandaloneCorrect] = useState("a");
  const [standaloneDiff, setStandaloneDiff] = useState("medium");
  const [standaloneExplanation, setStandaloneExplanation] = useState("");
  const [standaloneTopic, setStandaloneTopic] = useState("General");
  const [standaloneSubject, setStandaloneSubject] = useState("compiler_design");
  const [standaloneMarks, setStandaloneMarks] = useState(2);
  const [standaloneTimeLimit, setStandaloneTimeLimit] = useState(60);
  const [standaloneError, setStandaloneError] = useState("");
  const [standaloneSubmitting, setStandaloneSubmitting] = useState(false);

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkQuizId, setBulkQuizId] = useState<string>("none");
  const [bulkStatus, setBulkStatus] = useState<any>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Question Bank filters
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState("All");
  const [bankSubjectFilter, setBankSubjectFilter] = useState("All");

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "teacher") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setTeacher(userRes.data);
        await refreshAll();
      } catch (err) {
        console.error("Teacher quizzes load failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function refreshAll() {
    try {
      const qRes = await api.get("/quizzes");
      setQuizzes(qRes.data);
      const bankRes = await api.get("/questions");
      setQuestions(bankRes.data);
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  }

  // Quiz Questions array handlers
  const handleAddQuizQuestion = () => {
    setQuizQuestions(prev => [
      ...prev,
      { 
        question_text: "", 
        option_a: "", 
        option_b: "", 
        option_c: "", 
        option_d: "", 
        correct_option: "a", 
        difficulty: "medium", 
        explanation: "", 
        topic: "Basics",
        marks: 2, 
        time_limit_seconds: 60 
      }
    ]);
  };

  const handleRemoveQuizQuestion = (idx: number) => {
    if (quizQuestions.length === 1) return;
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuizQuestionChange = (idx: number, field: string, value: any) => {
    setQuizQuestions(prev => prev.map((q, i) => {
      if (i === idx) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  async function handleCreateQuiz(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    
    if (!title.trim()) {
      setFormError("Quiz title is required.");
      return;
    }

    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        setFormError(`Please complete all option choices for Question ${i + 1}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post("/quizzes", {
        title,
        subject: quizSubject,
        questions: quizQuestions
      });
      
      // Reset Quiz Form
      setTitle("");
      setQuizSubject("compiler_design");
      setQuizQuestions([{ 
        question_text: "", 
        option_a: "", 
        option_b: "", 
        option_c: "", 
        option_d: "", 
        correct_option: "a", 
        difficulty: "medium", 
        explanation: "", 
        topic: "Basics",
        marks: 2, 
        time_limit_seconds: 60 
      }]);
      
      await refreshAll();
    } catch (err: any) {
      console.error("Failed to create quiz:", err);
      setFormError(err.response?.data?.detail || "An error occurred while creating the quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleQuizActive(id: number) {
    try {
      await api.patch(`/quizzes/${id}/activate`);
      await refreshAll();
    } catch (err) {
      console.error("Failed to toggle quiz state:", err);
    }
  }

  // Standalone Question addition handler
  async function handleCreateStandaloneQuestion(e: React.FormEvent) {
    e.preventDefault();
    setStandaloneError("");
    
    if (!standaloneText.trim() || !standaloneA.trim() || !standaloneB.trim()) {
      setStandaloneError("Please state your question text and at least Options A and B.");
      return;
    }

    setStandaloneSubmitting(true);
    try {
      await api.post("/questions", {
        question_text: standaloneText,
        option_a: standaloneA,
        option_b: standaloneB,
        option_c: standaloneC || "N/A",
        option_d: standaloneD || "N/A",
        correct_option: standaloneCorrect,
        difficulty: standaloneDiff,
        explanation: standaloneExplanation,
        topic: standaloneTopic,
        subject: standaloneSubject,
        marks: standaloneMarks,
        time_limit_seconds: standaloneTimeLimit
      });
      
      // Reset standalone form
      setStandaloneText("");
      setStandaloneA("");
      setStandaloneB("");
      setStandaloneC("");
      setStandaloneD("");
      setStandaloneCorrect("a");
      setStandaloneDiff("medium");
      setStandaloneExplanation("");
      setStandaloneTopic("General");
      setStandaloneSubject("compiler_design");
      setStandaloneMarks(2);
      setStandaloneTimeLimit(60);
      
      setIsStandaloneModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      console.error("Failed to create question:", err);
      setStandaloneError(err.response?.data?.detail || "Error creating question.");
    } finally {
      setStandaloneSubmitting(false);
    }
  }

  // Bulk Upload File Handler
  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkFile) return;
    
    setBulkUploading(true);
    setBulkStatus(null);
    
    const formData = new FormData();
    formData.append("file", bulkFile);
    
    let url = "/questions/bulk";
    if (bulkQuizId !== "none") {
      url += `?quiz_id=${bulkQuizId}`;
    }

    try {
      const res = await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setBulkStatus({ success: true, message: res.data.detail });
      setBulkFile(null);
      await refreshAll();
    } catch (err: any) {
      console.error("Bulk upload failed:", err);
      setBulkStatus({ success: false, message: err.response?.data?.detail || "CSV upload failed." });
    } finally {
      setBulkUploading(false);
    }
  }

  // Deletion handler from bank
  async function handleDeleteQuestion(id: number) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await api.delete(`/questions/${id}`);
      await refreshAll();
    } catch (err) {
      console.error("Delete question failed:", err);
    }
  }

  // Download template logic
  const downloadCSVTemplate = () => {
    const headers = "subject,topic,question_text,option_a,option_b,option_c,option_d,correct_option,difficulty,explanation,marks,time_limit_seconds\n";
    const row = "compiler_design,Parsing,Which parser constructs a top-down parse tree?,LL(1) Parser,LR(1) Parser,LALR Parser,Shift-Reduce Parser,a,medium,LL(1) is a predictive top-down parser.,2,60\n";
    const blob = new Blob([headers + row], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "learntrack_question_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-50 text-green-700 border-green-200";
      case "hard":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // Filtered Standalone Question Bank
  const filteredBank = questions.filter((q) => {
    const matchesDiff = bankDifficultyFilter === "All" || q.difficulty === bankDifficultyFilter.toLowerCase();
    const matchesSubj = bankSubjectFilter === "All" || q.subject === bankSubjectFilter;
    return matchesDiff && matchesSubj;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!teacher) return null;

  return (
    <LayoutWrapper userRole={teacher.role} userName={teacher.full_name}>
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Evaluations & Question Bank</h1>
          <p className="text-sm text-slate-505 mt-1">
            Build mock quizzes, manage the platform question pool, and import bulk dataset sheets.
          </p>
        </div>
        
        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200/50">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === "editor"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={14} />
            <span>Quiz Creator</span>
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === "bank"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database size={14} />
            <span>Question Bank ({questions.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "editor" ? (
        /* Tab 1: Quiz Creator */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Create Quiz Form */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                <Plus size={18} className="text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Create New Quiz</CardTitle>
                <p className="text-[10px] text-slate-400">Add dynamic question templates with choices</p>
              </div>
            </CardHeader>

            <form onSubmit={handleCreateQuiz} className="space-y-6 mt-6">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-550 block">Quiz Title</label>
                  <Input
                    type="text"
                    placeholder="e.g. LL(1) Parsing Challenge"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-555 block">Subject Curriculum</label>
                  <Select
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                  >
                    <option value="compiler_design">Compiler Design</option>
                    <option value="computer_networks">Computer Networks</option>
                    <option value="machine_learning">Machine Learning</option>
                    <option value="internet_of_things">Internet of Things</option>
                    <option value="development_engineering">Development Engineering</option>
                  </Select>
                </div>
              </div>

              {/* Questions list form */}
              <div className="space-y-5 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Questions ({quizQuestions.length})
                  </span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddQuizQuestion}
                    className="py-1 px-3 text-xs flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add Question
                  </Button>
                </div>

                <div className="space-y-6 max-h-[450px] overflow-y-auto pr-1">
                  {quizQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 border border-slate-205 rounded-xl bg-slate-50/50 space-y-4 relative">
                      {quizQuestions.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveQuizQuestion(idx)}
                          className="absolute right-3 top-3 p-1 rounded-lg text-slate-405 hover:bg-slate-100 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <span className="text-[10px] font-extrabold text-indigo-750 block">Question {idx + 1}</span>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 block">Topic</label>
                          <Input
                            type="text"
                            placeholder="e.g. LL(1) Parsing"
                            value={q.topic}
                            onChange={(e) => handleQuizQuestionChange(idx, "topic", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Difficulty</label>
                          <Select
                            value={q.difficulty}
                            onChange={(e) => handleQuizQuestionChange(idx, "difficulty", e.target.value)}
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 block">Question Statement</label>
                        <Input
                          type="text"
                          placeholder="State your question..."
                          value={q.question_text}
                          onChange={(e) => handleQuizQuestionChange(idx, "question_text", e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Option A</label>
                          <Input
                            type="text"
                            placeholder="Choice A"
                            value={q.option_a}
                            onChange={(e) => handleQuizQuestionChange(idx, "option_a", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Option B</label>
                          <Input
                            type="text"
                            placeholder="Choice B"
                            value={q.option_b}
                            onChange={(e) => handleQuizQuestionChange(idx, "option_b", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Option C</label>
                          <Input
                            type="text"
                            placeholder="Choice C"
                            value={q.option_c}
                            onChange={(e) => handleQuizQuestionChange(idx, "option_c", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Option D</label>
                          <Input
                            type="text"
                            placeholder="Choice D"
                            value={q.option_d}
                            onChange={(e) => handleQuizQuestionChange(idx, "option_d", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Correct Option</label>
                          <Select
                            value={q.correct_option}
                            onChange={(e) => handleQuizQuestionChange(idx, "correct_option", e.target.value)}
                          >
                            <option value="a">A</option>
                            <option value="b">B</option>
                            <option value="c">C</option>
                            <option value="d">D</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Marks</label>
                          <Select
                            value={q.marks}
                            onChange={(e) => handleQuizQuestionChange(idx, "marks", parseInt(e.target.value))}
                          >
                            <option value={1}>1 mark</option>
                            <option value={2}>2 marks</option>
                            <option value={5}>5 marks</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 block">Time Limit</label>
                          <Select
                            value={q.time_limit_seconds}
                            onChange={(e) => handleQuizQuestionChange(idx, "time_limit_seconds", parseInt(e.target.value))}
                          >
                            <option value={30}>30s</option>
                            <option value={60}>60s</option>
                            <option value={120}>120s</option>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 block">Explanation (revealed after submitting)</label>
                        <textarea
                          placeholder="Why is this option correct? (students see this after answering)"
                          value={q.explanation}
                          onChange={(e) => handleQuizQuestionChange(idx, "explanation", e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Quiz..." : "Create Quiz"}
              </Button>
            </form>
          </Card>

          {/* Right Column: Quizzes list with Active toggle */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-fit">
            <div>
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                  <BookOpen size={18} className="text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Existing Quizzes</CardTitle>
                  <p className="text-[10px] text-slate-400">Total created mock evaluations and their statuses</p>
                </div>
              </CardHeader>

              <div className="space-y-3 mt-6 overflow-y-auto max-h-[500px] pr-1">
                {quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <div key={quiz.id} className="p-4 rounded-xl border border-slate-202 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-slate-850 leading-tight">{quiz.title}</h4>
                        <div className="flex gap-2 items-center mt-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-750 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                            {quiz.subject.replace("_", " ")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {quiz.questions.length} questions • {quiz.total_marks} marks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleQuizActive(quiz.id)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                            quiz.is_active 
                              ? "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100" 
                              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-205"
                          }`}
                        >
                          {quiz.is_active ? (
                            <>
                              <Check size={12} />
                              <span>Active</span>
                            </>
                          ) : (
                            <span>Inactive</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No quizzes created yet.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Tab 2: Question Bank & Bulk CSV Upload */
        <div className="space-y-8">
          
          {/* Top Panel: Control Cards (Add standalone question + CSV bulk upload) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Bulk CSV Upload Card */}
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                    <Upload size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800">CSV Bulk Upload</CardTitle>
                    <p className="text-[10px] text-slate-400">Import questions in bulk from a template sheet</p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={downloadCSVTemplate}
                  className="py-1 px-3 text-[10px] font-bold flex items-center gap-1"
                >
                  <Download size={12} />
                  Template
                </Button>
              </CardHeader>

              <form onSubmit={handleBulkUpload} className="space-y-4 mt-6">
                
                {bulkStatus && (
                  <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                    bulkStatus.success 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  }`}>
                    <AlertCircle size={16} />
                    <span>{bulkStatus.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Optional: Attach to Quiz</label>
                    <Select
                      value={bulkQuizId}
                      onChange={(e) => setBulkQuizId(e.target.value)}
                    >
                      <option value="none">Standalone (General Pool)</option>
                      {quizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                      ))}
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block">Select CSV File</label>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      className="w-full text-xs p-1.5 bg-white border border-slate-350 rounded-lg file:mr-2 file:py-1 file:px-2 file:border-0 file:rounded file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2"
                  disabled={!bulkFile || bulkUploading}
                >
                  <Upload size={14} />
                  <span>{bulkUploading ? "Uploading CSV..." : "Upload & Parse CSV"}</span>
                </Button>
              </form>
            </Card>

            {/* Standalone Question Add Trigger */}
            <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <CardHeader className="p-0 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                    <Database size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800">Add Standalone Question</CardTitle>
                    <p className="text-[10px] text-slate-400">Insert single question cards straight into the question bank</p>
                  </div>
                </CardHeader>
                <div className="py-5 text-xs text-slate-500 leading-relaxed">
                  Standalone questions added to the bank can be filtered, edited, and attached to quizzes dynamically. This helps you build a robust curriculum repository over time.
                </div>
              </div>

              <Button 
                onClick={() => setIsStandaloneModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>Open Question Form</span>
              </Button>
            </Card>

          </div>

          {/* Standalone Questions Log table */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Question Bank Inventory</CardTitle>
                <p className="text-[10px] text-slate-400">Total questions inside the database repository</p>
              </div>
              
              {/* Question list filters */}
              <div className="flex gap-3 items-center">
                <Select
                  value={bankSubjectFilter}
                  onChange={(e) => setBankSubjectFilter(e.target.value)}
                  className="w-36"
                >
                  <option value="All">All Subjects</option>
                  <option value="compiler_design">Compiler Design</option>
                  <option value="computer_networks">Computer Networks</option>
                  <option value="machine_learning">Machine Learning</option>
                  <option value="internet_of_things">Internet of Things</option>
                  <option value="development_engineering">Development Engineering</option>
                </Select>

                <Select
                  value={bankDifficultyFilter}
                  onChange={(e) => setBankDifficultyFilter(e.target.value)}
                  className="w-32"
                >
                  <option value="All">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
            </CardHeader>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold select-none">
                    <th className="p-3">Topic / Subject</th>
                    <th className="p-3">Statement</th>
                    <th className="p-3 text-center">Difficulty</th>
                    <th className="p-3 text-center">Marks</th>
                    <th className="p-3 text-center">Correct</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBank.length > 0 ? (
                    filteredBank.map((q) => (
                      <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-750 block">{q.topic || "General"}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            {q.subject ? q.subject.replace("_", " ") : "Unspecified"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-medium max-w-xs truncate" title={q.question_text}>
                          {q.question_text}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getDifficultyBadge(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-700 font-bold">{q.marks}</td>
                        <td className="p-3 text-center text-indigo-700 font-extrabold uppercase">{q.correct_option}</td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors font-bold"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No matching question bank records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Standalone Question Modal */}
      {isStandaloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-805 border-b border-slate-100 pb-3">Add Standalone Question Form</h3>
            
            <form onSubmit={handleCreateStandaloneQuestion} className="space-y-4 mt-4 text-xs">
              {standaloneError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-semibold rounded-lg flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600" />
                  <span>{standaloneError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Topic Name</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Subnets"
                    value={standaloneTopic}
                    onChange={(e) => setStandaloneTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Subject Curriculum</label>
                  <Select
                    value={standaloneSubject}
                    onChange={(e) => setStandaloneSubject(e.target.value)}
                  >
                    <option value="compiler_design">Compiler Design</option>
                    <option value="computer_networks">Computer Networks</option>
                    <option value="machine_learning">Machine Learning</option>
                    <option value="internet_of_things">Internet of Things</option>
                    <option value="development_engineering">Development Engineering</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Question Statement</label>
                <Input 
                  type="text"
                  placeholder="State the question description..."
                  value={standaloneText}
                  onChange={(e) => setStandaloneText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Option A</label>
                  <Input 
                    type="text"
                    placeholder="Choice A"
                    value={standaloneA}
                    onChange={(e) => setStandaloneA(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Option B</label>
                  <Input 
                    type="text"
                    placeholder="Choice B"
                    value={standaloneB}
                    onChange={(e) => setStandaloneB(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Option C</label>
                  <Input 
                    type="text"
                    placeholder="Choice C (optional)"
                    value={standaloneC}
                    onChange={(e) => setStandaloneC(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Option D</label>
                  <Input 
                    type="text"
                    placeholder="Choice D (optional)"
                    value={standaloneD}
                    onChange={(e) => setStandaloneD(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Correct Option</label>
                  <Select
                    value={standaloneCorrect}
                    onChange={(e) => setStandaloneCorrect(e.target.value)}
                  >
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Difficulty</label>
                  <Select
                    value={standaloneDiff}
                    onChange={(e) => setStandaloneDiff(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 block">Marks</label>
                  <Select
                    value={standaloneMarks}
                    onChange={(e) => setStandaloneMarks(parseInt(e.target.value))}
                  >
                    <option value={1}>1 mark</option>
                    <option value={2}>2 marks</option>
                    <option value={5}>5 marks</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Time Limit (Seconds)</label>
                <Input 
                  type="number"
                  placeholder="60"
                  value={standaloneTimeLimit}
                  onChange={(e) => setStandaloneTimeLimit(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Explanation (revealed after answering)</label>
                <textarea
                  placeholder="Why is this option correct? (students see this after answering)"
                  value={standaloneExplanation}
                  onChange={(e) => setStandaloneExplanation(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-350 rounded-lg focus:outline-none focus:border-indigo-500"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsStandaloneModalOpen(false)}
                  className="flex-1"
                  disabled={standaloneSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="flex-1"
                  disabled={standaloneSubmitting}
                >
                  {standaloneSubmitting ? "Adding..." : "Add Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </LayoutWrapper>
  );
}
