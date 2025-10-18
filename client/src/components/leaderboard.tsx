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
      <div className="flex items-center justify-between mb-8">
        <button className="nes-btn is-error" onClick={onExit}>
          ← Back
        </button>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-gray-300">Top players</p>
        </div>
        <div className="w-20"></div> {/* Spacer for balance */}
      </div>

      {/* Leaderboard */}
      <div className="nes-container is-rounded bg-white shadow-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2">Rank</th>
                <th className="text-left pb-2">Player</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-right pb-2">Score</th>
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
                  <td className="py-3">
                    <span
                      className={`nes-text ${
                        record.rank === 1
                          ? "is-primary"
                          : record.rank === 2
                            ? "is-success"
                            : record.rank === 3
                              ? "is-warning"
                              : ""
                      } font-bold`}
                    >
                      #{record.rank}
                    </span>
                  </td>
                  <td className="py-3">
                    {record.user?.username ||
                      record.user?.display_name ||
                      `Player ${record?.owner_id?.slice(0, 8)}`}
                    {record.owner_id === user?.id && (
                      <span className="nes-text is-primary text-xs ml-2">
                        (You)
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {record.user?.online ? (
                      <span className="nes-text is-success text-xs">
                        Online
                      </span>
                    ) : (
                      <span className="nes-text is-error text-xs">Offline</span>
                    )}
                  </td>
                  <td className="py-3 font-bold">{record.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No records yet. Be the first to play!
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="nes-container is-rounded with-title is-centered bg-white">
          <p className="title">Total Players</p>
          <p className="text-xl font-bold text-blue-600">{records.length}</p>
        </div>
        <div className="nes-container is-rounded with-title is-centered bg-white">
          <p className="title">Your Rank</p>
          <p className="text-xl font-bold text-green-600">
            #{records.find((r) => r.owner_id === user?.id)?.rank || "-"}
          </p>
        </div>
        <div className="nes-container is-rounded with-title is-centered bg-white">
          <p className="title">Top Score</p>
          <p className="text-xl font-bold text-yellow-600">
            {records[0]?.score || 0}
          </p>
        </div>
      </div>
    </div>
  );
};
