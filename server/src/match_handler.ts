const moduleName = "tic-tac-toe";
interface State {
  emptyTicks: number;
  // ticks since oppenent disconnected
  openTicks: number;
  // userId in label to identify rejoining user's match, open when less than 2 players
  label: { open: boolean; users: string[] /*userId[]*/ };
  // list of presences for dispatching messages
  presences: Record<string, nkruntime.Presence | null>;
  isPlaying: boolean;
  // 3x3 grid represented as flat array [Mark.X, Mark.Y, ...9elts], index => position, value => Mark
  board: Board;
  // enum X or O
  turn: Mark;
  // a list with userId as key and the player mark(X || O) as value
  marks: Record<string, Mark | null>;
  winner: Mark | null;
  winningPosition: (typeof winningPositions)[number] | null;
  // after the game is done, time left for resetting the game
  resetDeadline: number | null;
  //userId[]
  disconnectedUsers: string[];
}

// 3 * rows, 3 * cols, 2 * Diagonals
const winningPositions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const matchInit = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: nkruntime.MatchState; tickRate: number; label: string } {
  const state: State = {
    emptyTicks: 0,
    openTicks: 0,
    label: { open: true, users: [] },
    presences: {},
    marks: {},
    turn: Mark.X,
    board: [...Array(9)].map(() => null),
    isPlaying: false,
    winner: null,
    winningPosition: null,
    resetDeadline: null,
    disconnectedUsers: [],
  };
  return {
    state,
    tickRate: 1,
    label: JSON.stringify({ open: true, userIds: [] }),
  };
};

/*
 - Accept iff rejoin or state.open 
 - Dispatcher cannot be used to send state to client in this context, so is done in matchJoin method
*/
const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
): { state: nkruntime.MatchState; accept: boolean } {
  const disconnectedUserIndex: number =
    ctx.userId &&
    state.disconnectedUsers !== null &&
    state.disconnectedUsers.indexOf(ctx.userId);

  let accept = false;
  if (typeof disconnectedUserIndex === "number" && disconnectedUserIndex >= 0) {
    accept = true;
  }
  if (state.label.open && totalConnectedPlayers(state) < 2) {
    accept = true;
  }
  return {
    state,
    accept,
  };
};

const matchJoin = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  matchState: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  const state = matchState as State;

  // invalid players are filtered out at matchJoinAttempt so we can safely update presences

  presences.forEach(function (p) {
    state.presences[p.userId] = p;
    // check if the presence is a rejoin
    const disconnectedUserIndex = state.disconnectedUsers.indexOf(p.userId);
    if (disconnectedUserIndex >= 0) {
      const message: UpdateMessage = {
        board: state.board,
        marks: state.marks,
        turn: state.turn,
        resetDeadline: state.resetDeadline,
        winner: state.winner!,
        winningPosition: state.winningPosition,
      };

      (state as State).disconnectedUsers?.splice(disconnectedUserIndex, 1);
      dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(message), [p]);
    }
  });

  // Open implies there are no disconnected users, match is only marked as open after openTicks > setvalue
  // Check if we have 2 players and is open
  if (
    totalConnectedPlayers(state) === 2 &&
    !state.isPlaying &&
    state.label.open
  ) {
    state.label.open = false;
    state.label.users = Object.keys(state.presences);
    dispatcher.matchLabelUpdate(JSON.stringify(state.label));

    resetBoard(state as State);
    state.isPlaying = true;
    const MARKS = [Mark.X, Mark.O];
    const marks: Record<string, Mark | null> = {};
    Object.keys(state.presences).forEach((userId, index) => {
      marks[userId] = MARKS[index];
    });
    state.marks = marks;

    const message: StartMessage = {
      board: state.board,
      marks,
      turn: Mark.X,
    };
    dispatcher.broadcastMessage(OpCode.START, JSON.stringify(message));
  }

  return {
    state,
  };
};

const matchLeave = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  matchState: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  const state = matchState as State;

  presences.forEach((p) => {
    const isForfeit =
      p.reason?.toString() ===
      nkruntime.PresenceReason.PresenceReasonLeave.toString();

    if (isForfeit) {
      state.label.open = true;
      state.label.users = state.label.users.filter((id) => id !== p.userId);
      dispatcher.matchLabelUpdate(JSON.stringify(state.label));
      state.isPlaying = false;
      resetBoard(state);
      deleteUserFromState(p.userId, state);
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ error: "Player forfeited", userId: p.userId }),
      );
    }

    if (!isForfeit) {
      state.disconnectedUsers?.push(p.userId);
      delete state.presences[p.userId];
    }
  });

  return { state };
};

