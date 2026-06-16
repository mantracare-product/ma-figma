import { useParams, useNavigate, Link } from "react-router";
import { Play, Pause, FileText, Download, TrendingUp, Clock, Phone, ArrowLeft, GitBranch, RefreshCw, Zap, Star } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Tooltip } from "../components/ui/Tooltip";
import OrganizationSwitcher from "../components/layout/OrganizationSwitcher";
import { toast } from "sonner";
import { useState } from "react";

export default function CallDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Rating & Feedback state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Simulate call relationship data (in a real app, this would come from an API)
  const callRelationship = {
    currentCallId: id,
    parentCallId: id === "1" ? undefined : "1",
    childCallIds: id === "1" ? ["123456789"] : [],
    relationshipReason: id === "1" ? undefined : ("Call Trigger" as const),
    createdOn: id === "1" ? undefined : "Apr 10, 2024 14:42",
  };

  const handleExport = () => {
    setIsExporting(true);
    toast.loading("Exporting data...");

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast.dismiss();
      toast.success("Call details exported successfully");
    }, 2000);
  };

  const handleSaveFeedback = () => {
    setIsSavingFeedback(true);

    // Simulate save process
    setTimeout(() => {
      setIsSavingFeedback(false);
      toast.success("Rating and feedback saved");
    }, 800);
  };

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleStarHover = (value: number) => {
    setHoverRating(value);
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoverRating || rating;

    for (let i = 1; i <= 5; i++) {
      const isFull = displayRating >= i;
      const isHalf = displayRating >= i - 0.5 && displayRating < i;

      stars.push(
        <div
          key={i}
          className="relative cursor-pointer"
          onMouseEnter={() => handleStarHover(i)}
          onMouseLeave={() => setHoverRating(0)}
        >
          {/* Full star for hover/click on right half */}
          <button
            onClick={() => handleStarClick(i)}
            className="absolute inset-0 w-full h-full z-10"
            style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)' }}
          />
          {/* Half star for hover/click on left half */}
          <button
            onClick={() => handleStarClick(i - 0.5)}
            className="absolute inset-0 w-full h-full z-10"
            style={{ clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }}
          />

          <Star
            className={`w-6 h-6 transition-all ${
              isFull
                ? "fill-warning text-warning"
                : isHalf
                ? "fill-warning text-warning"
                : "fill-none text-muted-foreground"
            }`}
            style={
              isHalf
                ? {
                    clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
                  }
                : undefined
            }
          />
          {isHalf && (
            <Star className="w-6 h-6 absolute top-0 left-0 fill-none text-muted-foreground" />
          )}
        </div>
      );
    }

    return stars;
  };

  const getReasonIcon = (reason?: string) => {
    switch (reason) {
      case "Call Trigger":
        return <Zap className="w-4 h-4" />;
      case "Stage Change":
        return <GitBranch className="w-4 h-4" />;
      case "Retry":
        return <RefreshCw className="w-4 h-4" />;
      case "Manual Trigger":
        return <Phone className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip text="Back to Calls">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Tooltip>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Call Details</h1>
            <p className="text-muted-foreground mt-1">Call ID: #{id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tooltip text="Export">
            <Button variant="outline" onClick={handleExport} loading={isExporting}>
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
          <OrganizationSwitcher />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">Sarah Johnson</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium">Apr 10, 2024 at 2:30 PM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">4 minutes 32 seconds</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Outbound</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">Completed</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Process</p>
                <p className="font-medium">Patient Intake</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stage</p>
                <p className="font-medium">Insurance Verification</p>
              </div>
            </div>
          </div>

          {/* Rating & Feedback */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Rating & Feedback</h2>
            <div className="space-y-4">
              {/* Star Rating */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Rating</p>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {renderStars()}
                  </div>
                  {rating > 0 && (
                    <span className="text-sm font-medium text-muted-foreground">
                      {rating} / 5
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add feedback on what should improve and highlight important points from this call..."
                  className="w-full px-4 py-3 bg-input-background border border-input rounded-xl resize-none text-sm min-h-[120px]"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveFeedback}
                  loading={isSavingFeedback}
                  disabled={rating === 0 && !feedback.trim()}
                >
                  Save Feedback
                </Button>
              </div>
            </div>
          </div>

          {/* Call Relationship */}
          {(callRelationship.parentCallId || callRelationship.childCallIds.length > 0) && (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Call Relationship</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Call ID</p>
                  <p className="font-mono font-medium text-sm">#{callRelationship.currentCallId}</p>
                </div>

                {callRelationship.parentCallId && (
                  <>
                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Created From</p>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getReasonIcon(callRelationship.relationshipReason)}
                          <span className="text-xs font-semibold text-primary">
                            {callRelationship.relationshipReason}
                          </span>
                        </div>
                        <Link
                          to={`/call-logs/${callRelationship.parentCallId}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          Call ID: #{callRelationship.parentCallId}
                        </Link>
                        {callRelationship.createdOn && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Created on: {callRelationship.createdOn}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {callRelationship.childCallIds.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Generated Calls</p>
                    <div className="space-y-2">
                      {callRelationship.childCallIds.map((childId) => (
                        <div key={childId} className="p-3 bg-success/5 border border-success/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-success" />
                            <span className="text-xs font-semibold text-success">Call Trigger</span>
                          </div>
                          <Link
                            to={`/call-logs/${childId}`}
                            className="font-mono text-sm text-success hover:underline"
                          >
                            Call ID: #{childId}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            New call created from this call log
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recording & Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recording Player */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recording</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                <div className="flex-1">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/3" />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>1:30</span>
                    <span>4:32</span>
                  </div>
                </div>
                <Tooltip text="Download Recording">
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Transcript</h2>
              <Tooltip text="Download Transcript">
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {[
                { id: 1, speaker: "AI Agent", time: "00:05", text: "Hello, this is MantraAssist calling for Sarah Johnson. Am I speaking with Sarah?" },
                { id: 2, speaker: "Sarah", time: "00:12", text: "Yes, this is Sarah speaking." },
                { id: 3, speaker: "AI Agent", time: "00:15", text: "Great! I'm calling to verify your insurance information for your upcoming appointment. Do you have a few minutes?" },
                { id: 4, speaker: "Sarah", time: "00:22", text: "Yes, I do." },
                { id: 5, speaker: "AI Agent", time: "00:25", text: "Perfect. Can you please confirm your insurance provider?" },
                { id: 6, speaker: "Sarah", time: "00:30", text: "It's Blue Cross Blue Shield." },
                { id: 7, speaker: "AI Agent", time: "00:35", text: "Thank you. And your policy number?" },
                { id: 8, speaker: "Sarah", time: "00:40", text: "It's BC123456789." },
                { id: 9, speaker: "AI Agent", time: "00:48", text: "Excellent. I've verified your insurance information. Your coverage is active and you're all set for your appointment." },
              ].map((line) => (
                <div key={line.id} className="flex gap-4">
                  <span className="text-xs text-muted-foreground w-12">{line.time}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{line.speaker}</p>
                    <p className="text-sm text-foreground mt-1">{line.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <p className="font-medium">Positive Sentiment</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient was cooperative and provided all required information promptly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Call Quality</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clear audio quality throughout. No technical issues detected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Efficiency Score</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Call completed 20% faster than average for this stage. Excellent performance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Key Information Captured</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Insurance Provider: Blue Cross Blue Shield</li>
                  <li>Policy Number: BC123456789</li>
                  <li>Coverage Status: Active</li>
                  <li>Appointment Confirmed: Yes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
