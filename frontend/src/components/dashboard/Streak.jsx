import React, { useContext } from "react";
import { AppContent } from "../../context/AppContext";
import Heatmap from "./Heatmap";
import { Trophy, Calendar } from "lucide-react";

const Streak = () => {
  const { userData } = useContext(AppContent);

  return (
    <div className="w-full bg-[#272e36] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl max-w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            Study Activity & Streaks
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Visual representation of your recall card reviews over the past 12 months.
          </p>
        </div>
        
        {userData && (
          <div className="bg-neutral-950 px-4 py-2 rounded-xl border border-white/5 text-center shrink-0">
            <span className="text-[10px] text-neutral-500 font-semibold block uppercase tracking-wider">Current Streak</span>
            <span className="text-lg font-bold text-white mt-0.5 flex items-center justify-center gap-1.5">
              {userData.currentStreak > 0 ? "🔥" : "😢"} {userData.currentStreak || 0} days
            </span>
          </div>
        )}
      </div>

      <div className="bg-neutral-950/40 p-5 rounded-xl border border-white/5 shadow-inner">
        {userData?.reviewHistory ? (
          <Heatmap reviewHistory={userData.reviewHistory} />
        ) : (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No study history logs found. Complete your card reviews to start building your streak!
          </div>
        )}
      </div>
      
      <div className="mt-5 flex items-center gap-1.5 text-xs text-neutral-500 justify-end">
        <Calendar className="w-3.5 h-3.5" />
        <span>Heatmap updates automatically after each complete card review session.</span>
      </div>
    </div>
  );
};

export default Streak;
