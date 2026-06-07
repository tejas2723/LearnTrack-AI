"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  UserPlus, 
  Search, 
  UserCheck, 
  Shield, 
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input, Select } from "@/components/ui";

export default function AdminUsers() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null); // holds user to delete

  // Add User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await api.get("/auth/me");
        if (userRes.data.role !== "admin") {
          router.push(`/${userRes.data.role}/dashboard`);
          return;
        }
        setAdmin(userRes.data);
        await fetchUsers();
      } catch (err) {
        console.error("Admin load users failed:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  async function fetchUsers() {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setAddError("Please fill out all fields.");
      return;
    }

    setAddLoading(true);
    try {
      await api.post("/admin/users", {
        name: newName,
        email: newEmail,
        temp_password: newPassword,
        role: newRole
      });
      
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("student");
      setShowAddModal(false);
      
      await fetchUsers();
    } catch (err: any) {
      console.error("Add user failed:", err);
      setAddError(err.response?.data?.detail || "An error occurred.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleToggleStatus(user: any) {
    try {
      const targetStatus = user.status === "active" ? false : true;
      await api.patch(`/admin/users/${user.id}`, {
        is_active: targetStatus
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to toggle user status:", err);
    }
  }

  async function handleChangeRole(user_id: number, targetRole: string) {
    try {
      await api.patch(`/admin/users/${user_id}`, {
        role: targetRole
      });
      await fetchUsers();
    } catch (err) {
      console.error("Failed to change role:", err);
    }
  }

  async function handleDeleteUser() {
    if (!showDeleteModal) return;
    try {
      await api.delete(`/admin/users/${showDeleteModal.id}`);
      setShowDeleteModal(null);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  }

  // Filter logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesStatus = statusFilter === "All" || u.status === statusFilter.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Auditing, editing role credentials, deactivating, and deleting platform accounts.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 w-fit">
          <UserPlus size={16} />
          Add User
        </Button>
      </div>

      {/* Filters directory card */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        <div className="w-40">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Administrators</option>
          </Select>
        </div>

        <div className="w-40">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      {/* Users table */}
      <Card className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold select-none">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{user.name}</td>
                    <td className="p-4 text-slate-500 font-medium">{user.email}</td>
                    <td className="p-4">
                      {/* Role selector dropdown */}
                      <select 
                        value={user.role} 
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="bg-transparent border-0 hover:bg-slate-100 rounded px-1.5 py-1 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">{user.joined_date}</td>
                    <td className="p-4 text-center">
                      <Badge variant={user.status === "active" ? "success" : "neutral"}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2 py-1 rounded border font-bold transition-all ${
                          user.status === "active" 
                            ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100" 
                            : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button 
                        onClick={() => setShowDeleteModal(user)}
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
                  <td colSpan={6} className="p-8 text-center text-slate-400">No users match the filtering parameters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="text-indigo-650" size={20} />
              Add Platform User
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 animate-pulse" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Full Name</label>
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="john@school.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-505 block">Temporary Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Role Selection</label>
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={addLoading}>
                {addLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-6 text-center">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Confirm Deletion</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Are you sure you want to permanently delete the user <strong className="text-slate-700">{showDeleteModal.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteModal(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteUser}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-0"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

    </LayoutWrapper>
  );
}
