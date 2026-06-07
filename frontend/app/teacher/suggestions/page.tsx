"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Trash2, 
  X, 
  Search, 
  Filter,
  User,
  Users,
  AlertTriangle
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Select } from "@/components/ui";

export default function TeacherSuggestions() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Delete modal state
  const [deleteModalSuggestion, setDeleteModalSuggestion] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "teacher") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setTeacher(userRes.data);
        await fetchSuggestions();
      } catch (err) {
        console.error("Teacher suggestions load failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function fetchSuggestions() {
    try {
      const res = await api.get("/suggestions");
      setSuggestions(res.data);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  }

  async function handleDelete() {
    if (!deleteModalSuggestion) return;
    setDeleting(true);
    try {
      await api.delete(`/suggestions/${deleteModalSuggestion.id}`);
      setDeleteModalSuggestion(null);
      await fetchSuggestions();
    } catch (err) {
      console.error("Failed to delete suggestion:", err);
    } finally {
      setDeleting(false);
    }
  }

  // Filtered suggestions logic
  const filteredSuggestions = suggestions.filter((s) => {
    const matchesSubject = subjectFilter === "All" || s.subject === subjectFilter;
    const matchesPriority = priorityFilter === "All" || s.priority === priorityFilter;
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "read" && s.is_read) || 
      (statusFilter === "unread" && !s.is_read);
    return matchesSubject && matchesPriority && matchesStatus;
  });

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
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Sent Suggestions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit, filter, and manage suggestion logs sent to individual students or class-wide.
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mr-2">
          <Filter size={16} />
          <span>FILTERS</span>
        </div>

        <div className="w-52">
          <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="All">All Subjects</option>
            <option value="Compiler Design">Compiler Design</option>
            <option value="Computer Networks">Computer Networks</option>
            <option value="Machine Learning">Machine Learning</option>
            <option value="Internet of Things">Internet of Things</option>
            <option value="Development Engineering">Development Engineering</option>
          </Select>
        </div>

        <div className="w-40">
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>

        <div className="w-40">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </Select>
        </div>
      </Card>

      {/* Suggestions Table */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold select-none">
                <th className="p-4">Student</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Message</th>
                <th className="p-4 text-center">Priority</th>
                <th className="p-4">Date Sent</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      {s.student_name ? (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User size={12} className="text-slate-400" />
                          <span>{s.student_name}</span>
                        </div>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wide">
                          Class-Wide
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-semibold">{s.subject}</td>
                    <td className="p-4 text-slate-500 font-medium max-w-xs truncate" title={s.message}>
                      {s.message}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getPriorityClasses(s.priority)}`}>
                        {s.priority}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold">
                      {new Date(s.created_at).toLocaleDateString([], { dateStyle: "medium" })}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={s.is_read ? "success" : "neutral"}>
                        {s.is_read ? "read" : "unread"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => setDeleteModalSuggestion(s)}
                        className="px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold transition-all"
                      >
                        <Trash2 size={12} className="inline mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No suggestions recorded matching selection parameters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModalSuggestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-center">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Are you sure you want to permanently delete this suggestion? Students will no longer see this action item on their dashboards.
            </p>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModalSuggestion(null)}
                className="flex-1"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </LayoutWrapper>
  );
}
