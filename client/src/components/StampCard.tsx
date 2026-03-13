import { Progress } from "@/components/ui/progress";

interface StampCardProps {
  store: {
    id: number;
    name: string;
    category: string;
    icon: string;
    color: string;
    reward: string;
    rewardThreshold: number;
  };
  stampData?: {
    visits: number;
    total: number;
    stampedToday: boolean;
  };
  onClick?: () => void;
}

export default function StampCard({ store, stampData, onClick }: StampCardProps) {
  const total = stampData?.total || 0;
  const visits = stampData?.visits || 0;
  const hasReward = total >= store.rewardThreshold;
  const progress = Math.min((total / store.rewardThreshold) * 100, 100);

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-3.5 transition-all duration-300 ${
        hasReward
          ? "bg-gradient-to-br from-gold-500/15 to-gold-600/10 border-[1.5px] border-gold-500 shadow-md animate-reward-glow cursor-pointer"
          : "bg-gradient-to-br from-white/90 to-warm-100/80 border-[1.5px] border-warm-200/60 shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Store icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-[1.5px]"
          style={{
            background: `linear-gradient(135deg, ${store.color}18, ${store.color}35)`,
            borderColor: `${store.color}44`,
          }}
        >
          {store.icon}
        </div>

        {/* Store info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-warm-900 truncate">{store.name}</div>
          <div className="text-xs text-warm-500 flex items-center gap-1.5">
            <span>{store.category}</span>
            {visits > 0 && (
              <>
                <span className="text-warm-300">·</span>
                <span>{visits}回来店</span>
              </>
            )}
            {visits >= 3 && (
              <>
                <span className="text-warm-300">·</span>
                <span className="text-gold-600">×0.5</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-1.5">
            <Progress
              value={progress}
              className="h-1.5 bg-warm-200/60"
            />
          </div>

          <div className="text-[10px] text-warm-500 mt-1">
            {hasReward ? (
              <span className="text-gold-600 font-medium">🎁 特典獲得中！</span>
            ) : (
              `${total.toFixed(1)} / ${store.rewardThreshold} スタンプ`
            )}
          </div>
        </div>

        {/* Stamp status */}
        {stampData?.stampedToday && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${store.color}, ${store.color}bb)`,
            }}
          >
            ✓
          </div>
        )}
      </div>
    </div>
  );
}
