import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { getFileUrl } from "../../services/api";

function MyRequests() {
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || "");

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState("");

  const [confirmSlotModal, setConfirmSlotModal] = useState(null);

  const timeSlots = [
    "10:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 16:00",
    "16:00 - 18:00"
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/requests/my");
      setRequests(res.data);
    } catch {
      alert("Failed to load requests");
    }
  };

  const confirmSlot = async (id) => {
    try {
      await api.put(`/requests/${id}/confirm-slot`);
      setConfirmSlotModal(null);
      fetchRequests();
    } catch {
      alert("Failed to confirm slot");
    }
  };

  const cancelRequest = async (id) => {
    try {
      await api.put(`/requests/${id}/cancel`);
      fetchRequests();
    } catch {
      alert("Cancel failed");
    }
  };

  const deleteRequest = async (id) => {
    try {
      await api.delete(`/requests/${id}`);
      fetchRequests();
    } catch {
      alert("Delete failed");
    }
  };

  const requestReschedule = async () => {
    try {
      await api.put(
        `/requests/${rescheduleId}/request-reschedule?requestedDate=${newDate}&requestedSlot=${newSlot}`
      );

      setRescheduleId(null);
      fetchRequests();
    } catch {
      alert("Failed to request reschedule");
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-750 border border-yellow-200";
      case "ACCEPTED":
        return "bg-blue-50 text-blue-750 border border-blue-200";
      case "SCHEDULED":
        return "bg-emerald-50 text-emerald-750 border border-emerald-250";
      case "COMPLETED":
        return "bg-green-50 text-green-750 border border-green-200";
      case "REJECTED":
        return "bg-red-50 text-red-750 border border-red-250";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const openImage = (imageUrls, index) => {
    setCurrentImages(imageUrls);
    setImageIndex(index);
    setSelectedImage(imageUrls[index]);
  };

  const prevImage = () => {
    const prevIdx = (imageIndex - 1 + currentImages.length) % currentImages.length;
    setImageIndex(prevIdx);
    setSelectedImage(currentImages[prevIdx]);
  };

  const nextImage = () => {
    const nextIdx = (imageIndex + 1) % currentImages.length;
    setImageIndex(nextIdx);
    setSelectedImage(currentImages[nextIdx]);
  };

  const filteredRequests = requests.filter(
    (req) => filter === "ALL" || req.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      
      {message && (
        <div className="max-w-4xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl mb-6 shadow-sm flex items-center justify-between animate-fade-in">
          <span className="font-medium text-sm">{message}</span>
          <button onClick={() => setMessage("")} className="text-emerald-500 hover:text-emerald-700 font-bold transition ml-4">✕</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        
        <h1 className="text-3xl font-extrabold text-gray-800 text-left">
          My Pickup Requests
        </h1>

        {/* Filter Bar */}
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs rounded-xl font-semibold border transition cursor-pointer ${
                filter === f
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All Requests" : f}
            </button>
          ))}
        </div>

        {/* Request Cards List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm text-gray-500">
              No pickup requests found matching this status.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id || req._id}
                className="bg-white rounded-3xl shadow-sm border border-gray-150 p-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6"
              >
                
                {/* Left Info Column */}
                <div className="flex-1 text-left space-y-2">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <h2 className="font-extrabold text-gray-800 text-lg">
                      Request #{ (req.id || req._id || "").substring(0, 8) }
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Device:</strong> {req.brand} {req.model} ({req.deviceType})
                  </p>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Quantity:</strong> {req.quantity}
                  </p>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Pickup Address:</strong> {req.pickupAddress}
                  </p>

                  {req.scheduledDate && (
                    <p className="text-sm text-gray-750">
                      <strong className="text-gray-900 font-semibold">Pickup Schedule:</strong> {req.scheduledDate} ({req.scheduledTime})
                    </p>
                  )}

                  {req.collectionOtp && (
                    <div className="pt-1.5 pb-0.5">
                      <span className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-150 font-bold tracking-wide">
                        Collection OTP: {req.collectionOtp}
                      </span>
                    </div>
                  )}

                  {req.adminNotes && (
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <strong className="text-gray-700 not-italic font-bold block mb-0.5">Admin Update:</strong>
                      "{req.adminNotes}"
                    </p>
                  )}

                  {/* Simple Progress Stepper (Non-AI) */}
                  {req.status !== "CANCELLED" && req.status !== "REJECTED" ? (
                    <div className="mt-4 mb-2 max-w-md">
                      <div className="flex items-center">
                        {/* Step 1: Submitted */}
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            ✓
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 mt-1">Submitted</span>
                        </div>

                        {/* Line 1 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          ["ACCEPTED", "SCHEDULED", "COMPLETED"].includes(req.status) ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 2: Approved */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            ["ACCEPTED", "SCHEDULED", "COMPLETED"].includes(req.status)
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {["ACCEPTED", "SCHEDULED", "COMPLETED"].includes(req.status) ? "✓" : "2"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            ["ACCEPTED", "SCHEDULED", "COMPLETED"].includes(req.status) ? "text-emerald-700" : "text-gray-400"
                          }`}>Approved</span>
                        </div>

                        {/* Line 2 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          ["SCHEDULED", "COMPLETED"].includes(req.status) ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 3: Scheduled */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            ["SCHEDULED", "COMPLETED"].includes(req.status)
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {["SCHEDULED", "COMPLETED"].includes(req.status) ? "✓" : "3"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            ["SCHEDULED", "COMPLETED"].includes(req.status) ? "text-emerald-700" : "text-gray-400"
                          }`}>Scheduled</span>
                        </div>

                        {/* Line 3 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          req.status === "COMPLETED" ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 4: Completed */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            req.status === "COMPLETED"
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {req.status === "COMPLETED" ? "✓" : "4"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            req.status === "COMPLETED" ? "text-emerald-700" : "text-gray-400"
                          }`}>Completed</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 mb-2 max-w-[200px]">
                      <div className="flex items-center">
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            ✓
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 mt-1">Submitted</span>
                        </div>
                        <div className="flex-1 h-0.5 -mt-3 bg-red-500"></div>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-7 h-7 rounded-full bg-red-650 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            ✕
                          </div>
                          <span className="text-[10px] font-bold text-red-600 mt-1">
                            {req.status === "REJECTED" ? "Rejected" : "Cancelled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex gap-2 pt-2">
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => cancelRequest(req.id || req._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                      >
                        Cancel Request
                      </button>
                    )}

                    {req.status === "CANCELLED" && (
                      <button
                        onClick={() => deleteRequest(req.id || req._id)}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                      >
                        Delete Request
                      </button>
                    )}

                    {req.status === "SLOT_PROPOSED" && (
                      <>
                        <button
                          onClick={() => setConfirmSlotModal(req.id || req._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                        >
                          Confirm Slot
                        </button>
                        <button
                          onClick={() => setRescheduleId(req.id || req._id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                  </div>

                  {req.status === "RESCHEDULE_REQUESTED" && (
                    <p className="text-orange-600 text-xs font-semibold mt-2">
                      Your reschedule request is under review.
                    </p>
                  )}
                </div>

                {/* Right Image Thumbnail */}
                {req.imageUrls?.length > 0 && (
                  <div
                    className="relative w-28 h-28 ml-0 md:ml-4 flex-shrink-0 self-center md:self-auto cursor-pointer rounded-2xl overflow-hidden border shadow-sm"
                    onClick={() => openImage(req.imageUrls, 0)}
                  >
                    <img
                      src={getFileUrl(req.imageUrls[0])}
                      className="w-full h-full object-cover"
                      alt="Thumbnail"
                    />
                    {req.imageUrls.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        +{req.imageUrls.length - 1}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))
          )}
        </div>

      </div>

      {/* Confirm Slot Modal */}
      {confirmSlotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm mx-4 text-center space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirm Pickup Slot</h2>
            <p className="text-sm text-gray-500">
              Please confirm that you agree with the scheduled collection time proposal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSlotModal(null)}
                className="flex-1 bg-gray-150 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmSlot(confirmSlotModal)}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 text-center">Request New Date/Time</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border border-gray-250 p-2.5 rounded-xl w-full bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Slot</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="border border-gray-250 p-2.5 rounded-xl w-full bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Choose Time Slot</option>
                  {timeSlots.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRescheduleId(null)}
                className="flex-1 bg-gray-150 py-2.5 rounded-xl font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={requestReschedule}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 select-none"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white text-4xl hover:text-red-400 transition"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-6 text-white text-5xl hover:text-emerald-400 transition"
          >
            ‹
          </button>

          <img
            src={getFileUrl(selectedImage)}
            className="max-h-[90%] max-w-[90%] rounded-xl object-contain border border-gray-800"
            alt="View"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-6 text-white text-5xl hover:text-emerald-400 transition"
          >
            ›
          </button>
        </div>
      )}

    </div>
  );
}

export default MyRequests;