import { ACHIEVEMENTS, loadAchievements } from '../engine/achievementEngine';
import { useGameStore } from '../store/gameStore';

const SECRET_ID = 'god_of_markets';

const CATEGORIES = [
  { label: 'Wealth',          ids: ['first_double','triple','moon_shot','ten_bagger','half_million','millionaire','comeback_kid'] },
  { label: 'Survival',        ids: ['diamond_hands','veteran','legend'] },
  { label: 'Market Phases',   ids: ['survived_panic','euphoria_rider','bear_survivor','black_swan'] },
  { label: 'Trading',         ids: ['first_trade','active_trader','day_trader','big_portfolio'] },
  { label: 'Short Selling',   ids: ['first_short','profitable_short','short_king','short_squeezed'] },
  { label: 'Leverage & Risk', ids: ['leveraged_up','all_in','meme_lord','margin_survivor','diversified'] },
  { label: 'Bets',            ids: ['first_bet','crash_prophet','big_winner'] },
];

export default function AchievementsTab() {
  const newAchievements = useGameStore(s => s.newAchievements);
  const allUnlocked = new Set(loadAchievements());
  const newSet = new Set(newAchievements);
  const totalUnlocked = ACHIEVEMENTS.filter(a => allUnlocked.has(a.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-4 flex items-center justify-between">
        <div>
          <div className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Unlocked</div>
          <div className="text-2xl font-black text-white mt-1">
            {totalUnlocked}
            <span className="text-gray-600 text-lg font-semibold"> / {ACHIEVEMENTS.length}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-2 w-48 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all duration-500"
              style={{ width: `${(totalUnlocked / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
          <div className="text-gray-600 text-xs">{Math.round((totalUnlocked / ACHIEVEMENTS.length) * 100)}% complete</div>
        </div>
      </div>

      {/* Secret boss achievement */}
      {(() => {
        const ach = ACHIEVEMENTS.find(a => a.id === SECRET_ID)!;
        const unlocked = allUnlocked.has(SECRET_ID);
        const isNew = newSet.has(SECRET_ID);
        return (
          <div className={`rounded-2xl border p-4 ${
            unlocked
              ? 'bg-gradient-to-r from-yellow-950/60 to-orange-950/60 border-yellow-500/60'
              : 'bg-gray-900/50 border-gray-700/50'
          }`}>
            <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${unlocked ? 'text-yellow-400' : 'text-gray-600'}`}>
              {unlocked ? 'Secret Achievement' : '??? Secret Achievement'}
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-4xl ${unlocked ? '' : 'grayscale opacity-20'}`}>
                {unlocked ? ach.icon : '❓'}
              </span>
              <div>
                <div className={`font-black text-base ${unlocked ? 'text-yellow-300' : 'text-gray-600'}`}>
                  {unlocked ? ach.name : '???'}
                  {isNew && <span className="ml-2 text-xs font-semibold text-yellow-400 bg-yellow-900/50 px-1.5 py-0.5 rounded-md">NEW</span>}
                </div>
                <div className={`text-sm mt-0.5 ${unlocked ? 'text-gray-300' : 'text-gray-700'}`}>
                  {unlocked ? ach.description : 'Hidden until unlocked. Few have seen this.'}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Categories */}
      {CATEGORIES.map(cat => {
        const achs = cat.ids.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean) as typeof ACHIEVEMENTS;
        return (
          <div key={cat.label} className="bg-gray-900 rounded-2xl border border-gray-700 p-4">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">{cat.label}</div>
            <div className="grid grid-cols-1 gap-2">
              {achs.map(ach => {
                const unlocked = allUnlocked.has(ach.id);
                const isNew = newSet.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isNew    ? 'bg-yellow-900/30 border border-yellow-600/40' :
                      unlocked ? 'bg-gray-800' :
                                 'opacity-35'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-gray-600'}`}>
                        {ach.name}
                        {isNew && (
                          <span className="ml-2 text-xs font-semibold text-yellow-400 bg-yellow-900/50 px-1.5 py-0.5 rounded-md">NEW</span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">{ach.description}</div>
                    </div>
                    {unlocked && (
                      <span className="text-green-500 flex-shrink-0">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
