import Login from "./components/login";
import { useNakama } from "./context/authContext";

function App() {
  const { isAuthenticated } = useNakama();

  return (
    <>
      <div className="min-h-screen bg-stone-700 w-full m-0 flex items-center justify-center">
        {isAuthenticated ? "Welcome" : <Login />}
      </div>
    </>
  );
}

export default App;
