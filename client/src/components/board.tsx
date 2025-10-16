import { useEffect, useState } from "react";
import { useNakama } from "../context/authContext";
import { useMatch } from "../context/matchContext";
import { Mark } from "../lib/types";

export function Board() {
  const { user } = useNakama();
  const {
    opponent,
    board,
    mark,
    makeMove,
    currentTurn,
    leaveMatch,
    winStatus,
    resetDeadline,
  } = useMatch();
  const [timeLeft, setTimeLeft] = useState<number | null>(resetDeadline);
  const [optimisticBoard, setOptimisticBoard] = useState(board || []);

  useEffect(() => {
    if (!resetDeadline) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const seconds = Math.ceil((resetDeadline - Date.now()) / 1000);
      setTimeLeft(seconds > 0 ? seconds : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [resetDeadline]);
  useEffect(() => {
    setOptimisticBoard(board || []);
  }, [board]);
  const handleClick = async (pos: number) => {
    const optimisticBoardUpdate = [...optimisticBoard];
    optimisticBoard[pos] = mark;
    setOptimisticBoard(optimisticBoardUpdate);
    await makeMove(pos);
  };
  return (
    <div className="max-w-md mx-auto p-4">
      {/* Players Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="nes-container is-rounded with-title is-centered bg-white">
          <p className="title">You</p>
          <p className="text-lg font-bold text-blue-600">
            {user?.username} {mark === Mark.X ? "X" : "O"}
          </p>
        </div>
        <div className="nes-container is-rounded with-title is-centered bg-white">
          <p className="title">Opponent</p>
          {opponent?.isOffline && <p className="title">(offline)</p>}
          <p className="text-lg font-bold text-red-600">
            {!opponent ? (
              "Finding opponent"
            ) : (
              <>
                {opponent?.username} {opponent?.mark === Mark.X ? "X" : "O"}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-3 gap-1 w-fit mx-auto mb-6">
        {optimisticBoard?.length &&
          optimisticBoard.map((mark, index) => (
            <button
              key={index}
              className="w-20 h-20 border-2 border-gray-400 bg-white hover:bg-gray-50 flex items-center justify-center text-2xl font-bold"
              onClick={() => handleClick(index)}
            >
              {mark === Mark.X ? "X" : mark === Mark.O ? "O" : ""}
            </button>
          ))}
      </div>

      <div className="text-center mb-6">
        <div className="nes-container is-rounded bg-white p-3">
          <p className="text-sm font-bold">
            {winStatus?.winner !== undefined ? (
              <>
                {winStatus.winner === null
                  ? "Game Draw!"
                  : winStatus.winner === mark
                    ? "You Won! 🎉"
                    : "You Lost!"}
                <br />
                {timeLeft !== null && ` Resetting in ${timeLeft}s`}
              </>
            ) : currentTurn === mark ? (
              "Your Turn"
            ) : (
              "Opponent's Turn"
            )}
          </p>
        </div>
      </div>

      {/* Game Controls */}
      <div className="flex justify-center gap-4">
        <button
          type="button"
          className="nes-btn is-error"
          onClick={() => leaveMatch()}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
