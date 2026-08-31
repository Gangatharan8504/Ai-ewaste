import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Users, ClipboardList, Search, ShieldCheck, CheckCircle2, AlertCircle, Clock, Smartphone } from "lucide-react";
import api from "../../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  // Active Tab: 'REQUESTS' | 'USERS'
  const [activeTab, setActiveTab] = useState("REQUESTS");

  // Requests state
  const [requests, setRequests] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_admin_requests");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("cached_admin_requests");
    } catch {
      return false;
    }
  });

  // Users state
  const [users, setUsers] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_admin_users");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("cached_admin_users");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchRequests();
    fetchUsers();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/admin/requests");
      const requestList = res.data && res.data.content ? res.data.content : (Array.isArray(res.data) ? res.data : []);
      const sorted = requestList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(sorted);
      try {
        sessionStorage.setItem("cached_admin_requests", JSON.stringify(sorted));
      } catch {}
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      const userList = Array.isArray(res.data) ? res.data : [];
      setUsers(userList);
      try {
        sessionStorage.setItem("cached_admin_users", JSON.stringify(userList));
      } catch {}
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Helper to trigger browser CSV download
  const exportToCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Requests CSV
  const handleDownloadRequestsCSV = () => {
    const dataToExport = filteredRequests.length > 0 ? filteredRequests : requests;
    if (dataToExport.length === 0) {
      alert("No request data available to download.");
      return;
    }

    const headers = [
      "Request ID",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Device Type",
      "Brand",
      "Model",
      "Condition",
      "Quantity",
      "Pickup Address",
      "Status",
      "Collection OTP",
      "Scheduled Date",
      "Scheduled Time",
      "Admin Notes",
      "Created Date"
    ];

    const rows = dataToExport.map((r) => [
      `"${r._id || r.id || ""}"`,
      `"${(r.userName || "").replace(/"/g, '""')}"`,
      `"${(r.userEmail || "").replace(/"/g, '""')}"`,
      `"${(r.userPhone || "").replace(/"/g, '""')}"`,
      `"${(r.deviceType || "").replace(/"/g, '""')}"`,
      `"${(r.brand || "").replace(/"/g, '""')}"`,
      `"${(r.model || "").replace(/"/g, '""')}"`,
      `"${(r.condition || "").replace(/"/g, '""')}"`,
      r.quantity || 1,
      `"${(r.pickupAddress || "").replace(/"/g, '""')}"`,
      `"${r.status || "PENDING"}"`,
      `"${r.collectionOtp || ""}"`,
      `"${r.scheduledDate || ""}"`,
      `"${r.scheduledTime || ""}"`,
      `"${(r.adminNotes || "").replace(/"/g, '""')}"`,
      `"${new Date(r.createdAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];
    exportToCSV(csvContent, `EcoSync_Requests_${dateStr}.csv`);
  };

  // Download Users CSV
  const handleDownloadUsersCSV = () => {
    const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;
    if (dataToExport.length === 0) {
      alert("No user data available to download.");
      return;
    }

    const headers = [
      "User ID",
      "First Name",
      "Last Name",
      "Full Name",
      "Email Address",
      "Phone Number",
      "Address",
      "Pincode",
      "Role",
      "Verified Account",
      "Total Logins",
      "Last Login Timestamp",
      "Registered Date"
    ];

    const rows = dataToExport.map((u) => [
      `"${u._id || u.id || ""}"`,
      `"${(u.firstName || "").replace(/"/g, '""')}"`,
      `"${(u.lastName || "").replace(/"/g, '""')}"`,
      `"${(u.fullName || `${u.firstName || ""} ${u.lastName || ""}`).trim().replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.phone || "").replace(/"/g, '""')}"`,
      `"${(u.address || "").replace(/"/g, '""')}"`,
      `"${(u.pincode || "").replace(/"/g, '""')}"`,
      `"${u.role || "USER"}"`,
      u.enabled && u.emailVerified ? "YES" : "NO",
      u.loginCount || (u.enabled ? 1 : 0),
      u.lastLogin ? `"${new Date(u.lastLogin).toLocaleString()}"` : '"Never logged in"',
      `"${new Date(u.createdAt).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];
    exportToCSV(csvContent, `EcoSync_Users_${dateStr}.csv`);
  };

  const statusColor = (status) => {
    switch (status) {
      case "PENDING_OTP":
        return "bg-amber-100 text-amber-800 border border-amber-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "SCHEDULED":
        return "bg-indigo-100 text-indigo-800 border border-indigo-200";
      case "COLLECTED":
      case "COMPLETED":
        return "bg-green-100 text-green-800 border border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border border-red-200";
      case "CANCELLED":
        return "bg-gray-200 text-gray-700 border border-gray-300";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const filteredRequests = requests
    .filter((r) => filter === "ALL" || r.status === filter)
    .filter((r) => {
      const q = search.toLowerCase();
      return (
        (r._id || r.id || "").toString().includes(q) ||
        (r.deviceType || "").toLowerCase().includes(q) ||
        (r.brand || "").toLowerCase().includes(q) ||
        (r.userName || "").toLowerCase().includes(q) ||
        (r.userEmail || "").toLowerCase().includes(q) ||
        (r.pickupAddress || "").toLowerCase().includes(q)
      );
    });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u._id || u.id || "").toString().includes(q) ||
      (u.fullName || `${u.firstName || ""} ${u.lastName || ""}`).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.address || "").toLowerCase().includes(q) ||
      (u.pincode || "").toString().includes(q)
    );
  });

  const statusLabels = {
    ALL: "All Requests",
    PENDING: "Pending Approval",
    PENDING_OTP: "Awaiting User OTP",
    ACCEPTED: "Approved",
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled"
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    approved: requests.filter((r) => r.status === "ACCEPTED").length,
    scheduled: requests.filter((r) => r.status === "SCHEDULED").length,
    completed: requests.filter((r) => ["COLLECTED", "COMPLETED"].includes(r.status)).length
  };

  const userStats = {
    total: users.length,
    verified: users.filter((u) => u.enabled && u.emailVerified).length,
    totalLogins: users.reduce((sum, u) => sum + (u.loginCount || (u.enabled ? 1 : 0)), 0),
    activeRecently: users.filter((u) => u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10 font-sans pb-20">
      
      {/* HEADER BAR */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Admin Control Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage electronic waste pickup requests, user records, and login analytics
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="bg-gray-200/80 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner border border-gray-200">
          <button
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
              activeTab === "REQUESTS"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ClipboardList size={18} />
            <span>Pickup Requests ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("USERS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
              activeTab === "USERS"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users size={18} />
            <span>User Accounts & Logins ({users.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: REQUESTS ================= */}
      {activeTab === "REQUESTS" && (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Total Requests</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-yellow-600 font-bold uppercase text-[10px] tracking-wider">Pending Review</p>
              <h2 className="text-2xl font-extrabold text-yellow-600 mt-1">{stats.pending}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-blue-600 font-bold uppercase text-[10px] tracking-wider">Approved</p>
              <h2 className="text-2xl font-extrabold text-blue-600 mt-1">{stats.approved}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-wider">Scheduled</p>
              <h2 className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.scheduled}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-wider">Collected / Recycled</p>
              <h2 className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</h2>
            </div>
          </div>

          {/* SEARCH, FILTER & CSV DOWNLOAD TOOLBAR */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-150 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests by ID, user, device, brand, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Filter Pills & Download CSV Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "PENDING", "PENDING_OTP", "ACCEPTED", "SCHEDULED", "COMPLETED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      filter === status
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>

              {/* DOWNLOAD REQUESTS CSV BUTTON */}
              <button
                onClick={handleDownloadRequestsCSV}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer ml-auto"
                title="Export requests to CSV spreadsheet"
              >
                <Download size={15} />
                <span>Export Requests CSV</span>
              </button>
            </div>
          </div>

          {/* REQUESTS TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b border-gray-150">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Device & Brand</th>
                    <th className="p-4">Quantity</th>
                    <th className="p-4">Pickup Address</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Collection OTP</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {requestsLoading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-400">Loading pickup requests...</td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-gray-400">No requests found matching your filter criteria.</td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr
                        key={req._id || req.id}
                        className="hover:bg-emerald-50/40 cursor-pointer transition"
                        onClick={() => navigate(`/admin/request/${req._id || req.id}`)}
                      >
                        <td className="p-4 font-mono text-xs font-bold text-gray-600">
                          #{ (req._id || req.id || "").substring(0, 8) }
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-gray-900 block">{req.userName || "Customer"}</span>
                          <span className="text-xs text-gray-400">{req.userEmail || req.userPhone || ""}</span>
                        </td>
                        <td className="p-4 font-medium text-gray-800">
                          {req.brand} {req.model ? `(${req.model})` : ""} - <span className="text-gray-500">{req.deviceType}</span>
                        </td>
                        <td className="p-4 font-semibold text-gray-700">
                          {req.quantity || 1} units
                        </td>
                        <td className="p-4 text-gray-600 max-w-xs truncate" title={req.pickupAddress}>
                          {req.pickupAddress}
                        </td>
                        <td className="p-4 text-xs">
                          {req.scheduledDate ? (
                            <span className="text-emerald-800 font-semibold">{req.scheduledDate} ({req.scheduledTime})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {req.collectionOtp ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                              {req.collectionOtp}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 2: USERS & LOGIN ACTIVITY ================= */}
      {activeTab === "USERS" && (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {/* USER STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Total Registered Users</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{userStats.total}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-wider">Verified Accounts</p>
              <h2 className="text-2xl font-extrabold text-emerald-600 mt-1">{userStats.verified}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-blue-600 font-bold uppercase text-[10px] tracking-wider">Total Successful Logins</p>
              <h2 className="text-2xl font-extrabold text-blue-600 mt-1">{userStats.totalLogins}</h2>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150">
              <p className="text-purple-600 font-bold uppercase text-[10px] tracking-wider">Active This Week</p>
              <h2 className="text-2xl font-extrabold text-purple-600 mt-1">{userStats.activeRecently}</h2>
            </div>
          </div>

          {/* SEARCH & DOWNLOAD USERS CSV */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-150 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, phone, city, address..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* DOWNLOAD USERS CSV BUTTON */}
            <button
              onClick={handleDownloadUsersCSV}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              title="Export all user accounts & login history to CSV"
            >
              <Download size={15} />
              <span>Download Users CSV</span>
            </button>
          </div>

          {/* USERS TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-500 uppercase text-[11px] font-bold tracking-wider border-b border-gray-150">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Address / City</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total Logins</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4">Registered On</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {usersLoading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400">Loading user accounts...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-gray-400">No user accounts found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id || u.id} className="hover:bg-gray-50 transition">
                        
                        {/* User Name + Avatar */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                              {((u.firstName?.charAt(0) || "") + (u.lastName?.charAt(0) || "")).toUpperCase() || "U"}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block">
                                {u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "User"}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">
                                #{ (u._id || u.id || "").substring(0, 8) }
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="p-4">
                          <span className="text-gray-800 block text-xs font-medium">{u.email}</span>
                          <span className="text-xs text-gray-500">{u.phone || "No phone"}</span>
                        </td>

                        {/* Address */}
                        <td className="p-4 text-xs text-gray-600 max-w-xs truncate" title={u.address}>
                          {u.address ? (
                            <span>{u.address} {u.pincode ? `(${u.pincode})` : ""}</span>
                          ) : (
                            <span className="text-gray-400 italic">Not specified</span>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td className="p-4">
                          {u.enabled && u.emailVerified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <CheckCircle2 size={13} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
                              <AlertCircle size={13} /> Unverified
                            </span>
                          )}
                        </td>

                        {/* Total Logins */}
                        <td className="p-4">
                          <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-xs border border-gray-200">
                            🔥 {u.loginCount || (u.enabled ? 1 : 0)} Logins
                          </span>
                        </td>

                        {/* Last Login */}
                        <td className="p-4 text-xs">
                          {u.lastLogin ? (
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <Clock size={13} className="text-emerald-600 shrink-0" />
                              <span>{new Date(u.lastLogin).toLocaleDateString()} at {new Date(u.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Never</span>
                          )}
                        </td>

                        {/* Registration Date */}
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default AdminDashboard;