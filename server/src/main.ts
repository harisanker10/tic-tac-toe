const rpcIdFindMatch = "find_match";
const rpcIdFindOngoingMatch = "find_ongoing_match";
const LEADERBOARD_ID = "LEADERBOARD_ID";

let InitModule: nkruntime.InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  const leaderboards = nk.leaderboardList();

  if (!leaderboards?.leaderboards?.length) {
    let id = LEADERBOARD_ID;
    let authoritative = true;
    let sort = nkruntime.SortOrder.DESCENDING;
    let operator = nkruntime.Operator.INCREMENTAL;
    // let reset = "0 0 * * 1";
    let reset = undefined;
    let metadata = {
      // weatherConditions: "rain",
    };
    try {
      nk.leaderboardCreate(id, authoritative, sort, operator, reset, metadata);
    } catch (error) {
      logger.error("Error creating leaderboard");
    }
  }

  initializer.registerMatch(moduleName, {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate,
  });

  initializer.registerRpc(rpcIdFindMatch, rpcFindMatch);
  initializer.registerRpc(rpcIdFindOngoingMatch, rpcFindOngoingMatch);
};
