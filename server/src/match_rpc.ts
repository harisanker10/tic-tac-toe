let rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  const matches = nk.matchList(10, true, null, 1, 1);
  const existingMatchIds = matches.map((m) => m.matchId);

  if (existingMatchIds.length === 0) {
    const newMatchId = nk.matchCreate(moduleName);
    existingMatchIds.push(newMatchId);
  }

  return JSON.stringify({ matchIds: existingMatchIds });
};

let rpcFindOngoingMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  const query = `+label.user0:${ctx.userId} +label.user1:${ctx.userId}`;
  const matches = nk.matchList(1, true, query);

  logger.debug(
    `Total ongoing matches ${matches.length} for user ${ctx.userId}`,
  );

  return JSON.stringify({
    matchIds: matches.map((m) => m.matchId),
  });
};
