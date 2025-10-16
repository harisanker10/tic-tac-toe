// Use const objects instead of enums for better serialization
export const Mark = {
  X: 0,
  O: 1,
} as const;
export type Mark = (typeof Mark)[keyof typeof Mark];

export const OpCode = {
  START: 1,
  UPDATE: 2,
  DONE: 3,
  MOVE: 4,
  REJECTED: 5,
} as const;
export type OpCode = (typeof OpCode)[keyof typeof OpCode];

export type BoardPosition = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Board = (Mark | null)[];

// Define winning positions for the client too
export const winningPositions = [
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

export interface StartMessage {
  board: Board;
  marks: { [userID: string]: Mark | null };
  turn: Mark;
}

export interface UpdateMessage {
  board: Board;
  marks: Record<string, Mark>;
  turn: Mark;
  winner?: Mark;
  winningPosition?: (typeof winningPositions)[number] | null;
  resetDeadline?: number | null;
}

export interface DoneMessage {
  board: Board;
  winner: Mark | null;
  winnerPositions: (typeof winningPositions)[number] | null;
  resetDeadline: number;
}

export interface MoveMessage {
  position: BoardPosition;
}

export interface RpcFindMatchRequest {
  fast: boolean;
}

export interface RpcFindMatchResponse {
  matchIds: string[];
}

export type Message =
  | StartMessage
  | UpdateMessage
  | DoneMessage
  | MoveMessage
  | RpcFindMatchRequest
  | RpcFindMatchResponse;
