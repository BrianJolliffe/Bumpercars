import { useState } from "react";
import { X, Zap, TrendingUp, TrendingDown, Target, MousePointerClick, DollarSign, Check, ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Campaign } from "@/app/components/CampaignsTable";
import { ActionDialog } from "@/app/components/ActionDialog";

interface OptimizeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

interface OptimizationCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  metric: string;
  currentValue: string;
  actions: Array<{ label: string; type: "primary" | "secondary"; description: string }>;
}

interface CompletedAction {
  actionLabel: string;
}

export function OptimizeDrawer({ isOpen, onClose, campaign }: OptimizeDrawerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<CompletedAction[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    actionLabel: string;
    actionType: string;
    category: string;
  } | null>(null);

  const isActionCompleted = (actionLabel: string) => {
    return completedActions.some(action => action.actionLabel === actionLabel);
  };

  const handleActionComplete = () => {
    if (selectedAction) {
      setCompletedActions(prev => [
        ...prev,
        { actionLabel: selectedAction.actionLabel }
      ]);
      setSelectedAction(null);
    }
  };

  const getOptimizationCategories = (): OptimizationCategory[] => {
    const categories: OptimizationCategory[] = [];

    // Pacing Optimization
    const pacingValue = parseFloat(campaign.pacing);
    if (pacingValue < -10 || pacingValue > 10) {
      categories.push({
        id: "pacing",
        name: "Pacing Optimization",
        icon: <TrendingDown className="w-5 h-5" />,
        metric: "Current Pacing",
        currentValue: campaign.pacing,
        actions: pacingValue < -10 ? [
          { 
            label: "Increase Daily Budget", 
            type: "primary",
            description: "Boost daily spend limit to improve delivery pace"
          },
          { 
            label: "Increase Bid Amounts", 
            type: "secondary",
            description: "Higher bids can increase competitiveness in auctions"
          },
          { 
            label: "Expand Targeting", 
            type: "secondary",
            description: "Broaden audience reach to find more opportunities"
          },
        ] : [
          { 
            label: "Reduce Daily Budget", 
            type: "primary",
            description: "Lower daily spend to slow down pace"
          },
          { 
            label: "Lower Bid Amounts", 
            type: "secondary",
            description: "Reduce bids to control spending rate"
          },
          { 
            label: "Tighten Targeting", 
            type: "secondary",
            description: "Focus on more specific audience segments"
          },
        ]
      });
    }

    // CTR Optimization
    const ctrValue = parseFloat(campaign.ctr);
    if (ctrValue < 0.5) {
      categories.push({
        id: "ctr",
        name: "Click-Through Rate",
        icon: <MousePointerClick className="w-5 h-5" />,
        metric: "Current CTR",
        currentValue: campaign.ctr,
        actions: [
          { 
            label: "Refresh Ad Creative", 
            type: "primary",
            description: "Update visuals and messaging to re-engage audience"
          },
          { 
            label: "A/B Test New Copy", 
            type: "secondary",
            description: "Test different headlines and descriptions"
          },
          { 
            label: "Review Audience Targeting", 
            type: "secondary",
            description: "Ensure ads are shown to most relevant audience"
          },
          { 
            label: "Optimize Ad Placement", 
            type: "secondary",
            description: "Test different ad placements and formats"
          },
        ]
      });
    }

    // ROAS Optimization
    const roasValue = parseFloat(campaign.roas);
    if (roasValue < 2.0) {
      categories.push({
        id: "roas",
        name: "Return on Ad Spend",
        icon: <DollarSign className="w-5 h-5" />,
        metric: "Current ROAS",
        currentValue: campaign.roas,
        actions: [
          { 
            label: "Optimize Landing Page", 
            type: "primary",
            description: "Improve conversion rate with better landing page"
          },
          { 
            label: "Refine Audience Targeting", 
            type: "secondary",
            description: "Focus on high-converting audience segments"
          },
          { 
            label: "Adjust Bid Strategy", 
            type: "secondary",
            description: "Switch to conversion-focused bidding"
          },
          { 
            label: "Test Product Offering", 
            type: "secondary",
            description: "Experiment with different products or promotions"
          },
        ]
      });
    }

    // Budget Efficiency
    const calculateFlightCompletion = (startDate: string, endDate: string) => {
      const today = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (today < start) return 0;
      if (today > end) return 100;
      
      const totalDuration = end.getTime() - start.getTime();
      const elapsedDuration = today.getTime() - start.getTime();
      return (elapsedDuration / totalDuration) * 100;
    };

    const flightCompletion = calculateFlightCompletion(campaign.startDate, campaign.endDate);
    const budgetSpent = (campaign.spend / campaign.budget) * 100;
    const budgetTimeDiff = Math.abs(budgetSpent - flightCompletion);
    
    if (budgetTimeDiff > 20) {
      categories.push({
        id: "budget",
        name: "Budget Pacing",
        icon: <Target className="w-5 h-5" />,
        metric: "Budget vs Time",
        currentValue: `${budgetSpent.toFixed(0)}% spent / ${flightCompletion.toFixed(0)}% elapsed`,
        actions: budgetSpent > flightCompletion ? [
          { 
            label: "Adjust Daily Budget", 
            type: "primary",
            description: "Reduce daily budget to align with flight schedule"
          },
          { 
            label: "Review Pacing Strategy", 
            type: "secondary",
            description: "Consider switching to more even pacing"
          },
          { 
            label: "Extend Flight Dates", 
            type: "secondary",
            description: "Request extension if budget depletes early"
          },
        ] : [
          { 
            label: "Increase Daily Budget", 
            type: "primary",
            description: "Increase daily budget to fully utilize budget"
          },
          { 
            label: "Accelerate Delivery", 
            type: "secondary",
            description: "Switch to accelerated delivery mode"
          },
          { 
            label: "Expand Targeting", 
            type: "secondary",
            description: "Reach more users to spend remaining budget"
          },
        ]
      });
    }

    // Performance Benchmark
    const salesValue = parseFloat(campaign.sales || "0");
    if (salesValue < 100) {
      categories.push({
        id: "performance",
        name: "Overall Performance",
        icon: <TrendingUp className="w-5 h-5" />,
        metric: "Sales Performance",
        currentValue: `Sales: ${campaign.sales || "$0"}`,
        actions: [
          { 
            label: "Review Attribution Model", 
            type: "primary",
            description: "Evaluate if current attribution is optimal"
          },
          { 
            label: "Optimize Conversion Funnel", 
            type: "secondary",
            description: "Identify and fix funnel drop-off points"
          },
          { 
            label: "Test New Creative Strategy", 
            type: "secondary",
            description: "Experiment with different ad formats"
          },
          { 
            label: "Analyze Competitor Strategies", 
            type: "secondary",
            description: "Research market trends and adjust accordingly"
          },
        ]
      });
    }

    return categories;
  };

  const optimizationCategories = getOptimizationCategories();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f26318]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#f26318]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Optimization Center</h2>
              <p className="text-sm text-gray-500">{campaign.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Budget</div>
              <div className="text-lg font-semibold text-gray-900">${campaign.budget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Spend</div>
              <div className="text-lg font-semibold text-gray-900">${campaign.spend.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">CTR</div>
              <div className="text-lg font-semibold text-gray-900">{campaign.ctr}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">ROAS</div>
              <div className="text-lg font-semibold text-gray-900">{campaign.roas}</div>
            </div>
          </div>
        </div>

        {/* Optimization Categories */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {optimizationCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Performing Well</h3>
              <p className="text-sm text-gray-500">This campaign is optimized and meeting targets</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  {optimizationCategories.length} Optimization Opportunit{optimizationCategories.length !== 1 ? "ies" : "y"}
                </h3>
                <p className="text-xs text-gray-500">
                  Select a category to see recommended actions
                </p>
              </div>

              {optimizationCategories.map((category) => {
                const isExpanded = expandedCategory === category.id;
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f26318]/10 flex items-center justify-center text-[#f26318]">
                          {category.icon}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                          <div className="text-xs text-gray-500">
                            {category.metric}: <span className="font-medium text-gray-700">{category.currentValue}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Actions List */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="space-y-2">
                          {category.actions.map((action, idx) => {
                            const completed = isActionCompleted(action.label);
                            
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border transition-all ${
                                  completed 
                                    ? "bg-green-50 border-green-200" 
                                    : "bg-white border-gray-200 hover:border-[#f26318]/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {completed && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                                      <span className={`text-sm font-medium ${
                                        completed ? "text-green-700" : "text-gray-900"
                                      }`}>
                                        {action.label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                                  </div>
                                  {!completed && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAction({
                                          actionLabel: action.label,
                                          actionType: action.type,
                                          category: category.name
                                        });
                                        setShowActionDialog(true);
                                      }}
                                      className={`shrink-0 ${
                                        action.type === "primary"
                                          ? "bg-[#f26318] hover:bg-[#d94f0f] text-white"
                                          : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
                                      }`}
                                    >
                                      Take Action
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      {showActionDialog && selectedAction && (
        <ActionDialog
          open={showActionDialog}
          onOpenChange={(open) => {
            setShowActionDialog(open);
            if (!open) setSelectedAction(null);
          }}
          campaign={campaign}
          actionType={selectedAction.actionLabel}
          issueType={selectedAction.category}
          onActionComplete={handleActionComplete}
        />
      )}
    </>
  );
}