"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Download, 
  Activity, 
  BookOpen, 
  Clock, 
  Heart, 
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function AdminAnalytics() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "admin") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setAdmin(userRes.data);

        const analyticsRes = await api.get("/admin/analytics");
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error("Admin analytics overview failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function handleExportCSV() {
    setExportLoading(true);
    try {
      const res = await api.get("/admin/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "platform_student_results.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin || !analytics) return null;

  return (
    <LayoutWrapper userRole={admin.role} userName={admin.full_name}>
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">System Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit platform-wide activity, subject performances, dropout risks, and export data.
          </p>
        </div>
        <Button 
          onClick={handleExportCSV} 
          disabled={exportLoading}
          className="flex items-center gap-1.5 w-fit"
        >
          <Download size={16} />
          {exportLoading ? "Exporting..." : "Export Results CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Platform Health Metrics */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Activity size={18} />
              </div>
              <CardTitle className="text-base font-bold text-slate-800">Platform Health</CardTitle>
            </CardHeader>
            
            <div className="space-y-6 mt-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-semibold text-slate-500">Quiz Submissions</span>
                <span className="text-sm font-extrabold text-slate-800">{analytics.total_results}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-semibold text-slate-500">Study Sessions Logged</span>
                <span className="text-sm font-extrabold text-slate-800">{analytics.total_sessions}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-xs font-semibold text-slate-500">Average Platform Focus</span>
                <span className="text-sm font-extrabold text-indigo-600">{analytics.avg_focus}/100</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Top-performing subjects & Risk distributions */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Dropout Risk Summary */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Student Risk Summary</CardTitle>
                <p className="text-[10px] text-slate-400">Predicted dropout/failure standings across active students</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-6 grid grid-cols-3 gap-4">
              
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 text-center">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">High Risk</span>
                <span className="text-3xl font-extrabold text-rose-600 mt-2 block">{analytics.risk_summary.High}</span>
              </div>

              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 text-center">
                <span className="text-[10px] font-bold text-amber-550 uppercase tracking-wider block">Medium Risk</span>
                <span className="text-3xl font-extrabold text-amber-600 mt-2 block">{analytics.risk_summary.Medium}</span>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 text-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Low Risk</span>
                <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">{analytics.risk_summary.Low}</span>
              </div>

            </CardContent>
          </Card>

          {/* Top Performing subjects */}
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <CardHeader className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp size={18} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Subject Performance Averages</CardTitle>
                <p className="text-[10px] text-slate-400">Average accuracy score platform-wide grouped by curriculum subject</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-4">
              {analytics.subject_performances && analytics.subject_performances.map((perf: any, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{perf.subject}</span>
                    <span className="font-bold text-indigo-600">{perf.avg_score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${perf.avg_score}%` }}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>
    </LayoutWrapper>
  );
}
