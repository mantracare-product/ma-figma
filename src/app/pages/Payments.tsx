import { useState, useEffect } from "react";
import { CreditCard, Settings, Plus, Trash2, FileText, Star, Check, Download, Users, Zap, Phone, Info, HelpCircle, Sparkles, Mail, Clock, ArrowLeft, Minus, Globe } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import PageHeader from "../components/layout/PageHeader";

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending";
}

export default function Payments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions" | "payments" | "transactions">("plans");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["plans", "subscriptions", "payments", "transactions"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showCreditsExplainedModal, setShowCreditsExplainedModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddSeatsModal, setShowAddSeatsModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(10000);
  const [seats, setSeats] = useState(2);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Plan selection state
  const currentPlan = "professional";
  const currentSeats = 2;
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [selectedSeats, setSelectedSeats] = useState(2);

  // Calculate renewal date (example: 45 days from now)
  const renewalDate = new Date("2026-06-02");
  const today = new Date();
  const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Pricing calculations
  const seatPrice = 79; // per seat per month
  const monthlyCost = seatPrice * seats;
  const annualCost = monthlyCost * 12;
  const creditsIncluded = 240000;
  const bonusCredits = 800;

  // Plan definitions with detailed features
  const planOptions = [
    {
      id: "starter",
      name: "Starter",
      description: "For small teams getting started",
      pricePerUserMonthly: 10,
      pricePerUserAnnual: 10,
      creditsPerUserMonth: 2000,
      estimatedUsage: "400-800 calls/month per user",
      features: {
        "AI Assistant": "Basic AI responses",
        "Contact & Account Data": "Up to 1,000 contacts",
        "CRM Enrichment": "Manual enrichment",
        "API Access": "Basic API",
        "Call Automation": "Outbound calls",
        "Analytics & Reports": "Basic analytics",
        "Integrations": "5+ integrations",
        "Support": "Email support",
      },
      badge: null,
    },
    {
      id: "basic",
      name: "Basic",
      description: "For growing teams with regular usage",
      pricePerUserMonthly: 49,
      pricePerUserAnnual: 49,
      creditsPerUserMonth: 20000,
      estimatedUsage: "4,000-8,000 calls/month per user",
      features: {
        "AI Assistant": "Advanced AI with training",
        "Contact & Account Data": "Up to 10,000 contacts",
        "CRM Enrichment": "Automatic enrichment",
        "API Access": "Standard API",
        "Call Automation": "Inbound & outbound calls",
        "Analytics & Reports": "Standard analytics",
        "Integrations": "15+ integrations",
        "Support": "Priority email support",
      },
      badge: null,
    },
    {
      id: "professional",
      name: "Professional",
      description: "For teams scaling their operations",
      pricePerUserMonthly: 79,
      pricePerUserAnnual: 79,
      creditsPerUserMonth: 50000,
      estimatedUsage: "10,000-20,000 calls/month per user",
      features: {
        "AI Assistant": "Advanced AI with custom training",
        "Contact & Account Data": "Up to 50,000 contacts",
        "CRM Enrichment": "Real-time enrichment",
        "API Access": "Full API access",
        "Call Automation": "Advanced routing & IVR",
        "Analytics & Reports": "Advanced analytics & custom reports",
        "Integrations": "Unlimited integrations",
        "Support": "Priority phone & chat support",
      },
      badge: "Most Popular",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations with custom needs",
      pricePerUserMonthly: null,
      pricePerUserAnnual: null,
      creditsPerUserMonth: null,
      estimatedUsage: "Flexible credits based on usage",
      features: {
        "AI Assistant": "Custom AI models & fine-tuning",
        "Contact & Account Data": "Unlimited contacts",
        "CRM Enrichment": "Custom enrichment rules",
        "API Access": "Enterprise API with SLA",
        "Call Automation": "Custom routing & advanced IVR",
        "Analytics & Reports": "Enterprise analytics & BI tools",
        "Integrations": "Custom integrations & SSO",
        "Support": "24/7 dedicated support + account manager",
      },
      badge: null,
    },
  ];


  const sidebarTabs = [
    { id: "plans", label: "Plans", icon: Star },
    { id: "subscriptions", label: "Subscriptions", icon: Settings },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "transactions", label: "Transactions", icon: FileText },
  ];

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: "1", type: "Visa", last4: "4242", expiry: "12/2026", isDefault: true },
    { id: "2", type: "Mastercard", last4: "8888", expiry: "09/2025", isDefault: false },
  ]);

  const invoices: Invoice[] = [
    { id: "INV-2026-004", date: "Apr 1, 2026", amount: 149, status: "paid" },
    { id: "INV-2026-003", date: "Mar 1, 2026", amount: 149, status: "paid" },
    { id: "INV-2026-002", date: "Feb 1, 2026", amount: 149, status: "paid" },
  ];

  const handleSetDefaultPayment = (methodId: string) => {
    setPaymentMethods(
      paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      }))
    );
    toast.success("Default payment method updated");
  };

  const handleDeletePayment = (methodId: string) => {
    setPaymentMethods(paymentMethods.filter((method) => method.id !== methodId));
    toast.success("Payment method removed");
  };

  const handleBuyCredits = () => {
    const price = (creditAmount * 0.1).toFixed(2);
    toast.success(`Purchased ${creditAmount.toLocaleString()} credits for $${price}`);
    setShowBuyCreditsModal(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "plans":
        return renderPlansPage();
      case "subscriptions":
        return renderSubscriptionsPage();
      case "payments":
        return renderPaymentsPage();
      case "transactions":
        return renderTransactionsPage();
      default:
        return null;
    }
  };

  const renderPlansPage = () => {
    // Calculate pricing changes
    const hasChanges = selectedSeats !== currentSeats || selectedPlan !== currentPlan;
    const selectedPlanData = planOptions.find(p => p.id === selectedPlan);
    const currentPlanData = planOptions.find(p => p.id === currentPlan);

    const selectedPricePerUser = billingCycle === "annual"
      ? (selectedPlanData?.pricePerUserAnnual || 0)
      : (selectedPlanData?.pricePerUserMonthly || 0);

    const currentPricePerUser = billingCycle === "annual"
      ? (currentPlanData?.pricePerUserAnnual || 0)
      : (currentPlanData?.pricePerUserMonthly || 0);

    const selectedMonthlyTotal = selectedPricePerUser * selectedSeats;
    const selectedAnnualTotal = selectedMonthlyTotal * 12;

    const currentMonthlyTotal = currentPricePerUser * currentSeats;
    const currentAnnualTotal = currentMonthlyTotal * 12;

    const addedSeats = Math.max(0, selectedSeats - currentSeats);
    const pendingAmount = billingCycle === "annual"
      ? selectedAnnualTotal - currentAnnualTotal
      : selectedMonthlyTotal - currentMonthlyTotal;

    return (
      <div className="space-y-6 pb-6 relative">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Plans</h2>
            <p className="text-sm text-muted-foreground">Compare plans and find the right fit for your team</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-1 border border-border">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-primary">Save 20%</span>
            </button>
          </div>
        </div>

        {/* User Count Selector */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">How many users do you have?</h3>
              <p className="text-sm text-muted-foreground">
                Adjust your team size to see updated pricing
              </p>
            </div>
            <div className="flex items-center gap-4 bg-muted/30 rounded-xl px-6 py-3 border border-border">
              <button
                onClick={() => setSelectedSeats(Math.max(1, selectedSeats - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
                disabled={selectedSeats <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-20 text-center">
                <p className="text-3xl font-bold">{selectedSeats}</p>
                <p className="text-xs text-muted-foreground mt-1">users</p>
              </div>
              <button
                onClick={() => setSelectedSeats(selectedSeats + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planOptions.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan && selectedSeats === currentSeats;
          const isSelectedPlan = plan.id === selectedPlan;
          const pricePerUser = billingCycle === "annual" ? plan.pricePerUserAnnual : plan.pricePerUserMonthly;
          const monthlyTotal = (pricePerUser || 0) * selectedSeats;
          const annualTotal = monthlyTotal * 12;
          const totalCredits = (plan.creditsPerUserMonth || 0) * selectedSeats;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`bg-card rounded-xl p-6 border-2 transition-all cursor-pointer ${
                isSelectedPlan
                  ? "border-primary shadow-lg"
                  : plan.badge
                  ? "border-primary/50 shadow-md relative"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary text-xs font-semibold rounded-full">
                    Current Plan
                  </span>
                </div>
              )}
              {isSelectedPlan && !isCurrentPlan && (
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    Selected
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

              {/* Pricing */}
              {pricePerUser !== null ? (
                <div className="mb-6">
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-primary">${monthlyTotal}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${pricePerUser}/user/mo × {selectedSeats} users
                    </p>
                  </div>
                  {billingCycle === "annual" && (
                    <p className="text-xs text-muted-foreground">
                      Billed annually: <span className="font-semibold">${annualTotal.toLocaleString()}/yr</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-2xl font-bold text-primary mb-2">Custom pricing</p>
                  <p className="text-xs text-muted-foreground">Contact sales for a quote</p>
                </div>
              )}

              {/* Credits */}
              {plan.creditsPerUserMonth !== null && (
                <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-primary">Credits Included</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCreditsExplainedModal(true);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-3xl font-bold mb-1">{totalCredits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {plan.creditsPerUserMonth.toLocaleString()} credits/user/month × {selectedSeats} users
                  </p>
                  <div className="pt-3 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Estimated usage:</span> {plan.estimatedUsage}
                    </p>
                  </div>
                </div>
              )}
              {plan.creditsPerUserMonth === null && (
                <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2">Flexible Credits</p>
                  <p className="text-xs text-muted-foreground">{plan.estimatedUsage}</p>
                </div>
              )}

              {/* Features */}
              <div className="space-y-3 mb-6">
                {Object.entries(plan.features).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{key}</p>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {plan.id === "enterprise" ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info("Contact sales@example.com");
                  }}
                >
                  Talk to Sales
                </Button>
              ) : (
                <Button
                  variant={isSelectedPlan ? "primary" : "outline"}
                  className="w-full"
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? "Current Plan" : isSelectedPlan ? "Selected" : "Select Plan"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* How Credits Work Section */}
      <div className="mt-12 bg-card rounded-xl p-8 border border-border">
        <h2 className="text-2xl font-bold mb-6">How Credits Work</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Explanation */}
          <div>
            <p className="text-muted-foreground mb-6">
              Credits are the unified currency for all platform activities. Each action consumes credits based on usage and complexity. Choose a plan that matches your expected monthly volume.
            </p>

            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <h3 className="font-semibold mb-3 text-sm">Pricing Transparency</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1 minute call</span>
                  <span className="font-medium">≈ 5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1 SMS message</span>
                  <span className="font-medium">≈ 1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1 AI conversation</span>
                  <span className="font-medium">≈ 10-50 credits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1 webhook event</span>
                  <span className="font-medium">≈ 0.5 credits</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Usage Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Voice Calls */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">AI Voice Calls</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Charged per minute based on call duration and AI processing
              </p>
            </div>

            {/* AI Messaging */}
            <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 border border-secondary/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-secondary" />
                <h4 className="font-semibold text-sm">AI Messaging</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Charged per message or session based on AI interactions
              </p>
            </div>

            {/* International Usage */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-sm">International Usage</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Region-based pricing for calls and messages outside your country
              </p>
            </div>

            {/* Webhooks & Automation */}
            <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 border border-secondary/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-secondary" />
                <h4 className="font-semibold text-sm">Webhooks & Automation</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Charged per event trigger and API call
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Summary Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 mt-8 bg-card border-t-2 border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between gap-8">
              {/* Left Section - Inline Summary */}
              <div className="flex items-center gap-6 text-sm whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{currentPlanData?.name || "Professional"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-primary">{selectedPlanData?.name || "Professional"}</span>
                </div>

                <div className="w-px h-4 bg-border"></div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{currentSeats}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-primary">{selectedSeats} users</span>
                  {addedSeats > 0 && (
                    <span className="text-secondary font-medium">(+{addedSeats})</span>
                  )}
                </div>

                <div className="w-px h-4 bg-border"></div>

                <div>
                  <span className="text-muted-foreground capitalize">{billingCycle}</span>
                </div>

                <div className="w-px h-4 bg-border"></div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">
                    ${billingCycle === "annual" ? selectedAnnualTotal.toLocaleString() : selectedMonthlyTotal.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {billingCycle === "annual" ? "/yr" : "/mo"}
                  </span>
                  {pendingAmount > 0 && (
                    <>
                      <span className="text-muted-foreground mx-2">·</span>
                      <span className="text-lg font-semibold text-secondary">
                        +${pendingAmount.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Section - CTA */}
              <Button
                variant="primary"
                size="sm"
                disabled={!hasChanges}
                onClick={() => {
                  toast.success(`Upgrading to ${selectedPlanData?.name} plan with ${selectedSeats} seats`);
                  setActiveTab("subscriptions");
                }}
              >
                Confirm Changes
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Changes will update your subscription pricing. Additional seats or plan upgrades may be charged immediately.
            </p>
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderSubscriptionsPage = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">Professional Plan (Annual)</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Plan renews in {daysUntilRenewal} days
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your plan renews every 12 months. Your next charge will be on{" "}
              <span className="font-medium text-foreground">
                {renewalDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </p>
          </div>
          <Button variant="outline" onClick={() => setActiveTab("plans")}>
            Change Plan
          </Button>
        </div>
      </div>

      {/* What's Included Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold">What's Included</h3>
        </div>

        <div className="divide-y divide-border">
          {/* Seats Row */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Seats</p>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Professional × {seats} seats</p>
              <button
                onClick={() => setShowAddSeatsModal(true)}
                className="text-sm text-primary hover:underline font-medium"
              >
                + Add seats
              </button>
            </div>
            <div className="w-32 text-right">
              <p className="font-semibold">${monthlyCost}/mo</p>
            </div>
          </div>

          {/* Credits Included Row */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Credits</p>
                <button
                  onClick={() => setShowCreditsExplainedModal(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{creditsIncluded.toLocaleString()} credits / yr</p>
            </div>
            <div className="w-32 text-right">
              <p className="text-sm text-muted-foreground">Included</p>
            </div>
          </div>

          {/* Add-on Credits Row */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Add-on Credits</p>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{bonusCredits.toLocaleString()} Bonus Credits</p>
              <button
                onClick={() => setShowBuyCreditsModal(true)}
                className="text-sm text-primary hover:underline font-medium"
              >
                + Add more credits
              </button>
            </div>
            <div className="w-32 text-right">
              <p className="text-sm font-medium text-secondary">Free</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-2 bg-muted/30"></div>

          {/* Monthly Subtotal */}
          <div className="px-6 py-4 flex items-center justify-between bg-muted/10">
            <div className="flex-1">
              <p className="font-medium">Monthly Subtotal</p>
            </div>
            <div className="flex-1"></div>
            <div className="w-32 text-right">
              <p className="text-lg font-semibold">${monthlyCost}/mo</p>
            </div>
          </div>

          {/* Annual Total */}
          <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex-1">
              <p className="text-lg font-bold">Annual Total</p>
              <p className="text-xs text-muted-foreground mt-1">Billed annually on {renewalDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="flex-1"></div>
            <div className="w-32 text-right">
              <p className="text-3xl font-bold text-primary">${annualCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">per year</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentsPage = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Payment Method Section */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Payment Method</h3>
          <Button variant="outline" size="sm" onClick={() => setShowAddPaymentModal(true)}>
            <Plus className="w-4 h-4" />
            Add Card
          </Button>
        </div>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {method.type} •••• {method.last4}
                    </p>
                    {method.isDefault && (
                      <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!method.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefaultPayment(method.id)}>
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePayment(method.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Details Section */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Billing Details</h3>
          <Button variant="outline" size="sm">
            Update Billing Info
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Company Name</p>
            <p className="font-medium mt-1">Healthcare Org</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tax ID</p>
            <p className="font-medium mt-1">US-123456789</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Billing Address</p>
            <p className="font-medium mt-1">123 Healthcare Ave, Suite 100, San Francisco, CA 94102</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionsPage = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Invoices Section */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <p className="text-sm text-muted-foreground mt-1">View all invoices and payment records</p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Invoice ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Download</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border hover:bg-muted/10">
                  <td className="px-4 py-3 text-sm">{invoice.date}</td>
                  <td className="px-4 py-3 text-sm font-medium">{invoice.id}</td>
                  <td className="px-4 py-3 text-sm">Professional Plan - Annual</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">${invoice.amount}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-primary hover:text-primary/80">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <PageHeader
          title="Billing"
          subtitle="Manage plans, subscriptions, and payments"
        />
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-card rounded-xl border border-border p-2 sticky top-6">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>


      {/* Buy Credits Modal */}
      <Modal
        isOpen={showBuyCreditsModal}
        onClose={() => setShowBuyCreditsModal(false)}
        title="Buy Credits"
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBuyCreditsModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBuyCredits}>
              Buy Credits - ${(creditAmount * 0.1).toFixed(2)}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[10000, 50000, 100000].map((amount) => (
              <button
                key={amount}
                onClick={() => setCreditAmount(amount)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  creditAmount === amount
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold">{(amount / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">${(amount * 0.1).toFixed(0)}</p>
              </button>
            ))}
            <button
              onClick={() => setCreditAmount(0)}
              className={`p-4 rounded-xl border-2 transition-all ${
                ![10000, 50000, 100000].includes(creditAmount)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-semibold">Custom</p>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Credits Amount</label>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={creditAmount}
              onChange={(e) => setCreditAmount(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1K</span>
              <span>200K</span>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-6 border border-border">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{creditAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost per credit</p>
                <p className="text-lg font-semibold">$0.10</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <p className="font-semibold">Total</p>
              <p className="text-3xl font-bold text-primary">${(creditAmount * 0.1).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Credits Explained Modal */}
      <Modal
        isOpen={showCreditsExplainedModal}
        onClose={() => setShowCreditsExplainedModal(false)}
        title="What are Credits?"
        maxWidth="2xl"
        footer={
          <Button variant="primary" onClick={() => {
            setShowCreditsExplainedModal(false);
            setShowBuyCreditsModal(true);
          }}>
            Buy Credits
          </Button>
        }
      >
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Credits are the unified currency for all actions in your account. Different actions consume different amounts of credits.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Email</h4>
              </div>
              <p className="text-2xl font-bold mb-1">1 credit</p>
              <p className="text-sm text-muted-foreground">Per email sent</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Phone Call</h4>
              </div>
              <p className="text-2xl font-bold mb-1">5 credits</p>
              <p className="text-sm text-muted-foreground">Per call initiated</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">AI Process</h4>
              </div>
              <p className="text-2xl font-bold mb-1">Variable</p>
              <p className="text-sm text-muted-foreground">Based on complexity</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Call Minutes</h4>
              </div>
              <p className="text-2xl font-bold mb-1">1 credit</p>
              <p className="text-sm text-muted-foreground">Per minute</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title="Add Payment Method"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Payment method added successfully");
                setShowAddPaymentModal(false);
              }}
            >
              Add Method
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Card Number" placeholder="1234 5678 9012 3456" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expiry Date" placeholder="MM/YY" />
            <Input label="CVV" placeholder="123" type="password" />
          </div>
          <Input label="Cardholder Name" placeholder="John Doe" />
        </div>
      </Modal>

      {/* Add Seats Modal */}
      <Modal
        isOpen={showAddSeatsModal}
        onClose={() => setShowAddSeatsModal(false)}
        title="Add Seats"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddSeatsModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`Updated to ${seats} seats`);
                setShowAddSeatsModal(false);
              }}
            >
              Update Seats - ${seatPrice * seats}/mo
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Number of Seats</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSeats(Math.max(1, seats - 1))}
                disabled={seats <= 1}
              >
                -
              </Button>
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold">{seats}</p>
                <p className="text-xs text-muted-foreground mt-1">seats</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSeats(seats + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-muted-foreground">Price per seat</p>
              <p className="font-medium">${seatPrice}/mo</p>
            </div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-muted-foreground">Number of seats</p>
              <p className="font-medium">{seats}</p>
            </div>
            <div className="pt-3 border-t border-border flex justify-between items-center">
              <p className="font-semibold">Monthly Total</p>
              <p className="text-2xl font-bold text-primary">${seatPrice * seats}/mo</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Annual total: ${(seatPrice * seats * 12).toLocaleString()}/yr
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
