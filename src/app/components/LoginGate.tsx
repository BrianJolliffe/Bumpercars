import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface LoginGateProps {
  children: React.ReactNode;
}

const VALID_USERNAME = "vantage";
const VALID_PASSWORD = "prototype";

export function LoginGate({ children }: LoginGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Invalid username or password");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm transition-transform ${isShaking ? "animate-shake" : ""}`}
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Logo / Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-full bg-[#f26318]/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-[#f26318]" />
            </div>
            <h1 className="text-gray-900" style={{ fontSize: '20px', fontWeight: 600 }}>Campaign List Prototype</h1>
            <p className="text-gray-500 mt-1" style={{ fontSize: '14px' }}>Enter credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-gray-700 mb-1.5" style={{ fontSize: '13px', fontWeight: 500 }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] transition-colors"
                style={{ fontSize: '14px' }}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 mb-1.5" style={{ fontSize: '13px', fontWeight: 500 }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f26318]/30 focus:border-[#f26318] transition-colors pr-10"
                  style={{ fontSize: '14px' }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500" style={{ fontSize: '13px' }}>{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#f26318] hover:bg-[#d95615] text-white transition-colors cursor-pointer"
              style={{ fontSize: '14px', fontWeight: 500 }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}