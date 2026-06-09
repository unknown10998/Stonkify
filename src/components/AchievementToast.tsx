import { useNotificationStore } from '../store/notificationStore';

export default function AchievementToast() {
  const items   = useNotificationStore(s => s.items.filter(n => n.type === 'achievement'));
  const dismiss = useNotificationStore(s => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
      {items.map(n => (
        <div
          key={n.id}
          className="group relative flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl border-yellow-500/60 bg-yellow-950/90 text-yellow-200 animate-[slideInRight_0.3s_ease-out]"
          style={{ minWidth: '240px' }}
        >
          <span className="text-xl mt-0.5 flex-shrink-0">🏅</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-0.5">Achievement Unlocked</div>
            <div className="font-bold text-sm text-white">{n.text}</div>
            {n.sub && <div className="text-xs opacity-70 mt-0.5">{n.sub}</div>}
          </div>
          <button
            onClick={() => dismiss(n.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1 -mt-0.5 -mr-1 p-1 rounded-md hover:bg-white/10 text-current"
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
