import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function AdminDashboard() {

  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {

    try {

      const res = await api.get("/admin/requests");
      const requestList = res.data && res.data.content ? res.data.content : (Array.isArray(res.data) ? res.data : []);

      const sorted = requestList.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setRequests(sorted);

    } catch (err) {

      console.error("Failed to load requests:", err);

    }

  };

  const statusColor = (status) => {
    switch (status) {
      case "PENDING_OTP":
        return "bg-amber-100 text-amber-800 border border-amber-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "ACCEPTED":
        return "bg-blue-100 text-blue-700";
      case "SCHEDULED":
        return "bg-indigo-100 text-indigo-700";
      case "COLLECTED":
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const filteredRequests = requests
    .filter(r => filter === "ALL" || r.status === filter)
    .filter(r => {

      const q = search.toLowerCase();

      return (
        (r._id || r.id || "").toString().includes(q) ||
        (r.deviceType || "").toLowerCase().includes(q) ||
        (r.brand || "").toLowerCase().includes(q) ||
        (r.pickupAddress || "").toLowerCase().includes(q)
      );

    });

  const statusLabels = {
    ALL: "All",
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
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "ACCEPTED").length,
    scheduled: requests.filter(r => r.status === "SCHEDULED").length,
    completed: requests.filter(r => r.status === "COMPLETED").length

  };

  return (

    <div className="min-h-screen bg-gray-50 p-10">

      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Lets Manage Requests
      </h1>

      {/* STATS */}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-10">

        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Requests</p>
          <h2 className="text-2xl font-bold">{stats.total}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Pending</p>
          <h2 className="text-2xl font-bold text-yellow-600">{stats.pending}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Approved</p>
          <h2 className="text-2xl font-bold text-blue-600">{stats.approved}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Scheduled</p>
          <h2 className="text-2xl font-bold text-cyan-600">{stats.scheduled}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Completed</p>
          <h2 className="text-2xl font-bold text-green-600">{stats.completed}</h2>
        </div>

      </div>

      {/* SEARCH + FILTER */}

      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">

        <input
          type="text"
          placeholder="Search by ID, device, brand, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-4 py-2 rounded-lg w-full md:w-80"
        />

        <div className="flex gap-2 flex-wrap">

          {[
            "ALL",
            "PENDING",
            "PENDING_OTP",
            "ACCEPTED",
            "SCHEDULED",
            "COMPLETED",
            "REJECTED",
            "CANCELLED"
          ].map(status => (

            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded text-xs font-medium border ${
                filter === status
                  ? "bg-emerald-600 text-white"
                  : "bg-white"
              }`}
            >
              {statusLabels[status]}
            </button>

          ))}

        </div>

      </div>

      {/* REQUEST TABLE */}

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">

            <tr>
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Device</th>
              <th className="p-4 text-left">Address</th>
              <th className="p-4 text-left">Scheduled Date</th>
              <th className="p-4 text-left">Scheduled Time</th>
              <th className="p-4 text-left">Admin Notes</th>
              <th className="p-4 text-left">Status</th>
            </tr>

          </thead>

          <tbody>

            {filteredRequests.map(req => (

              <tr
                key={req._id || req.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/request/${req._id || req.id}`)}
              >

                <td className="p-4">{req._id || req.id}</td>

                <td className="p-4">
                  {req.deviceType} - {req.brand}
                </td>

                <td className="p-4">{req.pickupAddress}</td>

                <td className="p-4">{req.scheduledDate || "-"}</td>

                <td className="p-4">{req.scheduledTime || "-"}</td>

                <td className="p-4">{req.adminNotes || "-"}</td>

                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );
}

export default AdminDashboard;