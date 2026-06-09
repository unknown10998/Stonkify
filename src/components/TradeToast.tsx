import { useNotificationStore } from '../store/notificationStore';
import clsx from 'clsx';

const TYPE_STYLES = {
  buy:   'border-green-500/50 bg-green-950/80 text-green-300',
  sell:  'border-gray-500/50 bg-gray-900/90 text-gray-200',
  short: 'border-purple-500/50 bg-purple-950/80 text-purple-300',
  cover: 'border-pink-500/50 bg-pink-950/80 text-pink-300',
  win:   'border-yellow-500/50 bg-yellow-950/80 text-yellow-300',
  loss:  'border-red-500/50 bg-red-950/80 text-red-300',
  event: 'border-orange-500/50 bg-orange-950/80 text-orange-300',
};

const TYPE_ICONS = {
  buy:   '▲',
  sell:  '▼',
  short: '↘',
  cover: '↗',
  win:   '✓',
  loss:  '✗',
  event: '⚡',
};

export default function TradeToast() {
  const items   = useNotificationStore(s => s.items.filter(n => n.type !== 'achievement'));
  const dismiss = useNotificationStore(s => s.dismiss);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {items.map(n => (
        <div
          key={n.id}
          className={clsx(
            'group relative flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-xl',
            'animate-[slideInRight_0.25s_ease-out]',
            TYPE_STYLES[n.type]
          )}
          style={{ minWidth: '220px' }}
        >
          <span className="text-lg mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{n.text}</div>
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
