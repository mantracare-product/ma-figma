import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Overview from "./pages/Overview";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import CallLogs from "./pages/CallLogs";
import CallDetails from "./pages/CallDetails";
import Deals from "./pages/Deals";
import Process from "./pages/Process";
import KnowledgeBase from "./pages/KnowledgeBase";
import WebForms from "./pages/WebForms";
import NewFormTemplate from "./pages/NewFormTemplate";
import FormBuilder from "./pages/FormBuilder";
import WebFormsTest from "./pages/WebFormsTest";
import Organizations from "./pages/Organizations";
import UserManagement from "./pages/UserManagement";
import Payments from "./pages/Payments";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ManageTeamMember from "./pages/ManageTeamMember";
import Services from "./pages/Services";
import Appointments from "./pages/Appointments";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Chats from "./pages/Chats";
import NotFound from "./pages/NotFound";
import GuidePageRoute from "./pages/GuidePageRoute";
import ReferAndEarn from "./pages/ReferAndEarn";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import AIScribeConsole from "./pages/AIScribeConsole";
import RevenueCycleLayout from "./components/rcm/RevenueCycleLayout";
import RevenueOverview from "./pages/rcm/RevenueOverview";
import ClaimsList from "./pages/rcm/ClaimsList";
import EncountersList from "./pages/rcm/EncountersList";
import EligibilityWorklist from "./pages/rcm/EligibilityWorklist";
import DenialBoard from "./pages/rcm/DenialBoard";
import RejectionsWorklist from "./pages/rcm/RejectionsWorklist";
import PaymentPostingWorklist from "./pages/rcm/PaymentPostingWorklist";
import PendingDocsWorklist from "./pages/rcm/PendingDocsWorklist";
import PatientBalances from "./pages/rcm/PatientBalances";
import BillingHub from "./pages/rcm/BillingHub";
import BillingRules from "./pages/rcm/BillingRules";
import FeeSchedule from "./pages/rcm/FeeSchedule";
import PriorAuthList from "./pages/rcm/PriorAuthList";
import CredentialingList from "./pages/rcm/CredentialingList";
import PayerPerformance from "./pages/rcm/PayerPerformance";
import RevenueAnalysis from "./pages/rcm/RevenueAnalysis";
import InsuranceIntake from "./pages/rcm/InsuranceIntake";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: MainLayout,
        children: [
          { index: true, Component: Overview },
          { path: "scribe", Component: AIScribeConsole },
          {
            path: "clients",
            Component: Clients,
            children: [
              { path: ":id", Component: ClientProfile }
            ]
          },
          { path: "call-logs", Component: CallLogs },
          { path: "call-logs/:id", Component: CallDetails },
          { path: "deals", Component: Deals },
          { path: "process", Component: Process },
          { path: "knowledge-base", Component: KnowledgeBase },
          { path: "web-forms", Component: WebForms },
          { path: "web-forms/new", Component: NewFormTemplate },
          { path: "web-forms/builder", Component: FormBuilder },
          { path: "web-forms/test", Component: WebFormsTest },
          { path: "web-forms/test/:formId", Component: WebFormsTest },
          { path: "organizations", Component: Organizations },
          { path: "users", Component: UserManagement },
          { path: "payments", Component: Payments },
          { path: "invoices", Component: Invoices },
          { path: "reports", Component: Reports },
          { path: "transactions", Component: Transactions },
          { path: "settings", Component: Settings },
          { path: "settings/team/:id", Component: ManageTeamMember },
          { path: "services", Component: Services },
          { path: "appointments", Component: Appointments },
          { path: "chats", Component: Chats },
          { path: "profile", Component: Profile },
          { path: "guide", Component: GuidePageRoute },
          { path: "guide/:slug", Component: GuidePageRoute },
          { path: "refer-and-earn", Component: ReferAndEarn },
          {
            path: "revenue-cycle",
            Component: RevenueCycleLayout,
            children: [
              { index: true, Component: RevenueOverview },
              { path: "overview", Component: RevenueOverview },
              { path: "payer-performance", Component: PayerPerformance },
              { path: "revenue-analysis", Component: RevenueAnalysis },
              { path: "insurance-intake", Component: InsuranceIntake },
              { path: "eligibility", Component: EligibilityWorklist },
              { path: "encounters", Component: EncountersList },
              { path: "claims", Component: ClaimsList },
              { path: "billing", Component: BillingHub },
              { path: "patient-balances", Component: PatientBalances },
              { path: "worklist/denials", Component: DenialBoard },
              { path: "worklist/rejections", Component: RejectionsWorklist },
              { path: "worklist/posting", Component: PaymentPostingWorklist },
              { path: "worklist/pending-docs", Component: PendingDocsWorklist },
              { path: "credentialing", Component: CredentialingList },
              { path: "automation/rules", Component: BillingRules },
              { path: "automation/prior-auth", Component: PriorAuthList },
              { path: "automation/fee-schedule", Component: FeeSchedule },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
