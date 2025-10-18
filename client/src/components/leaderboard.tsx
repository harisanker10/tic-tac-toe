import { useEffect, useState } from "react";
import { useNakama } from "../context/authContext";
import { LEADERBOARD_ID } from "../lib/types";

interface LeaderboardRecord {
  rank?: number;
  score?: number;
  username?: string;
  owner_id?: string;
  user?: User; // Full user data
}

interface User {
  avatar_url?: string;
  display_name?: string;
  id?: string;
  online?: boolean;
  username?: string;
}

export const Leaderboard = ({ onExit }: { onExit: () => void }) => {
  const { client, session, user } = useNakama();
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchLeaderboard = async () => {
      try {
        const data = await client.listLeaderboardRecords(
          session,
          LEADERBOARD_ID,
          undefined,
          10,
        );
        const records = data.records || [];

        console.log({ records });

        // Get user IDs from records
        const userIds = records
          .map((record) => record.owner_id)
          .filter(Boolean);

        if (userIds.length > 0) {
          // Fetch user details
          const usersData = await client.getUsers(session, userIds as string[]);
          const usersMap = new Map(
            usersData.users?.map((u) => [u.id, u]) || [],
          );

          // Merge user data with records
          const enrichedRecords = records.map((record) => ({
            ...record,
            user: usersMap.get(record.owner_id),
          }));

          setRecords(enrichedRecords);
        } else {
          setRecords(records);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session, client]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="nes-container is-rounded bg-white p-6 text-center">
          <i className="nes-icon loading is-large"></i>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          className="nes-btn is-error text-xs sm:text-sm px-2 sm:px-4"
          onClick={onExit}
        >
          ← Back
        </button>
        <div className="text-center flex-1 mx-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
            Leaderboard
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm">Top players</p>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="nes-container is-rounded bg-white shadow-lg p-4 md:p-6">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[280px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2 text-xs sm:text-sm">Rank</th>
                <th className="text-left pb-2 text-xs sm:text-sm">Player</th>
                <th className="text-right pb-2 text-xs sm:text-sm">Score</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.owner_id}
                  className={`border-b border-gray-100 ${
                    record.owner_id === user?.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="py-2 sm:py-3">
                    <span
                      className={`nes-text ${
                        record.rank === 1
                          ? "is-primary"
                          : record.rank === 2
                            ? "is-success"
                            : record.rank === 3
                              ? "is-warning"
                              : ""
                      } font-bold text-xs sm:text-sm`}
                    >
                      #{record.rank}
                    </span>
                  </td>
                  <td className="py-2 sm:py-3">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px]">
                        {record.user?.username ||
                          record.user?.display_name ||
                          `Player ${record?.owner_id?.slice(0, 6)}`}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {record.owner_id === user?.id && (
                          <span className="nes-text is-primary text-xs">
                            (You)
                          </span>
                        )}
                        {record.user?.online ? (
                          <span className="nes-text is-success text-xs">
                            Online
                          </span>
                        ) : (
                          <span className="nes-text is-error text-xs">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 font-bold text-xs sm:text-sm">
                    {record.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">
              No records yet. Be the first to play!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
