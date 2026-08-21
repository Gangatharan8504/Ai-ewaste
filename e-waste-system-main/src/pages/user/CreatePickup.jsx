import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import api from "../../services/api";
import LocationPicker from "../../components/LocationPicker";

function CreatePickup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    deviceType: "",
    brand: "",
    model: "",
    condition: "",
    quantity: 1,
    pickupAddress: "",
    remarks: ""
  });

  const [coordinates, setCoordinates] = useState({
    latitude: "",
    longitude: ""
  });

  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Verification Modal States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const fieldSuggestions = {
    deviceType: ["Laptop", "Smartphone", "Monitor", "Television", "Keyboard/Mouse", "Charger/Battery"],
    brand: ["Samsung", "Apple", "Dell", "HP", "Lenovo", "Sony"],
    condition: ["Working", "Broken Screen", "Dead (No Power)", "Obsolete"]
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (response.data && response.data.address) {
          setFormData((prev) => ({
            ...prev,
            pickupAddress: response.data.address
          }));
        }
      } catch (err) {
        console.error("Failed to load user profile address", err);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLocationSelect = (lat, lng) => {
    setCoordinates({
      latitude: lat,
      longitude: lng
    });
  };

  const handleAddressUpdate = (address) => {
    setFormData((prev) => ({
      ...prev,
      pickupAddress: address
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = [];
    let err = "";

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        err = "Unsupported file format. Please upload JPEG, PNG, or WEBP images.";
      } else if (file.size > maxSize) {
        err = "Image size must not exceed 5MB.";
      } else {
        validFiles.push(file);
      }
    });

    if (err) {
      setMessage(err);
      return;
    }

    setMessage("");
    const updatedImages = [...images, ...validFiles];
    setImages(updatedImages);

    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);

    e.target.value = null;
  };

  const removeImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setImages(updatedImages);
    setPreviews(updatedPreviews);
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      setMessage("Please upload at least one image of the electronic item.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });

      data.append("pickupLat", coordinates.latitude);
      data.append("pickupLng", coordinates.longitude);

      images.forEach((img) => {
        data.append("images", img);
      });

      const response = await api.post("/requests", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data.requiresOtp && response.data.requestId) {
        setCreatedRequestId(response.data.requestId);
        setShowOtpModal(true);
        setResendCooldown(30);
      } else {
        navigate("/user/my-requests", { state: { message: "Your e-waste pickup request has been successfully submitted!" } });
      }

    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      await api.post(`/requests/${createdRequestId}/verify-submission-otp`, { otp: otpCode.trim() });
      setOtpSuccess(true);
      setTimeout(() => {
        navigate("/user/my-requests", { state: { message: "Pickup request verified and submitted successfully!" } });
      }, 1200);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP. Please check the code in your email.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    try {
      await api.post(`/requests/${createdRequestId}/resend-submission-otp`);
      setResendCooldown(30);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-500 py-12 text-white text-center shadow-md">
        <h1 className="text-3xl font-bold tracking-wide">
          Create E-Waste Pickup Request
        </h1>
        <p className="mt-2 text-sm opacity-90">
          Schedule safe and eco-friendly disposal of your electronic waste
        </p>
      </div>

      <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 mt-6 md:mt-10 mb-8 md:mb-12 rounded-2xl shadow-xl border border-gray-100">

        {message && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-650 p-4 rounded-xl text-center text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Form Spec Input Fields */}
          {["deviceType", "brand", "model", "condition"].map((field) => (
            <div key={field} className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {field === "deviceType" ? "Device Type" : field.replace(/([A-Z])/g, " $1")}
              </label>
              <input
                type="text"
                name={field}
                placeholder={`Enter ${field === "deviceType" ? "Device Type" : field.replace(/([A-Z])/g, " $1")}`}
                value={formData[field]}
                onChange={handleChange}
                required
                className="w-full border border-gray-350 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm"
              />
              {/* Suggestion Chips */}
              {fieldSuggestions[field] && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {fieldSuggestions[field].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, [field]: suggestion }))}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
                        formData[field] === suggestion
                          ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Quantity */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Quantity (Units)
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              max="100"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="w-full border border-gray-350 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm"
            />
          </div>

          {/* Location Picker Module */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Pickup Location (Pin on Map)
            </label>
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              onAddressUpdate={handleAddressUpdate}
              initialAddress={formData.pickupAddress}
            />
          </div>

          {/* Address Text Area */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Full Pickup Address
            </label>
            <textarea
              name="pickupAddress"
              placeholder="Full street address, landmark, city, pincode"
              value={formData.pickupAddress}
              onChange={handleChange}
              rows="3"
              required
              className="w-full border border-gray-350 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm"
            />
          </div>

          {/* Remarks / Additional Notes */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Special Instructions / Remarks (Optional)
            </label>
            <textarea
              name="remarks"
              placeholder="e.g. Call before arrival, 2nd floor, missing power cable..."
              value={formData.remarks}
              onChange={handleChange}
              rows="2"
              className="w-full border border-gray-350 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm"
            />
          </div>

          {/* Device Images */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Upload Device Images (Max 5 images) *
            </label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="w-full border border-gray-350 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-3">
                {previews.map((src, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden shadow-md border"
                  >
                    <img
                      src={src}
                      alt="preview"
                      className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-black bg-opacity-60 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs hover:bg-red-650 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition shadow-md disabled:opacity-60 cursor-pointer font-bold"
            >
              {loading ? "Submitting..." : "Submit Pickup Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/user/dashboard")}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 transition shadow-sm cursor-pointer font-bold"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>

      {/* OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 text-center animate-scale-in border border-emerald-100">
            
            {otpSuccess ? (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Request Verified!</h3>
                <p className="text-sm text-gray-500">
                  Your pickup request has been verified and submitted to our admin team.
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
                  We have sent a <strong>6-digit OTP code</strong> to your registered email address to verify this pickup request.
                </p>

                {otpError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs font-medium">
                    {otpError}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      autoFocus
                      required
                      className="w-full text-center text-2xl tracking-[0.4em] font-mono py-3 px-4 border-2 border-emerald-500 rounded-xl focus:ring-4 focus:ring-emerald-100 outline-none transition font-bold text-gray-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.length !== 6}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition shadow-md font-bold text-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {otpLoading ? "Verifying..." : (
                      <>
                        Verify & Confirm Pickup <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="text-emerald-700 font-semibold hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={13} className={resendCooldown > 0 ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/user/my-requests")}
                    className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                  >
                    Verify Later
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default CreatePickup;