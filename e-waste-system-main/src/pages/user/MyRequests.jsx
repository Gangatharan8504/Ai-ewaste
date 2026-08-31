import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck, CheckCircle2, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import api, { getFileUrl } from "../../services/api";

function MyRequests() {
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || "");

  const [requests, setRequests] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_my_requests");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("cached_my_requests");
    } catch {
      return true;
    }
  });
  const [filter, setFilter] = useState("ALL");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState("");

  const [confirmSlotModal, setConfirmSlotModal] = useState(null);

  // Modal to verify request OTP directly from My Requests list
  const [verifyOtpModal, setVerifyOtpModal] = useState(null);
  const [verifyOtpCode, setVerifyOtpCode] = useState("");
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [verifyOtpError, setVerifyOtpError] = useState("");
  const [verifyOtpSuccess, setVerifyOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/requests/my");
      setRequests(res.data);
      try {
        sessionStorage.setItem("cached_my_requests", JSON.stringify(res.data));
      } catch {}
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
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
    if (!window.confirm("Are you sure you want to cancel this pickup request?")) return;
    try {
      const res = await api.put(`/requests/${id}/cancel`);
      setMessage(res.data?.message || "Pickup request cancelled successfully.");
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel pickup request.");
    }
  };

  const deleteRequest = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await api.delete(`/requests/${id}`);
      setMessage(res.data?.message || "Request record deleted successfully.");
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete record.");
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

  const openVerifyModal = (reqId) => {
    setVerifyOtpModal(reqId);
    setVerifyOtpCode("");
    setVerifyOtpError("");
    setVerifyOtpSuccess(false);
    setResendCooldown(30);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!verifyOtpCode || verifyOtpCode.trim().length !== 6) {
      setVerifyOtpError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setVerifyOtpLoading(true);
    setVerifyOtpError("");

    try {
      await api.post(`/requests/${verifyOtpModal}/verify-submission-otp`, { otp: verifyOtpCode.trim() });
      setVerifyOtpSuccess(true);
      setTimeout(() => {
        setVerifyOtpModal(null);
        setVerifyOtpSuccess(false);
        setVerifyOtpCode("");
        fetchRequests();
        setMessage("Pickup request verified and submitted successfully!");
      }, 1000);
    } catch (err) {
      setVerifyOtpError(err.response?.data?.message || "Invalid OTP. Please check the code in your email.");
    } finally {
      setVerifyOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setVerifyOtpError("");
    try {
      await api.post(`/requests/${verifyOtpModal}/resend-submission-otp`);
      setResendCooldown(30);
    } catch (err) {
      setVerifyOtpError(err.response?.data?.message || "Failed to resend OTP.");
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "PENDING_OTP":
        return "bg-amber-50 text-amber-800 border border-amber-300";
      case "PENDING":
        return "bg-yellow-50 text-yellow-800 border border-yellow-200";
      case "ACCEPTED":
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case "SCHEDULED":
        return "bg-emerald-50 text-emerald-800 border border-emerald-300";
      case "COLLECTED":
      case "COMPLETED":
        return "bg-green-50 text-green-800 border border-green-200";
      case "REJECTED":
        return "bg-red-50 text-red-800 border border-red-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case "PENDING_OTP":
        return "Awaiting OTP Verification";
      case "PENDING":
        return "Pending Review";
      case "ACCEPTED":
        return "Approved";
      case "SCHEDULED":
        return "Scheduled";
      case "COLLECTED":
        return "Collected";
      case "COMPLETED":
        return "Completed";
      case "REJECTED":
        return "Rejected";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans pb-16">
      
      {message && (
        <div className="max-w-4xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl mb-6 shadow-sm flex items-center justify-between animate-fade-in">
          <span className="font-medium text-sm">{message}</span>
          <button onClick={() => setMessage("")} className="text-emerald-500 hover:text-emerald-700 font-bold transition ml-4 cursor-pointer">✕</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-gray-900 text-left">
            My Pickup Requests
          </h1>

          <button
            onClick={() => { setLoading(true); fetchRequests(); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl font-semibold shadow-xs hover:border-emerald-300 transition cursor-pointer"
            title="Refresh requests"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PENDING_OTP", "PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs rounded-xl font-semibold border transition cursor-pointer ${
                filter === f
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All Requests" : f === "PENDING_OTP" ? "Awaiting OTP" : f}
            </button>
          ))}
        </div>

        {/* Request Cards List */}
        <div className="space-y-4">
          {loading && requests.length === 0 ? (
            // Shimmer Skeleton Loading Cards
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-3xl p-6 border border-gray-150 shadow-xs animate-pulse flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-5 bg-gray-200 rounded-md w-32"></div>
                      <div className="h-5 bg-emerald-100 rounded-full w-24"></div>
                    </div>
                    <div className="h-4 bg-gray-150 rounded w-48"></div>
                    <div className="h-4 bg-gray-150 rounded w-64"></div>
                    <div className="h-2 bg-gray-100 rounded w-full max-w-sm mt-3"></div>
                  </div>
                  <div className="w-28 h-28 bg-gray-200 rounded-2xl shrink-0 hidden sm:block"></div>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-150 text-center shadow-sm text-gray-500">
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
                  <div className="flex items-center justify-between md:justify-start gap-4 flex-wrap">
                    <h2 className="font-extrabold text-gray-900 text-lg">
                      Request #{ (req.id || req._id || "").substring(0, 8) }
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(req.status)}`}>
                      {statusLabel(req.status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Device:</strong> {req.brand} {req.model} ({req.deviceType})
                  </p>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Quantity:</strong> {req.quantity} units
                  </p>

                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900 font-semibold">Pickup Address:</strong> {req.pickupAddress}
                  </p>

                  {req.scheduledDate && (
                    <p className="text-sm text-gray-750">
                      <strong className="text-gray-900 font-semibold">Pickup Schedule:</strong> {req.scheduledDate} ({req.scheduledTime})
                    </p>
                  )}

                  {/* Collection OTP for agent verification */}
                  {req.collectionOtp && (
                    <div className="pt-1.5 pb-0.5">
                      <div className="inline-flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold tracking-wide">
                        <ShieldCheck size={15} className="text-emerald-700" />
                        <span>Collection OTP:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-sm">
                          {req.collectionOtp}
                        </span>
                      </div>
                    </div>
                  )}

                  {req.adminNotes && (
                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <strong className="text-gray-700 not-italic font-bold block mb-0.5">Admin Update:</strong>
                      "{req.adminNotes}"
                    </p>
                  )}

                  {/* Stepper */}
                  {req.status !== "CANCELLED" && req.status !== "REJECTED" ? (
                    <div className="mt-4 mb-2 max-w-md">
                      <div className="flex items-center">
                        {/* Step 1: Submitted */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            req.status === "PENDING_OTP" 
                              ? "bg-amber-500 text-white" 
                              : "bg-emerald-600 text-white"
                          }`}>
                            {req.status === "PENDING_OTP" ? "!" : "✓"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            req.status === "PENDING_OTP" ? "text-amber-700" : "text-emerald-700"
                          }`}>
                            {req.status === "PENDING_OTP" ? "Verify OTP" : "Submitted"}
                          </span>
                        </div>

                        {/* Line 1 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          ["ACCEPTED", "SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 2: Approved */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            ["ACCEPTED", "SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status)
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {["ACCEPTED", "SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "✓" : "2"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            ["ACCEPTED", "SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "text-emerald-700" : "text-gray-400"
                          }`}>Approved</span>
                        </div>

                        {/* Line 2 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          ["SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 3: Scheduled */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            ["SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status)
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {["SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "✓" : "3"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            ["SCHEDULED", "COLLECTED", "COMPLETED"].includes(req.status) ? "text-emerald-700" : "text-gray-400"
                          }`}>Scheduled</span>
                        </div>

                        {/* Line 3 */}
                        <div className={`flex-1 h-0.5 -mt-3 ${
                          ["COLLECTED", "COMPLETED"].includes(req.status) ? "bg-emerald-600" : "bg-gray-200"
                        }`}></div>

                        {/* Step 4: Completed */}
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-sm ${
                            ["COLLECTED", "COMPLETED"].includes(req.status)
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 border border-gray-300 text-gray-400"
                          }`}>
                            {["COLLECTED", "COMPLETED"].includes(req.status) ? "✓" : "4"}
                          </div>
                          <span className={`text-[10px] font-bold mt-1 ${
                            ["COLLECTED", "COMPLETED"].includes(req.status) ? "text-emerald-700" : "text-gray-400"
                          }`}>Collected</span>
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
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {req.status === "PENDING_OTP" && (
                      <button
                        onClick={() => openVerifyModal(req.id || req._id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <ShieldCheck size={15} /> Verify Request with OTP
                      </button>
                    )}

                    {["PENDING_OTP", "PENDING"].includes(req.status) && (
                      <button
                        onClick={() => cancelRequest(req.id || req._id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    )}

                    {req.status === "CANCELLED" && (
                      <button
                        onClick={() => deleteRequest(req.id || req._id)}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                      >
                        Delete Record
                      </button>
                    )}

                    {req.status === "SLOT_PROPOSED" && (
                      <>
                        <button
                          onClick={() => setConfirmSlotModal(req.id || req._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                        >
                          Confirm Slot
                        </button>
                        <button
                          onClick={() => setRescheduleId(req.id || req._id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                  </div>

                </div>

                {/* Right Image Thumbnail Column */}
                {req.imageUrls && req.imageUrls.length > 0 && (
                  <div 
                    className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer group bg-gray-100 flex items-center justify-center"
                    onClick={() => openImage(req.imageUrls, 0)}
                  >
                    <img
                      src={getFileUrl(req.imageUrls[0])}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      alt="Device"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=300&q=80";
                      }}
                    />
                    {req.imageUrls.length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        +{req.imageUrls.length - 1}
                      </span>
                    )}
                  </div>
                )}

              </div>
            ))
          )}
        </div>

      </div>

      {/* OTP Verification Modal on MyRequests */}
      {verifyOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 text-center animate-scale-in border border-emerald-100">
            
            {verifyOtpSuccess ? (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Request Verified!</h3>
                <p className="text-sm text-gray-500">
                  Your pickup request has been verified and is now under review.
                </p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShieldCheck size={32} />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Verify Pickup Request
                </h3>

                <p className="text-xs text-gray-500 mt-2 mb-6 leading-relaxed">
                  Enter the <strong>6-digit OTP code</strong> sent to your email to confirm and activate this pickup request.
                </p>

                {verifyOtpError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2 text-left">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{verifyOtpError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="• • • • • •"
                      value={verifyOtpCode}
                      onChange={(e) => setVerifyOtpCode(e.target.value.replace(/\D/g, ""))}
                      autoFocus
                      required
                      className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 px-4 border-2 border-emerald-500 rounded-xl focus:ring-4 focus:ring-emerald-100 outline-none transition font-bold text-gray-800"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setVerifyOtpModal(null)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition font-bold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifyOtpLoading || verifyOtpCode.length !== 6}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition shadow-md font-bold text-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {verifyOtpLoading ? "Verifying..." : (
                        <>
                          Verify OTP <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="text-emerald-700 font-semibold hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={13} className={resendCooldown > 0 ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Confirm Slot Modal */}
      {confirmSlotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirm This Pickup Slot?</h2>
            <p className="text-xs text-gray-500">By confirming, our collection agent will be dispatched at this designated time.</p>
            <div className="flex gap-3 pt-2">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4">
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
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 select-none p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white text-4xl hover:text-red-400 transition cursor-pointer"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-6 text-white text-5xl hover:text-emerald-400 transition cursor-pointer"
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
            className="absolute right-6 text-white text-5xl hover:text-emerald-400 transition cursor-pointer"
          >
            ›
          </button>
        </div>
      )}

    </div>
  );
}

export default MyRequests;