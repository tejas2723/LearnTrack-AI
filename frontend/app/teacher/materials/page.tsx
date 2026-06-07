"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Video, 
  BookOpen, 
  FolderDown, 
  Eye, 
  Globe, 
  Users, 
  Lock, 
  Sparkles,
  UploadCloud,
  CheckCircle,
  XCircle,
  X
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function TeacherMaterials() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [materialType, setMaterialType] = useState("pdf"); // pdf / video_link / notes / practice_set
  const [externalUrl, setExternalUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [targetAudience, setTargetAudience] = useState("all"); // all / weak_students / specific
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        const user = userRes.data;
        if (user.role !== "teacher") {
          router.push(`/${user.role}/dashboard`);
          return;
        }
        setTeacher(user);

        // Fetch teacher's own materials
        const materialsRes = await api.get("/materials");
        setMaterials(materialsRes.data || []);

        // Fetch students roster for targetAudience specific dropdown
        const studentsRes = await api.get("/students");
        setStudents(studentsRes.data || []);

      } catch (err) {
        console.error("Failed to load materials data:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handlePublishToggle = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/materials/${id}?is_published=${!currentStatus}`);
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, is_published: !currentStatus } : m));
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this study material? This cannot be undone.")) return;
    try {
      await api.delete(`/materials/${id}`);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Failed to delete study material:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check file size (20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setFormError("File size exceeds 20MB limit");
        setFile(null);
        return;
      }
      setFormError("");
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!title.trim() || !subject.trim() || !topic.trim()) {
      setFormError("Title, Subject, and Topic are required fields");
      return;
    }

    if (materialType === "pdf" && !file) {
      setFormError("Please select a PDF/DOCX file to upload");
      return;
    }

    if (materialType === "video_link" && !externalUrl.trim()) {
      setFormError("Please specify the external Video Link URL");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("subject", subject.trim().toLowerCase());
    formData.append("topic", topic.trim().toLowerCase());
    formData.append("material_type", materialType);
    formData.append("is_published", String(isPublished));
    formData.append("target_audience", targetAudience);

    if (materialType === "pdf" && file) {
      formData.append("file", file);
    } else if (externalUrl.trim()) {
      formData.append("external_url", externalUrl.trim());
    }

    if (targetAudience === "specific" && selectedStudents.length > 0) {
      formData.append("target_student_ids", JSON.stringify(selectedStudents));
    }

    if (tagsInput.trim()) {
      const parsedTags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      formData.append("tags", JSON.stringify(parsedTags));
    }

    try {
      const res = await api.post("/materials", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      // Append new material to list and close modal
      setMaterials(prev => [res.data, ...prev]);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setFormError(err.response?.data?.detail || "Failed to create study material. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSubject("");
    setTopic("");
    setMaterialType("pdf");
    setExternalUrl("");
    setIsPublished(true);
    setTargetAudience("all");
    setSelectedStudents([]);
    setFile(null);
    setTagsInput("");
    setFormError("");
  };

  const handleStudentSelect = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
      case "notes":
        return <FileText className="text-emerald-500" size={16} />;
      case "video_link":
        return <Video className="text-rose-500" size={16} />;
      default:
        return <BookOpen className="text-indigo-500" size={16} />;
    }
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience.toLowerCase()) {
      case "all":
        return <Badge variant="info" className="flex items-center gap-1"><Globe size={10} /> Class-Wide</Badge>;
      case "weak_students":
        return <Badge variant="warning" className="flex items-center gap-1"><Sparkles size={10} /> Weak Students</Badge>;
      case "specific":
        return <Badge variant="success" className="flex items-center gap-1"><Users size={10} /> Targeted</Badge>;
      default:
        return <Badge variant="neutral">{audience}</Badge>;
    }
  };

  // Metrics calculations
  const totalViews = materials.reduce((acc, m) => acc + (m.view_count || 0), 0);
  const totalDownloads = materials.reduce((acc, m) => acc + (m.download_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <LayoutWrapper userRole={teacher.role} userName={teacher.full_name}>
      {/* Header Panel */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Study Materials Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish course syllabus sheets, PDF/DOCX documents, video lectures, and targeted revision sets.
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Upload Material
        </Button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Materials</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{materials.length}</span>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Eye size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Material Views</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{totalViews}</span>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <FolderDown size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Material Downloads</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{totalDownloads}</span>
          </div>
        </Card>
      </div>

      {/* Materials List Table */}
      <Card className="border-slate-200/80 p-6 overflow-hidden">
        <div className="pb-4 border-b border-slate-100 mb-4 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Your Uploaded Materials</h2>
        </div>

        {materials.length === 0 ? (
          <div className="text-center py-16">
            <UploadCloud className="mx-auto text-slate-300 mb-3" size={44} />
            <h3 className="font-bold text-slate-700">No Materials Uploaded Yet</h3>
            <p className="text-xs text-slate-450 mt-1 max-w-[280px] mx-auto leading-relaxed">
              Create and share resources to assist your students. Click "Upload Material" to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Topic</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4 text-center">Views</th>
                  <th className="py-3 px-4 text-center">Downloads</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        {getMaterialIcon(m.material_type)}
                        <span className="font-bold text-slate-800 truncate block" title={m.title}>
                          {m.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {m.subject.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {m.topic}
                    </td>
                    <td className="py-3 px-4">
                      {getAudienceBadge(m.target_audience)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {m.view_count}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {m.file_url ? m.download_count : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handlePublishToggle(m.id, m.is_published)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                          m.is_published 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100" 
                            : "bg-slate-100 text-slate-550 border-slate-250 hover:bg-slate-200"
                        }`}
                      >
                        {m.is_published ? (
                          <>
                            <CheckCircle size={10} /> Published
                          </>
                        ) : (
                          <>
                            <XCircle size={10} /> Draft
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {m.file_url && (
                          <a 
                            href={`http://localhost:8000/api/materials/${m.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                            title="Download local file"
                          >
                            <FolderDown size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete material"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Creation Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card 
            className="w-full max-w-xl bg-white border border-slate-200 flex flex-col p-6 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Upload Syllabus Study Material</h3>
                <p className="text-[10px] text-slate-450 mt-0.5">Share educational assets with specific parameters</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
                  {formError}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Material Title *</label>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. LL(1) Parsing Table Construction Notes"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              {/* Subject & Topic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Subject Category *</label>
                  <select
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Subject</option>
                    <option value="compiler_design">Compiler Design</option>
                    <option value="computer_networks">Computer Networks</option>
                    <option value="machine_learning">Machine Learning</option>
                    <option value="internet_of_things">Internet of Things</option>
                    <option value="development_engineering">Development Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Specific Topic *</label>
                  <input 
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. LL1 Parsing, Neural Networks"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description textarea */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what concepts this material covers..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Material Type Selection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Material Format Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer">
                    <input 
                      type="radio" 
                      name="material_type" 
                      value="pdf" 
                      checked={materialType === "pdf"}
                      onChange={() => setMaterialType("pdf")}
                    />
                    PDF/DOCX File
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer">
                    <input 
                      type="radio" 
                      name="material_type" 
                      value="video_link" 
                      checked={materialType === "video_link"}
                      onChange={() => setMaterialType("video_link")}
                    />
                    YouTube / Video Link
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer">
                    <input 
                      type="radio" 
                      name="material_type" 
                      value="notes" 
                      checked={materialType === "notes"}
                      onChange={() => setMaterialType("notes")}
                    />
                    Notes
                  </label>
                </div>
              </div>

              {/* File Dropzone or External URL Conditional Inputs */}
              {materialType === "pdf" ? (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">PDF or DOCX File *</label>
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col items-center justify-center hover:border-indigo-400 transition-colors relative cursor-pointer">
                    <UploadCloud size={28} className="text-slate-400 mb-1" />
                    <span className="text-[11px] font-bold text-slate-600">
                      {file ? file.name : "Select or drag file here"}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Maximum file size: 20MB</span>
                    <input 
                      type="file" 
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">External Resource URL *</label>
                  <input 
                    type="url"
                    required
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Target Audience Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Class-wide (All Students)</option>
                  <option value="weak_students">Weak Students in Subject/Topic</option>
                  <option value="specific">Specific targeted students</option>
                </select>
              </div>

              {/* Conditional specific student checklist */}
              {targetAudience === "specific" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Select Targeted Students *</label>
                  <div className="border border-slate-250 rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 bg-slate-50">
                    {students.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer hover:text-slate-800">
                        <input 
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => handleStudentSelect(s.id)}
                        />
                        {s.full_name} ({s.prn_no || "No PRN"})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags split input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1.5">Tags (comma-separated)</label>
                <input 
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. revision, exam, final"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Uploading..." : "Save & Publish"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </LayoutWrapper>
  );
}
