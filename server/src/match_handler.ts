const moduleName = "tic-tac-toe";
interface State {
  emptyTicks: number;
  presences: Record<string, nkruntime.Presence | null>;
  isPlaying: boolean;
  board: Board;
  turn: Mark;
  marks: Record<string, Mark | null>;
  winner: Mark | null;
  winningPosition: (typeof winningPositions)[number] | null;
  resetDeadline: number | null;
}

const winningPositions = [
  // rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // diagonals
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
    presences: {},
    marks: {},
    turn: Mark.X,
    board: [...Array(9)].map(() => null),
    isPlaying: false,
    winner: null,
    winningPosition: null,
    resetDeadline: null,
  };
  return {
    state,
    tickRate: 1,
    label: JSON.stringify({ userIds: [] }),
  };
};

const matchJoin = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  presences.forEach(function (p) {
    state.presences[p.userId] = p;
  });

  //rejoin
  if (ctx.userId && ctx.userId in (state as State).presences) {
    return { state };
  }

  // check if we have enough players
  if (totalConnectedPlayers(state) === 2 && !state.isPlaying) {
    // start match
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

    const label: Record<string, string> = {};

    Object.keys(state.presences).forEach((userId, index) => {
      label[`user${index}`] = userId;
    });

    dispatcher.matchLabelUpdate(JSON.stringify(label));
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
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  presences.forEach(function (p) {
    delete state.presences[p.userId];
  });

  return {
    state,
  };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
): { state: nkruntime.MatchState; accept: boolean } {
  logger.debug("Match joinining attempt");
  //rejoin
  if (ctx.userId && ctx.userId in (state as State).presences) {
    const message: UpdateMessage = {
      board: state.board,
      marks: state.marks,
      turn: state.turn,
      winner: state.winner,
      resetDeadline: state.resetDeadline,
      winningPosition: state.winningPosition,
    };

    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(message));
    return { state, accept: true };
  }
  const accept = totalConnectedPlayers(state) < 2 ? true : false;
  return {
    state,
    accept,
  };
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
  // If we have no presences in the match according to the match state, increment the empty ticks count
  if (totalConnectedPlayers(state) === 0) {
    state.emptyTicks++;
  }
  if (state.emptyTicks > 100) {
    return null;
  }

  if (state.isPlaying) {
    if (state.resetDeadline !== null && state?.resetDeadline <= Date.now()) {
      state.board = [...Array(9)].map(() => null);
      state.resetDeadline = null;
      state.winner = null;
      state.winningPosition = null;
      const [user1, user2] = Object.keys(state.marks);
      state.marks[user1] = state.marks[user1]! + state.marks[user2]!;
      state.marks[user2] = state.marks[user1]! - state.marks[user2]!;
      state.marks[user1] = state.marks[user1]! - state.marks[user2]!;
      state.turn = Mark.X;
      const message: StartMessage = {
        board: state.board,
        marks: state.marks,
        turn: state.turn,
      };
      dispatcher.broadcastMessage(OpCode.START, JSON.stringify(message));
      return { state };
    }

    if (state.winner !== null) {
      return { state };
    }

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

        const winData = findWinner(state.board);

        // check win
        if (winData && "mark" in winData) {
          logger.debug("Won: " + winData.mark);

          state.winner = winData.mark;
          state.winningPosition = winData.winningPosition;
          state.resetDeadline = Date.now() + 30000;

          const doneMeassage: DoneMessage = {
            board: state.board,
            winner: winData.mark,
            winnerPositions: winData.winningPosition,
            resetDeadline: state.resetDeadline,
          };
          dispatcher.broadcastMessage(
            OpCode.DONE,
            JSON.stringify(doneMeassage),
          );
        }

        // check draw
        if (winData && "draw" in winData) {
          logger.debug("draw");
          state.resetDeadline = Date.now() + 30000;
          const doneMeassage: DoneMessage = {
            board: state.board,
            winner: null,
            winnerPositions: null,
            resetDeadline: state.resetDeadline,
          };
          dispatcher.broadcastMessage(
            OpCode.DONE,
            JSON.stringify(doneMeassage),
          );
        }

        logger.debug("No win data");
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
