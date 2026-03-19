import { useState } from "react";
import { X, Sparkles, Mail, Check, Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  status: string;
  pacing: string;
  ctr: string;
  roas: string;
  cpc?: string;
  budget: string;
  spend: string;
  startDate: string;
  endDate: string;
  healthScore?: number;
}

interface AISummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
}

export function AISummaryDialog({ isOpen, onClose, campaigns }: AISummaryDialogProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate AI summary based on selected campaigns
  const generateSummary = () => {
    if (campaigns.length === 1) {
      const campaign = campaigns[0];
      const pacingValue = parseFloat(campaign.pacing.replace("%", ""));
      const ctrValue = parseFloat(campaign.ctr.replace("%", ""));
      const roasValue = parseFloat(campaign.roas.replace("x", ""));
      const cpcValue = campaign.cpc ? parseFloat(campaign.cpc.replace(/[$,]/g, "")) : null;
      
      // Calculate approximate impressions and clicks if CPC is available
      let impressionsText = "";
      let clicksText = "";
      if (cpcValue && cpcValue > 0) {
        const spendValue = parseFloat(campaign.spend.replace(/[$,]/g, ""));
        const approximateClicks = Math.round(spendValue / cpcValue);
        const approximateImpressions = ctrValue > 0 ? Math.round((approximateClicks / ctrValue) * 100) : null;
        
        clicksText = ` with approximately ${approximateClicks.toLocaleString()} clicks`;
        if (approximateImpressions) {
          impressionsText = ` from ${approximateImpressions.toLocaleString()} impressions`;
        }
      }
      
      let pacingStatus = "on track";
      if (pacingValue < -10) pacingStatus = "behind schedule";
      else if (pacingValue > 10) pacingStatus = "ahead of schedule";
      
      let performance = "meeting expectations";
      if (ctrValue < 2 || roasValue < 2) performance = "showing areas for improvement";
      else if (ctrValue > 4 && roasValue > 4) performance = "exceeding expectations";

      const cpcText = cpcValue ? ` at a cost per click of ${campaign.cpc}` : "";
      
      return `${campaign.name} is currently ${campaign.status.toLowerCase()} from ${campaign.startDate} to ${campaign.endDate}. The campaign has spent ${campaign.spend} of its ${campaign.budget} budget and is ${pacingStatus} with pacing at ${campaign.pacing}. Performance is ${performance} with a click-through rate of ${campaign.ctr}, return on ad spend of ${campaign.roas}${cpcText}${clicksText}${impressionsText}. ${
        pacingValue < -10 
          ? "Consider increasing daily budget or bids to improve pacing and ensure full budget utilization." 
          : pacingValue > 10 
          ? "Consider adjusting budget allocation or extending the flight period to better align spending with the timeline." 
          : "Continue monitoring performance metrics and make incremental adjustments as needed to optimize results."
      }`;
    } else {
      const runningCount = campaigns.filter(c => c.status === "Running").length;
      const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.budget.replace(/[$,]/g, "")), 0);
      const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.spend.replace(/[$,]/g, "")), 0);
      const avgCtr = campaigns.reduce((sum, c) => sum + parseFloat(c.ctr.replace("%", "")), 0) / campaigns.length;
      const avgRoas = campaigns.reduce((sum, c) => sum + parseFloat(c.roas.replace("x", "")), 0) / campaigns.length;
      
      const behindPacing = campaigns.filter(c => parseFloat(c.pacing.replace("%", "")) < -10).length;
      const aheadPacing = campaigns.filter(c => parseFloat(c.pacing.replace("%", "")) > 10).length;

      let pacingInsight = "";
      if (behindPacing > 0) pacingInsight = ` ${behindPacing} campaign${behindPacing > 1 ? 's are' : ' is'} behind pacing and may need budget or bid adjustments.`;
      if (aheadPacing > 0) pacingInsight += ` ${aheadPacing} campaign${aheadPacing > 1 ? 's are' : ' is'} ahead of pacing.`;

      return `You have ${campaigns.length} selected campaigns, with ${runningCount} currently running. The collective budget is $${totalBudget.toLocaleString()}, with $${totalSpend.toLocaleString()} spent to date. Average performance shows a CTR of ${avgCtr.toFixed(2)}% and ROAS of ${avgRoas.toFixed(2)}x.${pacingInsight} ${
        avgCtr < 2 || avgRoas < 2
          ? "Consider refreshing creative assets and optimizing targeting to improve overall performance."
          : "Overall performance is solid. Continue monitoring for optimization opportunities."
      }`;
    }
  };

  const summary = generateSummary();

  const handleCopy = () => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = summary;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleSendEmail = () => {
    if (!emailRecipient) {
      toast.error("Please enter an email address");
      return;
    }

    // Simulate sending email
    toast.success(`Summary sent to ${emailRecipient}`);
    setEmailRecipient("");
    setShowShareDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showShareDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">AI Campaign Summary</DialogTitle>
          <DialogDescription className="sr-only">
            AI-generated performance summary for {campaigns.length} selected campaign{campaigns.length > 1 ? 's' : ''}
          </DialogDescription>
          
          {/* Header with soft AI treatment */}
          <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 -m-6 mb-4 border-b border-purple-100">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-2.5">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Campaign Summary</h2>
                  <p className="text-gray-600 text-sm mt-0.5">
                    {campaigns.length} campaign{campaigns.length > 1 ? 's' : ''} analyzed
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Summary Content */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/50 rounded-lg p-5 border border-purple-100">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed flex-1">
                  {summary}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 border-gray-300"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="flex-1 bg-[#f26318] hover:bg-[#d45515]"
              >
                <Mail className="w-4 h-4 mr-2" />
                Share via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Email Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <DialogTitle className="sr-only">Share Summary via Email</DialogTitle>
          <DialogDescription className="sr-only">
            Enter recipient email address to share the AI campaign summary
          </DialogDescription>
          
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Share Summary</h3>
            <button
              onClick={() => {
                setShowShareDialog(false);
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Recipient Email
              </label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail();
                  }
                }}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Preview:</p>
              <p className="text-xs text-gray-500 line-clamp-3">{summary}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowShareDialog(false)}
                variant="outline"
                className="flex-1 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                className="flex-1 bg-[#f26318] hover:bg-[#d45515]"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}