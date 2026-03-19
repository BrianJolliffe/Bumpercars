import { useState } from "react";
import { X, TriangleAlert, TrendingDown, Pause, DollarSign, MousePointerClick, Target, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Campaign } from "@/app/components/CampaignsTable";
import { ActionDialog } from "@/app/components/ActionDialog";

interface CriticalCampaignsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Campaign[];
  calculateCampaignHealth: (campaign: Campaign) => string;
  mode?: "critical" | "all"; // New prop to determine which campaigns to show
  onNavigateToTab?: () => void; // Callback to navigate to Needs Attention tab
}

interface CompletedAction {
  campaignId: string;
  issueType: string;
}

export function CriticalCampaignsDrawer({ 
  open, 
  onOpenChange, 
  campaigns,
  calculateCampaignHealth,
  mode = "critical",
  onNavigateToTab
}: CriticalCampaignsDrawerProps) {
  const [completedActions, setCompletedActions] = useState<CompletedAction[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    campaign: Campaign;
    actionType: string;
    issueType: string;
  } | null>(null);

  const filteredCampaigns = campaigns.filter(campaign => {
    const health = calculateCampaignHealth(campaign);
    if (mode === "critical") {
      return health === "critical";
    } else {
      // Show all campaigns with warning or critical health
      return health === "warning" || health === "critical";
    }
  });

  const isActionCompleted = (campaignId: string, issueType: string) => {
    return completedActions.some(
      action => action.campaignId === campaignId && action.issueType === issueType
    );
  };

  const handleActionComplete = () => {
    if (selectedAction) {
      setCompletedActions(prev => [
        ...prev,
        {
          campaignId: selectedAction.campaign.id,
          issueType: selectedAction.issueType
        }
      ]);
      setSelectedAction(null);
    }
  };

  // Determine what issues a campaign has and suggest actions
  const getIssuesAndActions = (campaign: Campaign) => {
    const issues: Array<{
      type: string;
      description: string;
      icon: React.ReactNode;
      actions: Array<{ label: string; type: "primary" | "secondary" }>;
    }> = [];

    // Check if paused
    if (campaign.status === "Paused") {
      issues.push({
        type: "Campaign Paused",
        description: "Campaign is currently paused and not delivering",
        icon: <Pause className="w-4 h-4" />,
        actions: [
          { label: "Resume Campaign", type: "primary" },
          { label: "Review Settings", type: "secondary" }
        ]
      });
    }

    // Check pacing
    const pacingValue = parseFloat(campaign.pacing);
    if (pacingValue < -30) {
      issues.push({
        type: "Severe Under-Pacing",
        description: `Pacing at ${campaign.pacing}, significantly behind target`,
        icon: <TrendingDown className="w-4 h-4" />,
        actions: [
          { label: "Increase Budget", type: "primary" },
          { label: "Increase Bids", type: "secondary" },
          { label: "Expand Targeting", type: "secondary" }
        ]
      });
    } else if (pacingValue > 50) {
      issues.push({
        type: "Severe Over-Pacing",
        description: `Pacing at ${campaign.pacing}, spending too quickly`,
        icon: <TrendingDown className="w-4 h-4" />,
        actions: [
          { label: "Reduce Budget", type: "primary" },
          { label: "Lower Bids", type: "secondary" },
          { label: "Tighten Targeting", type: "secondary" }
        ]
      });
    }

    // Check CTR
    const ctrValue = parseFloat(campaign.ctr);
    if (ctrValue < 0.3) {
      issues.push({
        type: "Very Low CTR",
        description: `CTR of ${campaign.ctr} indicates poor ad engagement`,
        icon: <MousePointerClick className="w-4 h-4" />,
        actions: [
          { label: "Refresh Creative", type: "primary" },
          { label: "A/B Test New Copy", type: "secondary" },
          { label: "Review Audience Fit", type: "secondary" }
        ]
      });
    }

    // Check ROAS
    const roasValue = parseFloat(campaign.roas);
    if (roasValue < 1.0) {
      issues.push({
        type: "Poor ROAS Performance",
        description: `ROAS of ${campaign.roas} is below break-even`,
        icon: <DollarSign className="w-4 h-4" />,
        actions: [
          { label: "Pause Low Performers", type: "primary" },
          { label: "Optimize Landing Page", type: "secondary" },
          { label: "Refine Audience", type: "secondary" }
        ]
      });
    }

    // Check budget alignment
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
    
    if (budgetTimeDiff > 40) {
      if (budgetSpent > flightCompletion) {
        issues.push({
          type: "Spending Too Fast",
          description: `${budgetSpent.toFixed(0)}% budget spent vs ${flightCompletion.toFixed(0)}% flight completed`,
          icon: <Target className="w-4 h-4" />,
          actions: [
            { label: "Adjust Daily Budget", type: "primary" },
            { label: "Review Pacing Strategy", type: "secondary" }
          ]
        });
      } else {
        issues.push({
          type: "Spending Too Slow",
          description: `${budgetSpent.toFixed(0)}% budget spent vs ${flightCompletion.toFixed(0)}% flight completed`,
          icon: <Target className="w-4 h-4" />,
          actions: [
            { label: "Increase Budget", type: "primary" },
            { label: "Extend Flight Dates", type: "secondary" }
          ]
        });
      }
    }

    return issues;
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              mode === "critical" ? "bg-red-100" : "bg-orange-100"
            }`}>
              <TriangleAlert className={`w-5 h-5 ${
                mode === "critical" ? "text-red-600" : "text-orange-600"
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === "critical" ? "Critical Campaigns" : "Campaigns Needing Attention"}
              </h2>
              <p className="text-sm text-gray-500">
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""} {mode === "critical" ? "require immediate attention" : "need review"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Critical Campaigns</h3>
              <p className="text-sm text-gray-500">All campaigns are performing within acceptable ranges</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => {
                const issues = getIssuesAndActions(campaign);
                const health = calculateCampaignHealth(campaign);
                const isWarning = health === "warning";
                const isCritical = health === "critical";
                
                return (
                  <div key={campaign.id} className={`border rounded-lg overflow-hidden ${
                    isCritical ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                  }`}>
                    {/* Campaign Header */}
                    <div className={`bg-white px-4 py-3 border-b ${
                      isCritical ? "border-red-200" : "border-yellow-200"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              isCritical ? "bg-red-500" : "bg-yellow-500"
                            }`}></span>
                            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>ID: {campaign.id}</span>
                            <span>•</span>
                            <span>{campaign.category}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              campaign.status === "Running" 
                                ? "bg-green-100 text-green-800"
                                : campaign.status === "Paused"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {campaign.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Budget</div>
                          <div className="text-sm font-semibold text-gray-900">${campaign.budget.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Issues and Actions */}
                    <div className="p-4 space-y-4">
                      {issues.map((issue, idx) => {
                        const isCompleted = isActionCompleted(campaign.id, issue.type);
                        return (
                          <div 
                            key={idx} 
                            className={`rounded-lg border p-3 transition-all ${
                              isCompleted 
                                ? "bg-green-50 border-green-200" 
                                : "bg-white border-red-200"
                            }`}
                          >
                            <div className="flex items-start gap-2 mb-3">
                              <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                                isCompleted 
                                  ? "bg-green-100 text-green-600" 
                                  : "bg-red-100 text-red-600"
                              }`}>
                                {isCompleted ? <Check className="w-4 h-4" /> : issue.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-sm font-semibold ${
                                    isCompleted ? "text-green-900" : "text-gray-900"
                                  }`}>
                                    {issue.type}
                                  </h4>
                                  {isCompleted && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Action Complete
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs ${
                                  isCompleted ? "text-green-700" : "text-gray-600"
                                }`}>
                                  {isCompleted 
                                    ? "Action has been taken to address this issue" 
                                    : issue.description
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Action Buttons - only show if not completed */}
                            {!isCompleted && (
                              <div className="flex flex-wrap gap-2">
                                {issue.actions.map((action, actionIdx) => (
                                  <Button
                                    key={actionIdx}
                                    size="sm"
                                    variant={action.type === "primary" ? "default" : "outline"}
                                    className={
                                      action.type === "primary"
                                        ? "bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs"
                                        : "border-gray-300 text-gray-700 hover:bg-gray-50 h-7 text-xs"
                                    }
                                    onClick={() => {
                                      setSelectedAction({
                                        campaign,
                                        actionType: action.label,
                                        issueType: issue.type
                                      });
                                      setShowActionDialog(true);
                                    }}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
              onClick={() => {
                // TODO: Navigate to Needs Attention tab with filters
                if (onNavigateToTab) {
                  onNavigateToTab();
                }
                onOpenChange(false);
              }}
            >
              View All in Table
            </Button>
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      {showActionDialog && selectedAction && (
        <ActionDialog
          open={showActionDialog}
          onOpenChange={setShowActionDialog}
          campaign={selectedAction.campaign}
          actionType={selectedAction.actionType}
          issueType={selectedAction.issueType}
          onActionComplete={handleActionComplete}
        />
      )}
    </>
  );
}