"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User, AlertCircle, Bookmark, ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from "@/components/ui";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [prnNo, setPrnNo] = useState("");
  const [className, setClassName] = useState("");
  const [department, setDepartment] = useState("");
  const [yearSemester, setYearSemester] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [previousCgpa, setPreviousCgpa] = useState("");
  const [attendancePercentage, setAttendancePercentage] = useState("");
  const [skills, setSkills] = useState("");
  const [learningInterests, setLearningInterests] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    
    setLoading(true);

    try {
      const payload = {
        email,
        full_name: fullName,
        password,
        role,
        prn_no: role === "student" ? prnNo : null,
        class_name: role === "student" ? className : null,
        department: role === "student" ? department : null,
        year_semester: role === "student" ? yearSemester : null,
        roll_number: role === "student" ? rollNumber : null,
        previous_cgpa: role === "student" && previousCgpa ? parseFloat(previousCgpa) : null,
        attendance_percentage: role === "student" && attendancePercentage ? parseFloat(attendancePercentage) : null,
        skills: role === "student" && skills ? skills.split(",").map(s => s.trim()).filter(s => s) : null,
        learning_interests: role === "student" && learningInterests ? learningInterests.split(",").map(s => s.trim()).filter(s => s) : null,
      };
      
      await api.post("/auth/register", payload);
      // Redirect to login page on success, as specified by requirements
      router.push("/auth/login?registered=success");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Email or PRN may already exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3 shadow-sm border border-indigo-100">
            <GraduationCap size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
          <p className="text-xs text-slate-500 mt-1">Get started with LearnTrack AI performance monitoring</p>
        </div>

        {/* Register Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Account Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">User Account Type</label>
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </Select>
              </div>

              {/* Conditionally render Student fields */}
              {role === "student" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">PRN Number</label>
                      <Input
                        type="text"
                        placeholder="e.g. 230676..."
                        required={role === "student"}
                        value={prnNo}
                        onChange={(e) => setPrnNo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Roll Number</label>
                      <Input
                        type="text"
                        placeholder="e.g. 45"
                        required={role === "student"}
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
                      <Input
                        type="text"
                        placeholder="e.g. Computer Engineering"
                        required={role === "student"}
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year / Semester</label>
                      <Input
                        type="text"
                        placeholder="e.g. 3rd Year / 6th Sem"
                        required={role === "student"}
                        value={yearSemester}
                        onChange={(e) => setYearSemester(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Class / Division</label>
                      <Input
                        type="text"
                        placeholder="e.g. TY - A"
                        required={role === "student"}
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Previous CGPA (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="e.g. 85.5"
                        required={role === "student"}
                        value={previousCgpa}
                        onChange={(e) => setPreviousCgpa(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Attendance Percentage (%)</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      placeholder="e.g. 92"
                      required={role === "student"}
                      value={attendancePercentage}
                      onChange={(e) => setAttendancePercentage(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Skills (comma separated)</label>
                    <Input
                      type="text"
                      placeholder="e.g. Python, React, Machine Learning"
                      required={role === "student"}
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Learning Interests (comma separated)</label>
                    <Input
                      type="text"
                      placeholder="e.g. Data Science, Web Development"
                      required={role === "student"}
                      value={learningInterests}
                      onChange={(e) => setLearningInterests(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? "Registering account..." : "Sign Up"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Foot Links */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-750">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
