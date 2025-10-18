let rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  //TODO:
  // couldn't get query/label to work. Matches are listed and opens are filtered, for now
  const matches = nk.matchList(10, true, null, 0, 1);
  const openMatches = matches.filter((m) => {
    try {
      return JSON.parse(m.label || "{}")?.open === true;
    } catch {
      return false;
    }
  });

  let matchIds = openMatches.map((m) => m.matchId);

  if (matchIds.length === 0) {
    const newMatchId = nk.matchCreate(moduleName);
    matchIds = [newMatchId];
  }

  return JSON.stringify({ matchIds });
};
