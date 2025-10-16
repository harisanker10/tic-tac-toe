import { Lobby } from "./components/lobby";
import Login from "./components/login";
import { useNakama } from "./context/authContext";

function App() {
  const { isAuthenticated, user } = useNakama();

  return (
    <div className="min-h-screen bg-stone-700 flex flex-col">
      {/* Header with user info */}
      {user?.email && (
        <div className="w-full bg-stone-800 py-3 px-4 shadow-md">
          <h1 className="text-xl font-bold text-white text-center">
            Welcome, {user.username}
          </h1>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isAuthenticated ? <Lobby /> : <Login />}
      </div>
    </div>
  );
}

export default App;
