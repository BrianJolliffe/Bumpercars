import { Sparkles, TriangleAlert, ExternalLink, Lock } from "lucide-react";

interface InsightCard {
  type: "opportunity" | "action" | "optimization";
  title: string;
  body: React.ReactNode;
  metric: React.ReactNode;
  primaryAction: string;
}

const badgeConfig = {
  opportunity: {
    label: "OPPORTUNITY",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: <Sparkles className="w-3 h-3" />,
  },
  action: {
    label: "ACTION NEEDED",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: <TriangleAlert className="w-3 h-3" />,
  },
  optimization: {
    label: "OPTIMIZATION",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: <Sparkles className="w-3 h-3" />,
  },
};

function CampaignLink({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 cursor-pointer group/link">
      <span className="italic text-gray-900 font-medium group-hover/link:underline">
        {name}
      </span>
      <ExternalLink className="w-3 h-3 text-gray-400 group-hover/link:text-[#f26318] transition-colors" />
    </span>
  );
}

const insightCards: InsightCard[] = [
  {
    type: "opportunity",
    title: "Expand into Google Shopping with one click",
    body: (
      <>
        Your <CampaignLink name="Spring Black Friday PLA campaign" /> is
        performing at 5.95x ROAS. Reuse its products to launch a Google Shopping
        campaign with $62,500 available budget.
      </>
    ),
    metric: (
      <>
        <Sparkles className="w-3.5 h-3.5 text-[#f26318] shrink-0 mt-0.5" />
        <span>
          Est. <span className="font-medium">+$375,000 incremental sales</span>
          , similar ROAS.
        </span>
      </>
    ),
    primaryAction: "Launch Google Shopping",
  },
  {
    type: "action",
    title: "Pacing Alert: New Product Line Launch",
    body: (
      <>
        Campaign <CampaignLink name="New Product Line Launch" /> is 12% behind
        pace with $42,000 projected unspent by 4/19. We recommend increasing
        bids to finish on target.
      </>
    ),
    metric: (
      <>
        <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <span>
          Projected{" "}
          <span className="font-medium">$42,000 unable to spend</span>
        </span>
      </>
    ),
    primaryAction: "Adjust Bids",
  },
  {
    type: "optimization",
    title: "3 Products Dragging Down PLA ROAS",
    body: (
      <>
        In campaign <CampaignLink name="DIY Promo Weekend" />, 3 products are
        below 2.0x ROAS vs. the 3.5x campaign average. Pausing or adjusting bids
        could lift overall performance.
      </>
    ),
    metric: (
      <>
        <Sparkles className="w-3.5 h-3.5 text-[#f26318] shrink-0 mt-0.5" />
        <span>
          <span className="font-medium">+1x ROAS lift</span> — $70,000
          incremental sales from promoting high performers
        </span>
      </>
    ),
    primaryAction: "Review Products",
  },
];

export function CampaignSummaryCards() {
  return (
    <div className="relative">
      {/* Coming Soon overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur-[1px] border border-gray-200 rounded-lg px-5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-medium tracking-wide">Coming soon</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 px-6 opacity-50 grayscale pointer-events-none select-none">
        {insightCards.map((card, i) => {
          const badge = badgeConfig[card.type];
          return (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#f26318]/20 via-[#f26318]/40 to-[#f26318]/20" />

              {/* Badge - positioned top-right */}
              <div className="flex justify-end mb-3 -mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.border} ${badge.text}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm text-gray-900 mb-2 leading-snug font-semibold">
                {card.title}
              </h3>

              {/* Body */}
              <p className="text-xs text-gray-600 leading-relaxed mb-3 flex-1">
                {card.body}
              </p>

              {/* Metric highlight */}
              <div className="flex items-start gap-1.5 text-xs text-gray-700 mb-4 leading-relaxed">
                {card.metric}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-auto">
                <button className="px-5 py-2.5 bg-[#f26318] hover:bg-[#d9550f] text-white text-xs font-medium rounded-[8px] transition-colors cursor-pointer shadow-sm">
                  {card.primaryAction}
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs text-purple-600 hover:text-purple-700 border border-gray-200 hover:border-purple-300 rounded-[8px] transition-colors cursor-pointer font-medium bg-white">
                  <Sparkles className="w-3.5 h-3.5" />
                  Learn More
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}