// contexts/NakamaContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { Client, Session, type Socket } from "@heroiclabs/nakama-js";

interface User {
  id: string;
  username: string;
  email: string;
}
interface NakamaContextType {
  client: Client;
  session: Session | null;
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<Session>;
  socket: Socket | null;
  logout: () => void;
  loading: boolean;
}

const NakamaContext = createContext<NakamaContextType | undefined>(undefined);
const [TOKEN, REFRESH] = ["NAKAMA_TOKEN", "NAKAMA_REFRESH_TOKEN"];

const serverUrl = "127.0.0.1";
const port = "7350";

export const NakamaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [client] = useState(
    () => new Client("defaultkey", serverUrl, port, false),
  );
  const [state, setState] = useState({
    session: null as Session | null,
    user: null as User | null,
    socket: null as Socket | null,
    loading: true,
  });

  const updateState = (updates: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...updates }));

  const login = async (email: string, password: string): Promise<Session> => {
    try {
      const session = await client.authenticateEmail(
        email,
        password,
        true,
        email.split("@")[0],
      );
      const account = await client.getAccount(session);
      localStorage.setItem(TOKEN, session.token);
      localStorage.setItem(REFRESH, session.refresh_token);
      updateState({
        session,
        user: {
          id: session.user_id || "",
          email: account.email || "",
          username: account.user?.username || "",
        },
      });
      return session;
    } catch (error: any) {
      const data = await error.json();
      console.log({ data });
      throw new Error(data.message);
    }
  };

  const logout = () => {
    state.socket?.disconnect(false);
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(REFRESH);
    updateState({ session: null, user: null, socket: null });
  };

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(TOKEN);
      const refresh = localStorage.getItem(REFRESH);

      if (token && refresh) {
        try {
          const session = await client.sessionRefresh(
            Session.restore(token, refresh),
          );
          const account = await client.getAccount(session);
          localStorage.setItem(TOKEN, session.token);
          localStorage.setItem(REFRESH, session.refresh_token);
          updateState({
            session,
            user: {
              id: account.user?.id || "",
              email: account.email || "",
              username: account.user?.username || "",
            },
          });
        } catch {
          localStorage.removeItem(TOKEN);
          localStorage.removeItem(REFRESH);
        }
      }
      updateState({ loading: false });
    })();
  }, [client]);

  useEffect(() => {
    if (state.session && !state.socket) {
      const socket = client.createSocket();
      socket
        .connect(state.session, true)
        .then(() => updateState({ socket }))
        .catch(logout);
    }
  }, [state.session, client]);

  return (
    <NakamaContext.Provider
      value={{
        client,
        session: state.session,
        socket: state.socket,
        user: state.user,
        isAuthenticated: !!state.session,
        login,
        logout,
        loading: state.loading,
      }}
    >
      {children}
    </NakamaContext.Provider>
  );
};

export const useNakama = () => {
  const context = useContext(NakamaContext);
  if (!context)
    throw new Error("useNakama must be used within a NakamaProvider");
  return context;
};
