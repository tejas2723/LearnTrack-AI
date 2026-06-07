"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Video, 
  BookOpen, 
  FolderDown, 
  ExternalLink, 
  Search, 
  Filter, 
  Sparkles, 
  ChevronRight,
  TrendingDown
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";

export default function StudentMaterials() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjects, setSubjects] = useState<string[]>([]);

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

        // Fetch dynamic weak-topic recommendations
        const recsRes = await api.get(`/materials/recommended/${user.id}`);
        setRecommendations(recsRes.data || []);

        // Fetch all materials visible to this student
        const materialsRes = await api.get("/materials");
        const mats = materialsRes.data || [];
        setMaterials(mats);

        // Extract unique subjects for the filter dropdown
        const uniqueSubjects: string[] = Array.from(
          new Set(mats.map((m: any) => m.subject).filter(Boolean))
        );
        setSubjects(uniqueSubjects);

      } catch (err) {
        console.error("Failed to load study materials:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleDownload = async (id: number, title: string, fileUrl: string) => {
    try {
      // Direct window redirect to download endpoint to fetch file attachment
      window.open(`http://localhost:8000/api/materials/${id}/download`, "_blank");
      
      // Update local download count indicator
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, download_count: m.download_count + 1 } : m));
      setRecommendations(prev => prev.map(m => m.id === id ? { ...m, download_count: m.download_count + 1 } : m));
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleViewDetails = async (id: number, extUrl?: string) => {
    try {
      await api.get(`/materials/${id}`);
      // Update local view count indicator
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, view_count: m.view_count + 1 } : m));
      setRecommendations(prev => prev.map(m => m.id === id ? { ...m, view_count: m.view_count + 1 } : m));
      
      if (extUrl) {
        window.open(extUrl, "_blank");
      }
    } catch (err) {
      console.error("Failed to track view details:", err);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
      case "notes":
        return <FileText className="text-emerald-500" size={20} />;
      case "video_link":
        return <Video className="text-rose-500" size={20} />;
      default:
        return <BookOpen className="text-indigo-500" size={20} />;
    }
  };

  const getMaterialTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <Badge variant="success">PDF Document</Badge>;
      case "video_link":
        return <Badge variant="danger">Video Lecture</Badge>;
      case "notes":
        return <Badge variant="info">Lecture Notes</Badge>;
      case "practice_set":
        return <Badge variant="warning">Practice Set</Badge>;
      default:
        return <Badge variant="neutral">{type.replace("_", " ").toUpperCase()}</Badge>;
    }
  };

  // Filter logic
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.topic.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = subjectFilter === "all" || m.subject.toLowerCase() === subjectFilter.toLowerCase();
    const matchesType = typeFilter === "all" || m.material_type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesSubject && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <LayoutWrapper userRole={student.role} userName={student.full_name}>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Syllabus Study Materials</h1>
        <p className="text-sm text-slate-500 mt-1">
          Access course syllabus documents, slides, video lectures, and revision sets assigned by your instructors.
        </p>
      </div>

      {/* AI Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="mb-10 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">AI Weak-Topic Recommendations</h2>
              <p className="text-xs text-slate-550">Targeted study resources derived from your weak quiz topics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="bg-white hover:shadow-md transition-shadow border-slate-200/80 p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {rec.subject.replace("_", " ")}
                    </span>
                    {getMaterialIcon(rec.material_type)}
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors" title={rec.title}>
                    {rec.title}
                  </h3>
                  
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 min-h-[32px]">
                    {rec.description || "Review this study material to strengthen your weak concepts."}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-450">
                    Topic: {rec.topic}
                  </span>
                  
                  {rec.file_url ? (
                    <button 
                      onClick={() => handleDownload(rec.id, rec.title, rec.file_url)}
                      className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1"
                    >
                      Download <FolderDown size={12} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleViewDetails(rec.id, rec.external_url)}
                      className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1"
                    >
                      Watch <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Browse Area */}
      <Card className="mb-8 border-slate-200/80 p-6">
        {/* Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Search & Filters</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search materials or topics..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-650 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub.replace("_", " ").toUpperCase()}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-650 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF Docs</option>
              <option value="video_link">Videos</option>
              <option value="notes">Notes</option>
              <option value="practice_set">Practice Sets</option>
            </select>
          </div>
        </div>

        {/* Materials List */}
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
            <h3 className="font-bold text-slate-700">No Study Materials found</h3>
            <p className="text-xs text-slate-450 mt-1 max-w-[280px] mx-auto leading-relaxed">
              We couldn't find any resources matching your search filters. Try removing query filters or searching keywords.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {filteredMaterials.map((m) => (
              <div 
                key={m.id}
                className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-100 hover:border-slate-200 rounded-xl bg-white hover:shadow-sm transition-all"
              >
                {/* Thumbnail / Icon representation */}
                <div className="w-full sm:w-28 h-20 bg-slate-50 border border-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden group">
                  {m.thumbnail_url ? (
                    <img 
                      src={m.thumbnail_url} 
                      alt={m.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    getMaterialIcon(m.material_type)
                  )}
                  {m.target_audience === "weak_students" && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-white rounded p-0.5" title="Targeted to weak students">
                      <TrendingDown size={10} />
                    </div>
                  )}
                </div>

                {/* Content details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5 items-center mb-1">
                      {getMaterialTypeBadge(m.material_type)}
                      <span className="text-[9px] font-bold text-slate-450 uppercase bg-slate-150 rounded px-1.5 py-0.5">
                        {m.subject.replace("_", " ")}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 leading-snug">
                      {m.title}
                    </h3>
                    
                    <p className="text-[11px] text-slate-450 line-clamp-2 mt-1 leading-relaxed">
                      {m.description || "Syllabus revision documents and materials."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Views: <strong>{m.view_count}</strong></span>
                      {m.file_url && <span>Downloads: <strong>{m.download_count}</strong></span>}
                    </div>

                    <div className="flex gap-2">
                      {m.file_url ? (
                        <Button 
                          variant="outline" 
                          onClick={() => handleDownload(m.id, m.title, m.file_url)}
                          className="flex items-center gap-1 py-1 px-2.5 text-[10px]"
                        >
                          Download <FolderDown size={10} />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => handleViewDetails(m.id, m.external_url)}
                          className="flex items-center gap-1 py-1 px-2.5 text-[10px]"
                        >
                          Watch Video <ExternalLink size={10} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </LayoutWrapper>
  );
}
