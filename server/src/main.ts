const rpcIdFindMatch = "find_match";
const rpcIdFindOngoingMatch = "find_ongoing_match";

let InitModule: nkruntime.InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
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
