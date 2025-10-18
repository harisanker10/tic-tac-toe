let rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  const matches = nk.matchList(10, true, null, 1, 1);
  // matches with 1 player might need not be open due to disconnection
  const openMatches = matches.filter((m) => {
    try {
      return JSON.parse(m.label || "{}")?.open === true;
    } catch {
      return false;
    }
  });

  let matchIds = openMatches.map((m) => m.matchId);

  if (matchIds.length === 0) {
    logger.debug("Creating a match...");
    const newMatchId = nk.matchCreate(moduleName);
    matchIds = [newMatchId];
  }

  return JSON.stringify({ matchIds });
};
