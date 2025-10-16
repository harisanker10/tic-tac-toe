import React, { createContext, useContext, useEffect, useState } from "react";
import { useNakama } from "./authContext";
import {
  Mark,
  OpCode,
  winningPositions,
  type Board,
  type DoneMessage,
  type StartMessage,
  type UpdateMessage,
} from "../lib/types";

interface MatchContextType {
  isFinding: boolean;
  findMatch: () => Promise<void>;
  isPlaying: boolean;
  board: Board | null;
  leaveMatch: () => Promise<void>;
  opponent: {
    username: string;
    id: string;
    mark: Mark;
    isOffline: boolean;
  } | null;
  mark: Mark | null;
  makeMove: (pos: number) => Promise<void>;
  resetDeadline: number | null;
  currentTurn: Mark | null;
  error: string | null;
  winStatus: {
    winner: Mark;
    position: (typeof winningPositions)[number];
  } | null;
}

const NakamaContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, socket, client } = useNakama();
  const [isFinding, setIsFinding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // const [currentMatch,setCurrentMatch ] = useState<string | null>(null)
  const [opponent, setOpponent] = useState<{
    username: string;
    mark: Mark;
    id: string;
    isOffline: boolean;
  } | null>(null);
  const [winStatus, setWinStatus] = useState<
    MatchContextType["winStatus"] | null
  >(null);
  const [board, setBoard] = useState<Board>([...Array(9)].map(() => null));
  const [mark, setMark] = useState<Mark | null>(null);
  const [currentTurn, setCurrentTurn] = useState<Mark | null>(null);
  const [resetDeadline, setResetDeadline] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (session) {
        //TODO: fetch with userId query
        const matches = await client.listMatches(session);
        try {
          const match = matches.matches
            ?.map((m) => ({
              id: m.match_id,
              label: m.label ? JSON.parse(m.label) : {},
            }))
            .find((l) => l.label.users?.includes(session.user_id));
          console.log({ existingMatch: match });
          const matchId = match?.id;
          if (matchId) {
            setMatchId(matchId);

            if (socket) {
              console.log("rejoining...");
              await socket.joinMatch(matchId).catch((err) => console.log(err));
            } else {
              console.log("no socket");
            }
            setIsPlaying(true);
            setIsFinding(false);
          }
        } catch (error) {
          console.log(error);
        }
      }
    })();
  }, [session, client, socket]);

  const findMatch = async (): Promise<any> => {
    if (!session) throw new Error("Not authenticated");

    setIsFinding(true);
    try {
      const result = await client.rpc(session, "find_match", {});
      console.log({ result });
      //selecting the first match the server returns
      //@ts-ignore
      const matchId = result?.payload?.matchIds[0] as string;
      socket?.joinMatch(matchId).catch((err) => console.log(err));
      setMatchId(matchId);
      return result;
    } catch (error) {
      console.error("Matchmaking failed:", error);
      throw error;
    }
  };

  const makeMove = async (pos: number) => {
    if (!socket) {
      return;
    }
    const data = { position: pos };
    console.log({ matchId, data });
    await socket.sendMatchState(matchId!, OpCode.MOVE, JSON.stringify(data));
    console.log("Match data sent");
  };

  const leaveMatch = async () => {
    matchId &&
      (await socket?.leaveMatch(matchId!).catch((err) => console.log(err)));
    setIsPlaying(false);
  };

  if (socket) {
    socket.onmatchdata = (data) => {
      const json_string = new TextDecoder().decode(data.data);
      const payload: any = json_string ? JSON.parse(json_string) : "";
      console.log("op_code: ", data.op_code);

      console.log({ matchState: payload });
      switch (data.op_code) {
        case OpCode.START: {
          const startData = payload as StartMessage;
          setBoard(startData.board);
          setCurrentTurn(startData.turn);
          setWinStatus(null);
          Object.entries(startData.marks).forEach(async ([user_id, mark]) => {
            if (user_id === session!.user_id!) {
              setMark(startData.marks[session!.user_id!]);
            } else {
              const opponent = await client
                .getUsers(session!, [user_id])
                .then((d) => d.users && d.users[0]);
              if (opponent) {
                setOpponent({
                  id: opponent.id!,
                  username: opponent.username!,
                  mark: mark!,
                  isOffline: false,
                });
              }
            }
          });

          setIsPlaying(true);
          setIsFinding(false);
          break;
        }
        case OpCode.UPDATE: {
          setError(null);
          const updateData = payload as UpdateMessage;
          setBoard(updateData.board);
          setCurrentTurn(updateData.turn);
          setIsPlaying(true);
          if (updateData.winner) {
            setWinStatus({
              winner: updateData.winner,
              position: updateData.winningPosition as any,
            });
          }
          if (updateData.resetDeadline) {
            setResetDeadline(updateData.resetDeadline);
          }
          Object.entries(updateData.marks).forEach(async ([user_id, mark]) => {
            if (user_id === session!.user_id!) {
              setMark(updateData.marks[session!.user_id!]);
            } else {
              const updatedOpp =
                opponent?.id !== user_id &&
                (await client
                  .getUsers(session!, [user_id])
                  .then((d) => d.users && d.users[0]));
              if (updatedOpp) {
                setOpponent({
                  id: updatedOpp.id!,
                  username: updatedOpp.username!,
                  mark: mark!,
                  isOffline: false,
                });
              }
            }
          });

          if (Number.isInteger(updateData.winner) && updateData.winningPosition)
            setWinStatus({
              winner: updateData.winner!,
              position: updateData.winningPosition,
            });
          if (updateData.resetDeadline)
            setResetDeadline(updateData.resetDeadline);

          break;
        }
        case OpCode.DONE: {
          const doneData = payload as DoneMessage;
          setBoard(doneData.board);
          setWinStatus({
            position: doneData.winnerPositions!,
            winner: doneData.winner!,
          });
          setResetDeadline(doneData.resetDeadline);
          break;
        }
        case OpCode.REJECTED: {
          if (
            payload.error === "Player forfeited" &&
            payload?.userId !== session?.user_id
          ) {
            if (isPlaying) {
              setIsFinding(true);
              setIsPlaying(false);
            }
          }
          payload.error && setError(payload.error);
          setError(payload.error);
          break;
        }
        default:
          break;
      }
    };

    socket.onmatchpresence = (presence) => {
      if (opponent) {
        if (presence?.leaves?.length) {
          const leftOpp = presence.leaves.find(
            (player) => player.user_id !== session?.user_id,
          );
          if (leftOpp) {
            setOpponent({ ...opponent, isOffline: true });
          }
        }

        if (presence?.joins?.length) {
          const opponentJoined = presence.joins.find(
            (player) => player.user_id !== session?.user_id,
          );
          if (opponentJoined) {
            setOpponent({
              ...opponent,
              isOffline: false,
            });
          }
        }
      }
    };
  }

  const value: MatchContextType = {
    findMatch,
    leaveMatch,
    isFinding,
    isPlaying,
    board,
    mark,
    error,
    opponent,
    currentTurn,
    makeMove,
    winStatus,
    resetDeadline,
  };

  return (
    <NakamaContext.Provider value={value}>{children}</NakamaContext.Provider>
  );
};

export const useMatch = (): MatchContextType => {
  const context = useContext(NakamaContext);
  if (context === undefined) {
    throw new Error("useNakama must be used within a NakamaProvider");
  }
  return context;
};
