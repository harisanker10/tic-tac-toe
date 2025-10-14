// contexts/NakamaContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Client, Session } from "@heroiclabs/nakama-js";

interface NakamaContextType {
  client: Client;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  loading: boolean;
}

const NakamaContext = createContext<NakamaContextType | undefined>(undefined);

export const NakamaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [client] = useState(
    () => new Client("defaultkey", "127.0.0.1", "7350", false),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string): Promise<Session> => {
    try {
      const newSession = await client.authenticateEmail(email, password);
      setSession(newSession);
      return newSession;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setSession(null);
  };

  // Optional: Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      // You might want to check localStorage for stored session
      const storedSession = localStorage.getItem("nakama_session");
      if (storedSession) {
        try {
          const sessionObj = JSON.parse(storedSession);
          // Verify session is still valid
          setSession(sessionObj);
        } catch (error) {
          localStorage.removeItem("nakama_session");
        }
      }
      setLoading(false);
    };

    checkExistingSession();
  }, []);

  // Store session in localStorage when it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem("nakama_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("nakama_session");
    }
  }, [session]);

  const value: NakamaContextType = {
    client,
    session,
    isAuthenticated: !!session,
    login,
    logout,
    loading,
  };

  return (
    <NakamaContext.Provider value={value}>{children}</NakamaContext.Provider>
  );
};

export const useNakama = (): NakamaContextType => {
  const context = useContext(NakamaContext);
  if (context === undefined) {
    throw new Error("useNakama must be used within a NakamaProvider");
  }
  return context;
};
