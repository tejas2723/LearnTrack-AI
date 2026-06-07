"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, AlertCircle, HelpCircle, ChevronRight, Star } from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";

export default function StudentQuiz() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [noQuizError, setNoQuizError] = useState("");
  const [submitError, setSubmitError] = useState("");
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  
  // New State variables
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [accumulatedMarks, setAccumulatedMarks] = useState(0);
  const [attempts, setAttempts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Timer per question (based on question.time_limit_seconds, default 60)
  const [secondsLeft, setSecondsLeft] = useState(60);
  // Overall timers for stats calculation
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  
  const lastInteractionRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        setStudent(userRes.data);
      } catch (err) {
        // 401 handled globally by api interceptor → redirects to login
        console.error("Auth check failed:", err);
        setLoading(false);
        return;
      }
      try {
        const quizRes = await api.get("/quizzes/active");
        setQuiz(quizRes.data);
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 404) {
          setNoQuizError("No active quiz is available right now. Please check back later.");
        } else {
          setNoQuizError("Failed to load quiz. Please refresh the page.");
        }
        console.error("Quiz load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Overall timer tracking totalTimeTaken and idleTime
  useEffect(() => {
    if (quizStarted && !isLoading) {
      lastInteractionRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setTotalTimeTaken(prev => prev + 1);
        
        const msSinceLastClick = Date.now() - lastInteractionRef.current;
        if (msSinceLastClick > 4000) {
          setIdleTime(prev => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizStarted, isLoading]);

  // Timer per question
  useEffect(() => {
    if (quizStarted && !isLoading && quiz) {
      const activeQuestion = quiz.questions[currentQuestionIdx];
      const timeLimit = activeQuestion.time_limit_seconds || 60;
      setSecondsLeft(timeLimit);
      
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      
      questionTimerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current!);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [quizStarted, currentQuestionIdx, quiz, isLoading]);

  function registerInteraction() {
    lastInteractionRef.current = Date.now();
  }

  function handleOptionSelect(optIdx: number) {
    if (isConfirmed) return; // locked in
    registerInteraction();
    setSelectedOpt(optIdx);
  }

  function handleTimeOut() {
    // If not confirmed, lock in option or default A
    let opt = selectedOpt;
    if (opt === null) {
      opt = 0; // fallback A
    }
    confirmAnswer(opt, selectedConfidence || 1, 60);
  }

  function confirmAnswer(opt: number, confidence: number | null, timeSpentSec?: number) {
    if (isConfirmed || !quiz) return;
    registerInteraction();
    
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    const activeQuestion = quiz.questions[currentQuestionIdx];
    const correctChar = activeQuestion.correct_option.toLowerCase();
    const selectedChar = ["a", "b", "c", "d"][opt];
    const isCorrect = selectedChar === correctChar;
    
    // Add to accumulated marks
    if (isCorrect) {
      setAccumulatedMarks(prev => prev + (activeQuestion.marks || 1));
    }
    
    const spent = timeSpentSec !== undefined ? timeSpentSec : ((activeQuestion.time_limit_seconds || 60) - secondsLeft);
    
    setAttempts(prev => [
      ...prev,
      {
        question_id: activeQuestion.id,
        selected_option: selectedChar,
        time_taken_seconds: spent,
        confidence_level: confidence
      }
    ]);
    
    setIsConfirmed(true);
  }

  function handleNextQuestion() {
    registerInteraction();
    if (quiz && currentQuestionIdx < quiz.questions.length - 1) {
      // Reset question state variables
      setSelectedOpt(null);
      setSelectedConfidence(null);
      setIsConfirmed(false);
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      submitQuizResults();
    }
  }

  async function submitQuizResults() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setIsLoading(true);
    setSubmitError("");

    try {
      const res = await api.post("/quizzes/submit", {
        attempts: attempts,
        time_taken_seconds: totalTimeTaken,
        idle_time_seconds: idleTime
      });
      const resultId = res.data.result_id;
      // Successful — navigate to results page
      router.push(`/student/results?id=${resultId}`);
    } catch (err: any) {
      console.error("Quiz submission error:", err);
      const errMsg = err.response?.data?.detail || "Submission failed. Please try again.";
      setSubmitError(errMsg);
      setIsLoading(false);
    }
  }

  const getDifficultyBadgeClasses = (difficulty: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show no-quiz error without redirecting to login
  if (!student) return null;
  
  if (noQuizError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center flex-col p-6">
        <AlertCircle size={40} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Quiz Available</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">{noQuizError}</p>
        <Link href="/student/dashboard" className="mt-6 text-indigo-600 text-sm font-semibold hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  if (!quiz) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-center flex-col p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-slate-800">Evaluating Submission...</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
          Our ML Gradient Boosting Engine is grading your exam, evaluating topic calibration, and updating your academic risk projections.
        </p>
        {submitError && (
          <p className="mt-4 text-rose-600 text-xs font-semibold">{submitError}</p>
        )}
      </div>
    );
  }

  if (quizStarted) {
    const activeQuestion = quiz.questions[currentQuestionIdx];
    const progressPercent = ((currentQuestionIdx + 1) / quiz.questions.length) * 100;
    const correctChar = activeQuestion.correct_option.toLowerCase();
    const correctOptIdx = ["a", "b", "c", "d"].indexOf(correctChar);
    
    return (
      <LayoutWrapper userRole={student.role} userName={student.full_name}>
        <div className="max-w-2xl mx-auto py-6">
          
          {/* Header & Question Progression */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                {quiz.title}
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 mt-0.5">
                Question {currentQuestionIdx + 1} of {quiz.questions.length}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Question Marks & Difficulty */}
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getDifficultyBadgeClasses(activeQuestion.difficulty)}`}>
                {activeQuestion.difficulty}
              </span>
              <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                {activeQuestion.marks} marks
              </span>
              
              {/* Countdown timer */}
              {!isConfirmed && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  secondsLeft < 15 
                    ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse" 
                    : "bg-white border-slate-200 text-slate-650"
                }`}>
                  <Clock size={14} />
                  <span>Time left: {secondsLeft}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar & Marks Count */}
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Progress: {Math.round(progressPercent)}%</span>
            <span>Total Marks So Far: <span className="text-indigo-600 font-extrabold text-xs">{accumulatedMarks}</span></span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Question Statement */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <p className="text-base font-bold text-slate-850 leading-relaxed mb-6">
              {activeQuestion.question_text}
            </p>

            {/* MCQ Options List */}
            <div className="space-y-3">
              {[
                activeQuestion.option_a,
                activeQuestion.option_b,
                activeQuestion.option_c,
                activeQuestion.option_d
              ].map((opt, optIdx) => {
                const isSelected = selectedOpt === optIdx;
                
                let btnStyle = "bg-white border-slate-200 text-slate-650 hover:border-slate-350 hover:bg-slate-50/50";
                let circleStyle = "border-slate-300 text-slate-400 bg-slate-50";
                
                if (isConfirmed) {
                  const isCorrect = optIdx === correctOptIdx;
                  if (isCorrect) {
                    btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm";
                    circleStyle = "border-emerald-500 bg-emerald-600 text-white";
                  } else if (isSelected) {
                    btnStyle = "bg-rose-50 border-rose-500 text-rose-800 font-bold shadow-sm";
                    circleStyle = "border-rose-500 bg-rose-600 text-white";
                  } else {
                    btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                    circleStyle = "border-slate-200 text-slate-300 bg-slate-100";
                  }
                } else if (isSelected) {
                  btnStyle = "bg-indigo-50/50 border-indigo-500 text-indigo-750 font-bold shadow-sm";
                  circleStyle = "border-indigo-500 bg-indigo-600 text-white";
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(optIdx)}
                    disabled={isConfirmed}
                    className={`w-full p-4 rounded-xl border text-left text-xs font-semibold transition-all ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${circleStyle}`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Star Confidence Selector (before confirming answer) */}
            {selectedOpt !== null && !isConfirmed && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Rate your confidence level (Optional):
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setSelectedConfidence(starValue)}
                      className="focus:outline-none"
                    >
                      <Star 
                        size={20} 
                        className={starValue <= (selectedConfidence || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation card revealed after confirm */}
            {isConfirmed && activeQuestion.explanation && (
              <div className="mt-6 p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 text-xs text-indigo-850 leading-relaxed">
                <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-indigo-650 tracking-wide mb-1.5">
                  <HelpCircle size={12} />
                  <span>EXPLANATION</span>
                </div>
                {activeQuestion.explanation}
              </div>
            )}
          </Card>

          {/* Action Footer */}
          <div className="flex justify-between items-center">
            <div className="text-[10px] text-slate-405 flex items-center gap-1.5 font-semibold">
              <AlertCircle size={12} />
              <span>
                {isConfirmed 
                  ? "Select Next to advance to the subsequent question." 
                  : "Rate confidence and select Confirm to evaluate answer."}
              </span>
            </div>
            
            {!isConfirmed ? (
              <Button
                onClick={() => confirmAnswer(selectedOpt!, selectedConfidence)}
                disabled={selectedOpt === null}
                className="flex items-center gap-1.5"
              >
                <span>Confirm Answer</span>
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                onClick={handleNextQuestion}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <span>{currentQuestionIdx === quiz.questions.length - 1 ? "Submit Exam" : "Next Question"}</span>
                <ChevronRight size={14} />
              </Button>
            )}
          </div>

        </div>
      </LayoutWrapper>
    );
  }

  // Lobby screen
  return (
    <LayoutWrapper userRole={student.role} userName={student.full_name}>
      <Link 
        href="/student/dashboard"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-655 text-sm mb-6 transition-colors font-semibold"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl mx-auto text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
          <Clock size={28} />
        </div>
        
        <CardTitle className="text-xl font-bold text-slate-800">Academic Quiz Challenge</CardTitle>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          You are about to start the active mock exam: <strong className="text-slate-700">{quiz.title}</strong>. This assessment tests your accuracy, speed, and confidence level per topic.
        </p>

        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 max-w-sm mx-auto text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span><strong>Questions:</strong> {quiz.questions.length} multiple-choice</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span><strong>Difficulty Levels:</strong> Easy, Medium, and Hard profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
            <span><strong>Evaluation:</strong> Instant answer reveals + explanations</span>
          </div>
        </div>

        <Button 
          onClick={() => setQuizStarted(true)}
          className="w-full sm:w-48 mx-auto"
        >
          Begin Quiz
        </Button>
      </Card>
    </LayoutWrapper>
  );
}
