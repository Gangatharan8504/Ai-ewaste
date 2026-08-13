import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getFileUrl } from "../../services/api";

function AdminRequestDetails() {

  const { id } = useParams();

  const [request, setRequest] = useState(null);

  const [approveConfirm, setApproveConfirm] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");

  const [staff, setStaff] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  const [zoom, setZoom] = useState(1); // ✅ added

  const staffOptions = ["Rahul", "Amit", "Sunita", "Team A"];

  const timeSlots = [
    "10:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 16:00",
    "16:00 - 18:00"
  ];

  useEffect(() => {
    fetchRequest();
  }, []);

  // ✅ ADDED: lock background scroll when modal open
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
    await api.put(`/admin/requests/${id}/status`, { status: "REJECTED" });
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
    await api.put(`/admin/requests/${id}/schedule`, {
      scheduledDate: slotDate,
      scheduledTime: slotTime,
      adminNotes: "Pickup scheduled by admin"
    });
    fetchRequest();
  };

  const markCompleted = async () => {
    await api.put(`/admin/requests/${id}/status`, { status: "COMPLETED" });
    fetchRequest();
  };

  const approveReschedule = async () => {
    await api.put(`/admin/requests/${id}/status`, { status: "ACCEPTED" });
    fetchRequest();
  };

  const rejectReschedule = async () => {
    await api.put(`/admin/requests/${id}/status`, { status: "REJECTED" });
    fetchRequest();
  };

  const openImage = (index) => {
    setImageIndex(index);
    setSelectedImage(request.imageUrls[index]);
    setZoom(1); // ✅ reset zoom
  };

  const nextImage = () => {
    const next = (imageIndex + 1) % request.imageUrls.length;
    setImageIndex(next);
    setSelectedImage(request.imageUrls[next]);
    setZoom(1); // ✅ reset zoom
  };

  const prevImage = () => {
    const prev =
      (imageIndex - 1 + request.imageUrls.length) % request.imageUrls.length;
    setImageIndex(prev);
    setSelectedImage(request.imageUrls[prev]);
    setZoom(1); // ✅ reset zoom
  };

  // ✅ mouse wheel zoom (fixed)
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ prevent background scroll

    setZoom((prev) => {
      let newZoom = prev + (e.deltaY < 0 ? 0.2 : -0.2);

      if (newZoom < 1) newZoom = 1;
      if (newZoom > 4) newZoom = 4;

      return newZoom;
    });
  };

  if (!request) return <div className="p-10">Loading...</div>;

  return (

    <div className="min-h-screen bg-gray-50 p-4 md:p-10">

      <h1 className="text-3xl font-bold mb-6">
        Request #{request.id}
      </h1>

      {/* CUSTOMER */}

      <div className="bg-white p-6 rounded-xl shadow mb-6">

        <h2 className="text-xl font-semibold mb-3">
          Customer Details
        </h2>

        <p><b>Name:</b> {request.userName}</p>
        <p><b>Email:</b> {request.userEmail}</p>
        <p><b>Mobile:</b> {request.userPhone}</p>

      </div>

      {/* REQUEST */}

      <div className="bg-white p-6 rounded-xl shadow mb-6">

        <h2 className="text-xl font-semibold mb-4">
          Request Information
        </h2>

        <p><b>Device:</b> {request.deviceType}</p>
        <p><b>Brand:</b> {request.brand}</p>
        <p><b>Model:</b> {request.model}</p>
        <p><b>Condition:</b> {request.condition}</p>
        <p><b>Quantity:</b> {request.quantity}</p>
        <p><b>Address:</b> {request.pickupAddress}</p>
        <p><b>Status:</b> <span className="font-semibold text-emerald-700">{request.status}</span></p>
        {request.scheduledDate && <p><b>Scheduled Date:</b> {request.scheduledDate}</p>}
        {request.scheduledTime && <p><b>Scheduled Time:</b> {request.scheduledTime}</p>}
        {request.adminNotes && <p><b>Admin Notes:</b> {request.adminNotes}</p>}
        {request.collectionOtp && <p><b>Collection OTP:</b> <span className="font-mono bg-emerald-55 text-emerald-850 px-2.5 py-0.5 rounded border border-emerald-200 font-bold">{request.collectionOtp}</span></p>}

      </div>

      {/* SMALLER IMAGE SECTION */}

      <div className="bg-white p-4 rounded-xl shadow mb-6">

        <h2 className="text-lg font-semibold mb-3">
          Images
        </h2>

        <div className="flex gap-3 flex-wrap">

          {request.imageUrls?.map((img, index) => (

            <img
              key={index}
              src={getFileUrl(img)}
              className="w-24 h-24 object-cover rounded cursor-pointer"
              onClick={() => openImage(index)}
            />

          ))}

        </div>

      </div>



      {/* ACTIONS */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-semibold mb-4">
          Take Action
        </h2>

        {request.status === "PENDING" && (

          <div className="flex gap-3">

            <button
              className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer"
              onClick={() => setApproveConfirm(true)}
            >
              Approve
            </button>

            <button
              className="bg-red-600 text-white px-4 py-2 rounded cursor-pointer"
              onClick={() => setRejectModal(true)}
            >
              Reject
            </button>

            <button
              className="bg-amber-600 text-white px-4 py-2 rounded cursor-pointer"
              onClick={requestBetterImages}
            >
              Request Better Images
            </button>

          </div>

        )}

        {request.status === "ACCEPTED" && (

          <div className="flex flex-col sm:flex-row gap-3">

            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />

            <select
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
              className="border border-gray-300 rounded-lg p-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >

              <option value="">Slot</option>

              {timeSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}

            </select>

            <button
              onClick={proposeSlot}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 active:scale-95 transition shadow-sm"
            >
              Schedule Pickup
            </button>

          </div>

        )}

        {request.status === "RESCHEDULE_REQUESTED" && (

          <div className="flex gap-3">

            <button
              onClick={approveReschedule}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Approve Reschedule
            </button>

            <button
              onClick={rejectReschedule}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Reject Reschedule
            </button>

          </div>

        )}

        {request.status === "SCHEDULED" && (

          <div className="flex gap-3">

            <button
              onClick={markCompleted}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-emerald-700 transition"
            >
              Mark Completed
            </button>

            <button
              onClick={reject}
              className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-red-700 transition"
            >
              Cancel Request
            </button>

          </div>

        )}

      </div>

      {/* APPROVE MODAL */}

      {approveConfirm && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white p-6 rounded-lg">

            <h3 className="text-lg font-semibold mb-4">
              Confirm Approval
            </h3>

            <div className="flex gap-3 justify-end">

              <button
                onClick={() => setApproveConfirm(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={approve}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>

            </div>

          </div>

        </div>

      )}

      {/* REJECT MODAL */}

      {rejectModal && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white p-6 rounded-lg w-96">

            <h3 className="text-lg font-semibold mb-4">
              Reject Request
            </h3>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason"
              className="border w-full p-2 mb-4"
            />

            <div className="flex gap-3 justify-end">

              <button
                onClick={() => setRejectModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={reject}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>

            </div>

          </div>

        </div>

      )}

      {/* IMAGE VIEWER MODAL */}

      {selectedImage && (

        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">

          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 text-white text-3xl"
          >
            ✕
          </button>

          <button
            onClick={prevImage}
            className="absolute left-5 text-white text-4xl"
          >
            ‹
          </button>

          <img
            src={getFileUrl(selectedImage)}
            onWheel={handleWheel}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[80vh] max-w-[80vw] rounded-lg shadow-lg transition-transform duration-100"
          />

          <button
            onClick={nextImage}
            className="absolute right-5 text-white text-4xl"
          >
            ›
          </button>

        </div>

      )}
    </div>
  );
}

export default AdminRequestDetails;