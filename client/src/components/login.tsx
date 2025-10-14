// components/Login.tsx
import React, { useState } from "react";
import { useNakama } from "../context/authContext";

const Login: React.FC = () => {
  const { login, loading } = useNakama();
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
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setIsLoading(true);

    try {
      await login(demoEmail, demoPassword);
      console.log("Demo login successful!");
    } catch (err: any) {
      setError(err.message || "Demo login failed.");
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
    <div className="nes-container with-title is-centered is-dark max-w-xl">
      <p className="title text-5xl">Login</p>

      {/* Error Message */}
      {error && (
        <div className="nes-container is-error">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-10">
        <div className="nes-field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className="nes-input is-dark"
            placeholder="super@heroes.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="nes-field">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            className="nes-input is-dark"
            placeholder="batsignal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="login-buttons mt-10">
          <button
            type="submit"
            className={`nes-btn is-primary ${isLoading ? "is-disabled" : ""}`}
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
            className="nes-btn is-success"
            onClick={() => handleDemoLogin("super@heroes.com", "batsignal")}
            disabled={isLoading}
          >
            Use Demo Account
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