const matchLoop = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  matchState: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[],
): { state: nkruntime.MatchState } | null {
  const state = matchState as State;
  // logger.debug(
  //   `Total connected players: ${totalConnectedPlayers(state)}, open: ${state.label.open}`,
  // );
  // logger.debug(`isPlaying: ${state.isPlaying}`);
  // logger.debug(`open: ${state.label.open}`);
  // logger.debug(`board: ${state.board.join(" | ")}`);

  if (totalConnectedPlayers(state) === 0) {
    state.emptyTicks++;
  }
  if (totalConnectedPlayers(state) === 1 && !state.label.open) {
    state.openTicks++;
  }
  // if open for 10 ticks -> player disconnected treshold reached -> update the match state and label
  if (state.openTicks >= 10 && !state.label.open) {
    state.label.open = true;
    state.label.users = Object.keys(state.presences);
    state.disconnectedUsers = [];
    dispatcher.matchLabelUpdate(JSON.stringify(state.label));
    state.openTicks = 0;
    dispatcher.broadcastMessage(
      OpCode.REJECTED,
      JSON.stringify({ error: "Player forfeited" }),
    );
  }
  // kill game if no players for 100 ticks
  if (state.emptyTicks > 100) {
    return null;
  }

  // if game is done and deadline reached restart the game
  if (state?.resetDeadline !== null && state?.resetDeadline <= Date.now()) {
    resetBoard(state);
    state.isPlaying = true;
    switchMarks(state);
    if (totalConnectedPlayers(state) === 2) {
      const message: StartMessage = {
        board: state.board,
        marks: state.marks,
        turn: state.turn,
      };
      dispatcher.broadcastMessage(OpCode.START, JSON.stringify(message));
    } else {
      logger.error(
        `ending match due to forfeited, total players: ${totalConnectedPlayers(state)}`,
      );
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ error: "Player forfeited" }),
      );
      return null;
    }
    return { state };
  }

  if (state.isPlaying) {
    messages.forEach((message) => {
      let msg = {} as MoveMessage;

      try {
        msg = JSON.parse(nk.binaryToString(message.data));
      } catch (error) {
        // Client sent bad data.
        dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
        logger.debug("Bad data received: %v", error);
      }
      if (message.opCode === OpCode.MOVE) {
        // chech if its senders turn else reject
        if (state.turn !== state.marks[message.sender.userId]) {
          dispatcher.broadcastMessage(
            OpCode.REJECTED,
            JSON.stringify({ error: "Can't make a move when oppenent's turn" }),
          );
          return { state };
        }
        // check if position is valid
        if (state.board[msg.position] !== null) {
          dispatcher.broadcastMessage(
            OpCode.REJECTED,
            JSON.stringify({ error: "Position already played" }),
          );
          return { state };
        }

        // update board and turn
        state.board[msg.position] = state.marks[message.sender.userId];
        state.turn = state.turn === Mark.X ? Mark.O : Mark.X;

        const updateMessage: UpdateMessage = {
          board: state.board,
          turn: state.turn,
        };

        dispatcher.broadcastMessage(
          OpCode.UPDATE,
          JSON.stringify(updateMessage),
        );

        // check win
        const winData = findWinner(state.board);
        if (!winData) return;

        // match is done
        // reset match in 20s
        state.resetDeadline = Date.now() + 20000;
        state.isPlaying = false;

        if ("mark" in winData) {
          state.winner = winData.mark;
          state.winningPosition = winData.winningPosition;
          const [winnerUserId] = Object.keys(state.marks).filter(
            (userId) => state.marks[userId] === state.winner,
          );
          if (winnerUserId) {
            const acc = nk.accountGetId(winnerUserId);
            // leaderboards only for registered accounts
            if (acc.email) {
              nk.leaderboardRecordWrite(
                LEADERBOARD_ID,
                winnerUserId,
                undefined,
                10,
              );
            }
          }
        }
        if ("draw" in winData) {
          Object.keys(state.marks).forEach((userId) => {
            const acc = nk.accountGetId(userId);
            // leaderboards only for registered accounts
            if (acc.email) {
              nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, undefined, 5);
            }
          });
        }

        const doneMeassage: DoneMessage = {
          board: state.board,
          winner: state.winner,
          winnerPositions: state.winningPosition,
          resetDeadline: state.resetDeadline,
        };

        dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMeassage));
      }
    });
  }

  return {
    state,
  };
};

let matchTerminate: nkruntime.MatchTerminateFunction<nkruntime.MatchState> =
  function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    graceSeconds: number,
  ) {
    return { state };
  };

let matchSignal: nkruntime.MatchSignalFunction<nkruntime.MatchState> =
  function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
  ) {
    return { state };
  };

const totalConnectedPlayers = (state: nkruntime.MatchState) => {
  return Object.keys(state.presences).length || 0;
};

const findWinner = (
  board: Board,
):
  | {
      mark: Mark | null;
      winningPosition: (typeof winningPositions)[number];
    }
  | { draw?: boolean }
  | null => {
  for (const position of winningPositions) {
    const [a, b, c] = position;
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a], winningPosition: position };
    }
  }
  if (board.every((m) => m !== null)) return { draw: true };
  return null;
};

const resetBoard = (state: State): void => {
  state.board = [...Array(9)].map(() => null);
  state.resetDeadline = null;
  state.winner = null;
  state.winningPosition = null;
  state.turn = Mark.X;
};

const switchMarks = (state: State): void => {
  const [user1, user2] = Object.keys(state.marks);
  if (user1 && user2) {
    state.marks[user1] = state.marks[user1]! + state.marks[user2]!;
    state.marks[user2] = state.marks[user1]! - state.marks[user2]!;
    state.marks[user1] = state.marks[user1]! - state.marks[user2]!;
  }
};

const deleteUserFromState = (userId: string, state: State) => {
  delete state.presences[userId];
  delete state.marks[userId];
};
