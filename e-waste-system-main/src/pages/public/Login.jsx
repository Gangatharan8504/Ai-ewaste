import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("firstName", user.firstName || "");
      localStorage.setItem("lastName", user.lastName || "");
      localStorage.setItem("profilePic", user.profilePic || "");

      if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }

    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.redirectEmail) {
        alert("Your account is not verified. Redirecting you to OTP verification...");
        navigate("/verify-otp", { state: { email: err.response.data.redirectEmail } });
      } else {
        setError(err.response?.data?.message || "Invalid credentials or email not verified.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden">

      <div className="absolute w-96 h-96 bg-emerald-200 opacity-20 rounded-full -top-32 -left-32 blur-3xl"></div>
      <div className="absolute w-96 h-96 bg-emerald-300 opacity-20 rounded-full bottom-0 right-0 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md bg-white p-6 md:p-10 rounded-3xl shadow-2xl border border-gray-100 hover:shadow-emerald-100 transition">

        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="EcoSync Logo"
            className="w-14 h-14 mx-auto mb-3 object-contain drop-shadow-sm"
          />
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            Welcome Back
          </h2>

          <p className="text-gray-500 mt-1 text-sm leading-relaxed">
            Sign in to continue to EcoSync E-Waste Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="text-sm text-gray-500 font-medium">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full mt-2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:shadow-md outline-none transition"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-500 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full mt-2 p-3 pr-14 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:shadow-md outline-none transition"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[60%] -translate-y-1/2 text-gray-500 hover:text-emerald-600 font-semibold text-xs select-none transition"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-emerald-600 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold shadow-md transition
              ${loading
                ? "bg-emerald-400 cursor-not-allowed text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="my-6 border-t border-gray-200"></div>

        <p className="text-sm text-center text-gray-600">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-emerald-600 font-medium cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>

      </div>

    </div>
  );
}

export default Login;