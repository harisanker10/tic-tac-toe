// components/Login.tsx
import React, { useState } from "react";
import { useNakama } from "../context/authContext";

const Login: React.FC = () => {
  const { login, loading, guestLogin } = useNakama();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      console.log("Login successful!");
    } catch (err: any) {
      console.log(err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="nes-container is-centered with-title">
          <p className="title">Loading...</p>
          <div className="nes-balloon from-left">
            <p>Connecting to server...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nes-container with-title is-centered is-dark max-w-md mx-4 sm:max-w-xl">
      <p className="title text-2xl sm:text-3xl md:text-5xl">Login</p>

      {/* Error Message */}
      {error && (
        <div className="nes-container is-error">
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:gap-4 py-6 sm:py-10"
      >
        <div className="nes-field">
          <label htmlFor="email" className="text-sm sm:text-base">
            Email
          </label>
          <input
            type="text"
            id="email"
            className="nes-input is-dark text-sm sm:text-base"
            placeholder="super@heroes.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="nes-field">
          <label htmlFor="password" className="text-sm sm:text-base">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="nes-input is-dark text-sm sm:text-base"
            placeholder="batsignal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="login-buttons mt-6 sm:mt-10 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            type="submit"
            className={`nes-btn is-primary text-sm sm:text-base ${isLoading ? "is-disabled" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="nes-icon coin is-small"></i>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>

          <button
            type="button"
            className="nes-btn is-success text-sm sm:text-base w-full"
            onClick={() => guestLogin()}
            disabled={isLoading}
          >
            Guest Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
