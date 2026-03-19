import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Campaign } from "@/app/components/CampaignsTable";

interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  actionType: string;
  issueType: string;
  onActionComplete: () => void;
}

export function ActionDialog({ 
  open, 
  onOpenChange, 
  campaign, 
  actionType,
  issueType,
  onActionComplete 
}: ActionDialogProps) {
  const [budgetValue, setBudgetValue] = useState(campaign.budget.toString());
  const [bidAdjustment, setBidAdjustment] = useState("20");
  const [creativeNotes, setCreativeNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionNote, setActionNote] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsSaving(false);
    onActionComplete();
    onOpenChange(false);
  };

  if (!open) return null;

  const renderActionForm = () => {
    switch (actionType) {
      case "Increase Budget":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Budget
              </label>
              <div className="text-2xl font-bold text-gray-900">
                ${campaign.budget.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="pl-7"
                  placeholder="Enter new budget"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: ${Math.round(campaign.budget * 1.3).toLocaleString()} (30% increase)
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Impact Preview</h4>
              <p className="text-xs text-blue-700">
                Increasing budget may help improve pacing and reach campaign goals faster.
              </p>
            </div>
          </div>
        );

      case "Reduce Budget":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Budget
              </label>
              <div className="text-2xl font-bold text-gray-900">
                ${campaign.budget.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="pl-7"
                  placeholder="Enter new budget"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Recommended: ${Math.round(campaign.budget * 0.7).toLocaleString()} (30% decrease)
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Impact Preview</h4>
              <p className="text-xs text-blue-700">
                Reducing budget will slow down spending and help align with flight schedule.
              </p>
            </div>
          </div>
        );

      case "Resume Campaign":
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                ⚠️ Campaign is currently paused
              </h4>
              <p className="text-xs text-yellow-700">
                Resuming this campaign will immediately start delivering ads and spending budget.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Status
              </label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Currently: Paused
                </span>
                <span className="text-gray-400">→</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Will be: Running
                </span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Next Steps</h4>
              <p className="text-xs text-blue-700">
                After resuming, monitor performance closely for the first 24-48 hours.
              </p>
            </div>
          </div>
        );

      case "Increase Bids":
      case "Lower Bids":
        const isIncrease = actionType === "Increase Bids";
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bid Adjustment
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={bidAdjustment}
                  onChange={(e) => setBidAdjustment(e.target.value)}
                  className="pr-8"
                  placeholder="Enter percentage"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isIncrease ? "Increase" : "Decrease"} bids by this percentage
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Impact Preview</h4>
              <p className="text-xs text-blue-700">
                {isIncrease 
                  ? "Higher bids may increase impression share and help with under-pacing issues."
                  : "Lower bids will reduce spend rate and help prevent over-pacing."}
              </p>
            </div>
          </div>
        );

      case "Refresh Creative":
      case "A/B Test New Copy":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creative Brief / Notes
              </label>
              <textarea
                value={creativeNotes}
                onChange={(e) => setCreativeNotes(e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Describe the creative changes or A/B test variants..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be sent to the creative team for implementation
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Best Practices</h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Test one element at a time (headline, image, CTA)</li>
                <li>Run tests for at least 7 days before making decisions</li>
                <li>Ensure sufficient sample size for statistical significance</li>
              </ul>
            </div>
          </div>
        );

      case "Pause Low Performers":
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                Action Required
              </h4>
              <p className="text-xs text-yellow-700">
                This will pause ad sets or placements with ROAS below 0.5x threshold.
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">Pause placements with ROAS &lt; 0.5x</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm text-gray-700">Reallocate budget to top performers</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">Send performance report to stakeholders</span>
              </label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Expected Impact</h4>
              <p className="text-xs text-blue-700">
                Focusing budget on better performing placements should improve overall ROAS.
              </p>
            </div>
          </div>
        );

      case "Adjust Daily Budget":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Budget Cap
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  defaultValue={Math.round(campaign.budget / 30)}
                  className="pl-7"
                  placeholder="Enter daily budget"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Set a daily cap to control spending pace
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Impact Preview</h4>
              <p className="text-xs text-blue-700">
                Daily budget caps help ensure even pacing throughout the campaign flight.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Configure settings for: <strong>{actionType}</strong>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-2xl z-[70]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{actionType}</h2>
            <p className="text-sm text-gray-500">{campaign.name}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {renderActionForm()}
        </div>

        {/* Leave a note */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave a note</label>
          <textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
            placeholder="Why are you making this change?"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Save Changes
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
