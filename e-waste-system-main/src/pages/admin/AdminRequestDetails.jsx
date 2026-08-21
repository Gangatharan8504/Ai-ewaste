import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import api, { getFileUrl } from "../../services/api";

function AdminRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);

  const [approveConfirm, setApproveConfirm] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");

  // Collect & Verify OTP Modal States
  const [collectModal, setCollectModal] = useState(false);
  const [collectOtp, setCollectOtp] = useState("");
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState("");
  const [collectSuccess, setCollectSuccess] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const timeSlots = [
    "10:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 16:00",
    "16:00 - 18:00"
  ];

  useEffect(() => {
    fetchRequest();
  }, [id]);

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedImage]);

  const fetchRequest = async () => {
    try {
      const res = await api.get(`/admin/requests/${id}`);
      setRequest(res.data);
    } catch {
      alert("Failed to load request");
    }
  };

  const approve = async () => {
    await api.put(`/admin/requests/${id}/status`, { status: "ACCEPTED" });
    setApproveConfirm(false);
    fetchRequest();
  };

  const reject = async () => {
    await api.put(`/admin/requests/${id}/status`, { 
      status: "REJECTED",
      adminNotes: rejectReason || "Request rejected by admin"
    });
    setRejectModal(false);
    setRejectReason("");
    fetchRequest();
  };

  const requestBetterImages = async () => {
    if (window.confirm("Are you sure you want to request better images for this device?")) {
      try {
        await api.put(`/admin/requests/${id}/status`, { status: "BETTER_IMAGES_REQUIRED" });
        fetchRequest();
      } catch (err) {
        console.error(err);
        alert("Failed to request better images.");
      }
    }
  };

  const proposeSlot = async () => {
    if (!slotDate || !slotTime) {
      alert("Please select both a date and time slot.");
      return;
    }
    await api.put(`/admin/requests/${id}/schedule`, {
      scheduledDate: slotDate,
      scheduledTime: slotTime,
      adminNotes: "Pickup scheduled by admin"
    });
    fetchRequest();
  };

  const handleVerifyAndCollect = async (e) => {
    e.preventDefault();
    if (!collectOtp || collectOtp.trim().length !== 6) {
      setCollectError("Please enter the 6-digit collection OTP provided by the user.");
      return;
    }

    setCollectLoading(true);
    setCollectError("");

    try {
      await api.put(`/admin/requests/${id}/collect`, { otp: collectOtp.trim() });
      setCollectSuccess(true);
      setTimeout(() => {
        setCollectModal(false);
        setCollectSuccess(false);
        setCollectOtp("");
        fetchRequest();
      }, 1200);
    } catch (err) {
      setCollectError(err.response?.data?.message || "Invalid Collection OTP. Please check the code provided by the customer.");
    } finally {
      setCollectLoading(false);
    }
  };

  const openImage = (index) => {
    setImageIndex(index);
    setSelectedImage(request.imageUrls[index]);
    setZoom(1);
  };

  const nextImage = () => {
    const next = (imageIndex + 1) % request.imageUrls.length;
    setImageIndex(next);
    setSelectedImage(request.imageUrls[next]);
    setZoom(1);
  };

  const prevImage = () => {
    const prev = (imageIndex - 1 + request.imageUrls.length) % request.imageUrls.length;
    setImageIndex(prev);
    setSelectedImage(request.imageUrls[prev]);
    setZoom(1);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setZoom((prev) => {
      let newZoom = prev + (e.deltaY < 0 ? 0.2 : -0.2);
      if (newZoom < 1) newZoom = 1;
      if (newZoom > 4) newZoom = 4;
      return newZoom;
    });
  };

  if (!request) return <div className="p-10 text-gray-600">Loading request details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-700 font-medium transition cursor-pointer text-sm"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <span className="text-xs font-mono text-gray-400">ID: {request.id || request._id}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900">
          Pickup Request #{ (request.id || request._id || "").substring(0, 8) }
        </h1>

        {/* CUSTOMER DETAILS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 text-left">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            Customer Details
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400 block text-xs">Customer Name</span>
              <span className="font-semibold text-gray-800">{request.userName || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Email Address</span>
              <span className="font-semibold text-gray-800">{request.userEmail || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Phone Number</span>
              <span className="font-semibold text-gray-800">{request.userPhone || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* REQUEST DETAILS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 text-left space-y-3">
          <h2 className="text-lg font-bold text-gray-800 mb-2 pb-2 border-b border-gray-100">
            Request Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <p><b className="text-gray-700">Device Type:</b> {request.deviceType}</p>
            <p><b className="text-gray-700">Brand:</b> {request.brand}</p>
            <p><b className="text-gray-700">Model:</b> {request.model || "N/A"}</p>
            <p><b className="text-gray-700">Condition:</b> {request.condition}</p>
            <p><b className="text-gray-700">Quantity:</b> {request.quantity} units</p>
            <p><b className="text-gray-700">Status:</b> <span className="font-bold text-emerald-700">{request.status}</span></p>
          </div>

          <div className="pt-2 border-t border-gray-100 text-sm">
            <p><b className="text-gray-700">Pickup Address:</b> {request.pickupAddress}</p>
            {request.remarks && <p className="mt-1 text-gray-500 italic">"{request.remarks}"</p>}
          </div>

          {request.scheduledDate && (
            <div className="pt-2 border-t border-gray-100 text-sm">
              <p><b className="text-gray-700">Scheduled Date:</b> {request.scheduledDate} ({request.scheduledTime})</p>
            </div>
          )}

          {request.collectionOtp && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-1.5 rounded-xl text-sm font-semibold">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Collection OTP (for verification):</span>
                <span className="font-mono tracking-wider font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {request.collectionOtp}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* IMAGES */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 text-left">
          <h2 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b border-gray-100">
            Uploaded Photos
          </h2>
          {request.imageUrls && request.imageUrls.length > 0 ? (
            <div className="flex gap-3 flex-wrap">
              {request.imageUrls.map((img, index) => (
                <img
                  key={index}
                  src={getFileUrl(img)}
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition shadow-xs"
                  onClick={() => openImage(index)}
                  alt="E-waste item"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No images uploaded.</p>
          )}
        </div>

        {/* ACTIONS CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 text-left">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            Admin Actions
          </h2>

          {/* If PENDING */}
          {request.status === "PENDING" && (
            <div className="flex gap-3 flex-wrap">
              <button
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm cursor-pointer"
                onClick={() => setApproveConfirm(true)}
              >
                Approve Request
              </button>

              <button
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm cursor-pointer"
                onClick={() => setRejectModal(true)}
              >
                Reject Request
              </button>

              <button
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm cursor-pointer"
                onClick={requestBetterImages}
              >
                Request Better Images
              </button>
            </div>
          )}

          {/* If ACCEPTED: allow scheduling or direct collection */}
          {request.status === "ACCEPTED" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="border border-gray-300 rounded-xl p-2.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <select
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="border border-gray-300 rounded-xl p-2.5 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="">Select Time Slot</option>
                  {timeSlots.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={proposeSlot}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                >
                  Schedule Pickup
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setCollectModal(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={18} /> Verify & Collect E-Waste (OTP)
                </button>
              </div>
            </div>
          )}

          {/* If SCHEDULED: Verify and Collect */}
          {request.status === "SCHEDULED" && (
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => setCollectModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center gap-2 cursor-pointer text-sm"
              >
                <ShieldCheck size={18} /> Verify & Collect E-Waste (OTP)
              </button>

              <button
                onClick={() => setRejectModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold transition shadow-sm cursor-pointer text-sm"
              >
                Cancel Pickup
              </button>
            </div>
          )}

          {/* If COLLECTED / COMPLETED */}
          {["COLLECTED", "COMPLETED"].includes(request.status) && (
            <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <CheckCircle2 size={20} />
              <span>This e-waste request has been verified and collected for recycling!</span>
            </div>
          )}

          {/* If REJECTED */}
          {request.status === "REJECTED" && (
            <div className="text-red-700 font-medium bg-red-50 p-4 rounded-xl border border-red-200">
              This request was rejected.
            </div>
          )}

          {/* If PENDING_OTP */}
          {request.status === "PENDING_OTP" && (
            <div className="text-amber-700 font-medium bg-amber-50 p-4 rounded-xl border border-amber-200">
              Awaiting user OTP verification. The customer has not yet confirmed the OTP sent to their email.
            </div>
          )}

        </div>

      </div>

      {/* VERIFY & COLLECT MODAL */}
      {collectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 text-center animate-scale-in border border-emerald-100">
            
            {collectSuccess ? (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Collection Verified!</h3>
                <p className="text-sm text-gray-500">
                  The e-waste has been successfully verified and marked as collected.
                </p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShieldCheck size={32} />
                </div>

                <h3 className="text-xl font-bold text-gray-900">
                  Verify & Collect E-Waste
                </h3>

                <p className="text-xs text-gray-500 mt-2 mb-6 leading-relaxed">
                  Ask the customer (<strong>{request.userName}</strong>) for the <strong>6-digit Collection OTP</strong> received on their email or dashboard.
                </p>

                {collectError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2 text-left">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{collectError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyAndCollect} className="space-y-5">
                  <div>
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="• • • • • •"
                      value={collectOtp}
                      onChange={(e) => setCollectOtp(e.target.value.replace(/\D/g, ""))}
                      autoFocus
                      required
                      className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 px-4 border-2 border-emerald-500 rounded-xl focus:ring-4 focus:ring-emerald-100 outline-none transition font-bold text-gray-800"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setCollectModal(false); setCollectError(""); setCollectOtp(""); }}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition font-bold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={collectLoading || collectOtp.length !== 6}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition shadow-md font-bold text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {collectLoading ? "Verifying..." : "Confirm Collection"}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* APPROVE CONFIRM MODAL */}
      {approveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-left space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Confirm Approval
            </h3>
            <p className="text-sm text-gray-500">
              Approving will generate a Collection OTP for the customer and notify them by email.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setApproveConfirm(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={approve}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-sm cursor-pointer"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-left space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Reject Request
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (will be emailed to user)..."
              rows="3"
              className="border border-gray-300 w-full p-3 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition shadow-sm cursor-pointer"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 text-white text-3xl font-bold hover:text-gray-300 transition cursor-pointer"
          >
            ✕
          </button>

          <button
            onClick={prevImage}
            className="absolute left-5 text-white text-4xl hover:text-gray-300 transition cursor-pointer"
          >
            ‹
          </button>

          <img
            src={getFileUrl(selectedImage)}
            onWheel={handleWheel}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[80vh] max-w-[80vw] rounded-xl shadow-2xl transition-transform duration-100"
            alt="Enlarged e-waste"
          />

          <button
            onClick={nextImage}
            className="absolute right-5 text-white text-4xl hover:text-gray-300 transition cursor-pointer"
          >
            ›
          </button>
        </div>
      )}

    </div>
  );
}

export default AdminRequestDetails;