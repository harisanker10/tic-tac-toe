import { useEffect, useState } from "react";
import { useNakama } from "../context/authContext";
import { useMatch } from "../context/matchContext";
import { Board } from "./board";
import { LEADERBOARD_ID } from "../lib/types";
import { Leaderboard } from "./leaderboard";

export const Lobby = () => {
  const { isPlaying, findMatch, isFinding } = useMatch();
  const { client, session } = useNakama();
  const [scoreboardOpen, setScoreBoardOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    client
      .listLeaderboardRecords(session, LEADERBOARD_ID)
      .then((d) => console.log({ d }));
  }, [session, client]);

  const handleFindMatch = () => {
    findMatch()
      .then((match) => {
        console.log("Match found:", match);
      })
      .catch((error) => {
        console.error("Matchmaking failed:", error);
      });
  };

  if (isPlaying || isFinding) {
    return <Board />;
  }
  if (scoreboardOpen) {
    return <Leaderboard onExit={() => setScoreBoardOpen(false)} />;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Game Lobby</h1>
        <p className="text-gray-300">Find opponents and start playing</p>
      </div>

      {/* Main Content */}
      <div className="nes-container is-rounded bg-white shadow-lg p-6">
        {/* Status Section */}
        <div className="text-center mb-6">
          <div className="mb-4">
            <i
              className={`nes-icon is-large ${isFinding ? "loading" : "heart"}`}
            ></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isFinding ? "Finding Opponents..." : "Ready to Play"}
          </h2>
          <p className="text-gray-600 text-sm">
            {isFinding
              ? "Searching for the perfect match..."
              : "Click the button below to start matchmaking"}
          </p>
        </div>

        {/* Matchmaking Button */}
        <div className="text-center flex flex-col gap-2">
          <button
            type="button"
            className={`nes-btn is-primary w-full ${isFinding ? "is-disabled" : ""}`}
            onClick={handleFindMatch}
            disabled={isFinding}
          >
            {isFinding ? (
              <span className="flex items-center justify-center">
                <i className="nes-icon loading is-small mr-2"></i>
                Finding Match...
              </span>
            ) : (
              "Find Match"
            )}
          </button>
          <button
            type="button"
            className={`nes-btn is-secondary w-full`}
            onClick={() => setScoreBoardOpen(true)}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center mt-6">
        <p className="text-gray-400 text-xs">
          Matchmaking usually takes 10-30 seconds
        </p>
      </div>
    </div>
  );
};
