"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Award, BookOpen, Clock, Activity, Brain } from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function StudentProfile() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

        // Fetch their summary stats to show badges
        const summaryRes = await api.get(`/analytics/student/${user.id}`);
        setData(summaryRes.data);
      } catch (err) {
        console.error("Profile load failed:", err);
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

  if (!student || !data) return null;

  return (
    <LayoutWrapper userRole={student.role} userName={student.full_name}>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Student Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your academic classification, PRN identifier, and unlocked achievements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Personal details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
            
            {/* User Avatar */}
            <div className="w-20 h-20 bg-indigo-50 border border-indigo-150 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <User size={36} />
            </div>

            <h2 className="text-lg font-bold text-slate-800">{student.full_name}</h2>
            <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase mt-1 tracking-wide">
              {student.role}
            </span>

            {/* Classification List */}
            <div className="border-t border-slate-100 mt-6 pt-5 space-y-4 text-left text-xs font-semibold text-slate-650">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">PRN Number</span>
                <span className="font-mono text-slate-700">{student.prn_no || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Class/Division</span>
                <span className="text-slate-700">{student.class_name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email Address</span>
                <span className="text-slate-700 truncate max-w-[150px]">{student.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-600 font-bold">Active Learner</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Academic Settings and Achievements */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Cognitive study profile info */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800">Learning Classification Profile</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Focus styles and timing patterns derived from backend analytics</p>
            </CardHeader>
            <CardContent className="p-0 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Brain size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Cognitive Focus Style</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block">{student.preferred_style}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">Optimal Study Block</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block">{data.best_study_time}</span>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Achievements badge room */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800">Unlocked Badges & Achievements</CardTitle>
              <p className="text-[10px] text-slate-400 mt-0.5">Badges earned by completing exams, retaining focus, and improving marks</p>
            </CardHeader>
            <CardContent className="p-0 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Default badge is always unlocked for seed user */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
                  <div className="p-2.5 rounded-full bg-white shadow-sm border border-slate-200/60 text-amber-500">
                    <Award size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Beginner Learner</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Successfully onboarded onto LearnTrack AI</p>
                  </div>
                </div>

                {data.quizzes_taken >= 3 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
                    <div className="p-2.5 rounded-full bg-white shadow-sm border border-slate-200/60 text-indigo-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Consistency Champion</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Completed 3 or more academic quizzes</p>
                    </div>
                  </div>
                )}

                {data.overall_score >= 90 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
                    <div className="p-2.5 rounded-full bg-white shadow-sm border border-slate-200/60 text-emerald-600">
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Topic Master</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Scored 100% on a quiz</p>
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </LayoutWrapper>
  );
}
