"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  UserPlus, 
  Check, 
  X, 
  AlertCircle, 
  GraduationCap, 
  Loader2, 
  Mail, 
  Clock,
  BookOpen
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function AdminPendingApprovals() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState<Record<number, string>>({}); // studentId -> 'approving' | 'rejecting'

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "admin") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setAdmin(userRes.data);
        await fetchPendingStudents();
      } catch (err) {
        console.error("Admin pending page load failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function fetchPendingStudents() {
    try {
      const res = await api.get("/admin/pending-students");
      setStudents(res.data);
    } catch (err: any) {
      console.error("Failed to fetch pending students:", err);
      setError("Unable to load pending students list.");
    }
  }

  async function handleApprove(studentId: number) {
    setActionInProgress(prev => ({ ...prev, [studentId]: "approving" }));
    setError("");
    try {
      await api.post(`/admin/students/${studentId}/approve`);
      await fetchPendingStudents();
    } catch (err: any) {
      console.error("Approve action failed:", err);
      setError(err.response?.data?.detail || "Failed to approve student.");
    } finally {
      setActionInProgress(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }
  }

  async function handleReject(studentId: number) {
    setActionInProgress(prev => ({ ...prev, [studentId]: "rejecting" }));
    setError("");
    try {
      await api.post(`/admin/students/${studentId}/reject`);
      await fetchPendingStudents();
    } catch (err: any) {
      console.error("Reject action failed:", err);
      setError(err.response?.data?.detail || "Failed to reject student.");
    } finally {
      setActionInProgress(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <LayoutWrapper userRole={admin.role} userName={admin.full_name}>
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus size={30} className="text-indigo-600" />
            Pending Student Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve registration requests for new student accounts. Students cannot log in or access dashboards until approved.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Pending list */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold select-none">
                <th className="p-4">Student Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Department</th>
                <th className="p-4">Year / Semester</th>
                <th className="p-4">Registration Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((student) => {
                  const state = actionInProgress[student.id];
                  return (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[11px] uppercase shadow-sm">
                          {student.name.substring(0, 2)}
                        </div>
                        <span>{student.name}</span>
                      </td>
                      <td className="p-4 text-slate-500 font-medium select-all">
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-slate-400" />
                          {student.email}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-655">
                        <span className="flex items-center gap-1">
                          <GraduationCap size={12} className="text-slate-400" />
                          {student.department}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} className="text-slate-400" />
                          {student.year_semester}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {student.joined_date}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant="warning">
                          Pending Approval
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleApprove(student.id)}
                          disabled={!!state}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                        >
                          {state === "approving" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(student.id)}
                          disabled={!!state}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-250 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
                        >
                          {state === "rejecting" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                        <Check size={20} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">All Caught Up!</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        There are no student registration requests awaiting review at this time.
                      </p>
                    </div>
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
