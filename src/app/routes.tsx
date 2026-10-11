import { createBrowserRouter } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";
import SettingsGuard from "./components/auth/SettingsGuard";
import Overview from "./pages/Overview";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import CallLogs from "./pages/CallLogs";
import CallDetails from "./pages/CallDetails";
import Deals from "./pages/Deals";
import Process from "./pages/Process";
import Automation from "./pages/Automation";
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
import Claims from "./pages/Claims";
import AdminCustomFields from "./pages/admin/AdminCustomFields";
import AdminIndustries from "./pages/admin/AdminIndustries";
import AdminProcessTemplates from "./pages/admin/AdminProcessTemplates";
import { AvatarReceptionView } from "../reception/avatar/AvatarReceptionView";
import AdminAutomations from "./pages/admin/AdminAutomations";
import AdminDocumentTemplates from "./pages/admin/AdminDocumentTemplates";
import PatientPortalLayout from "./pages/patient/PatientPortalLayout";
import PatientStatusScreen from "./pages/patient/PatientStatusScreen";
import PatientCheckinScreen from "./pages/patient/PatientCheckinScreen";
import PatientBookingScreen from "./pages/patient/PatientBookingScreen";
import PatientPharmacyScreen from "./pages/patient/PatientPharmacyScreen";
import PatientBillScreen from "./pages/patient/PatientBillScreen";
import PatientPaymentScreen from "./pages/patient/PatientPaymentScreen";

export const router = createBrowserRouter([
  {
    path: "/reception",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/landing",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/appointment",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/walk-in",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/billing",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/billing/:subStep",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/directions",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/directions/:categoryId",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/directions/:categoryId/:roomId",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/my-visit",
    Component: AvatarReceptionView,
  },
  {
    path: "/reception/avatar",
    Component: AvatarReceptionView,
  },
  {
    path: "/patient",
    Component: PatientPortalLayout,
    children: [
      { index: true, Component: PatientStatusScreen },
      { path: "status", Component: PatientStatusScreen },
      { path: "checkin", Component: PatientCheckinScreen },
      { path: "book", Component: PatientBookingScreen },
      { path: "pharmacy", Component: PatientPharmacyScreen },
      { path: "bill", Component: PatientBillScreen },
      { path: "pay", Component: PatientPaymentScreen },
    ],
  },
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
          { path: "automation", Component: Automation },
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
          { path: "claims", Component: Claims },
          { path: "reports", Component: Reports },
          { path: "transactions", Component: Transactions },
          {
            Component: SettingsGuard,
            children: [
              { path: "settings", Component: Settings },
              { path: "settings/:tab", Component: Settings },
              { path: "settings/billing/:subtab", Component: Settings },
              { path: "settings/team/:id", Component: ManageTeamMember },
            ],
          },
          { path: "services", Component: Services },
          { path: "appointments", Component: Appointments },
          { path: "chats", Component: Chats },
          { path: "profile", Component: Profile },
          { path: "guide", Component: GuidePageRoute },
          { path: "guide/:slug", Component: GuidePageRoute },
          { path: "refer-and-earn", Component: ReferAndEarn },
        ],
      },
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminCustomFields },
          { path: "custom-fields", Component: AdminCustomFields },
          { path: "industries", Component: AdminIndustries },
          { path: "industry", Component: AdminIndustries },
          { path: "industry-category", Component: AdminIndustries },
          { path: "workflows", Component: AdminProcessTemplates },
          { path: "workflow", Component: AdminProcessTemplates },
          { path: "process-templates", Component: AdminProcessTemplates },
          { path: "process-template", Component: AdminProcessTemplates },
          { path: "automations", Component: AdminAutomations },
          { path: "automation", Component: AdminAutomations },
          { path: "document-templates", Component: AdminDocumentTemplates },
          { path: "document-template", Component: AdminDocumentTemplates },
          { path: "users", Component: UserManagement },
          { path: "organizations", Component: Organizations },
          { path: "forms", Component: WebForms },
          { path: "settings", Component: Settings },
          { path: "reports", Component: Reports },
        ],
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
