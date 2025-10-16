let rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  const limit = 10;
  const isAuthoritative = true;
  const label = "open=true";
  const minSize = null;
  const maxSize = null;
  const matches = nk.matchList(
    limit,
    isAuthoritative,
    label,
    minSize,
    maxSize,
    "",
  );
  const existingMatchIds = matches.map((m) => m.matchId);
  logger.debug(existingMatchIds.join(", "));

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
  const query = `+label.isOpen:true`;
  const matches = nk.matchList(1, true, query);

  logger.debug(
    `Total ongoing matches ${matches.length} for user ${ctx.userId}`,
  );

  return JSON.stringify({
    matchIds: matches.map((m) => m.matchId),
  });
};
