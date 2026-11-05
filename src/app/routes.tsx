import { lazy, Suspense, ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";
import SettingsGuard from "./components/auth/SettingsGuard";
import Login from "./pages/auth/Login";
import PageContentLoader from "./components/layout/PageContentLoader";

const PageLoading = () => <PageContentLoader />;

function withLazy(factory: () => Promise<any>, exportName = "default"): ComponentType<any> {
  const LazyComponent = lazy(async () => {
    const mod = await factory();
    const Component = (mod as any)[exportName] || (mod as any).default;
    return { default: Component };
  });

  return function LazyRouteWrapper(props: any) {
    return (
      <Suspense fallback={<PageLoading />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Route components loaded lazily on demand to keep initial JS payload minimal and prevent Vercel main-thread freeze
const Overview = withLazy(() => import("./pages/Overview"));
const Clients = withLazy(() => import("./pages/Clients"));
const ClientProfile = withLazy(() => import("./pages/ClientProfile"));
const CallLogs = withLazy(() => import("./pages/CallLogs"));
const CallDetails = withLazy(() => import("./pages/CallDetails"));
const Deals = withLazy(() => import("./pages/Deals"));
const Process = withLazy(() => import("./pages/Process"));
const Tasks = withLazy(() => import("./pages/Tasks"));
const Automation = withLazy(() => import("./pages/Automation"));
const KnowledgeBase = withLazy(() => import("./pages/KnowledgeBase"));
const WebForms = withLazy(() => import("./pages/WebForms"));
const NewFormTemplate = withLazy(() => import("./pages/NewFormTemplate"));
const FormBuilder = withLazy(() => import("./pages/FormBuilder"));
const WebFormsTest = withLazy(() => import("./pages/WebFormsTest"));
const Organizations = withLazy(() => import("./pages/Organizations"));
const UserManagement = withLazy(() => import("./pages/UserManagement"));
const Payments = withLazy(() => import("./pages/Payments"));
const Transactions = withLazy(() => import("./pages/Transactions"));
const Settings = withLazy(() => import("./pages/Settings"));
const Profile = withLazy(() => import("./pages/Profile"));
const ManageTeamMember = withLazy(() => import("./pages/ManageTeamMember"));
const Services = withLazy(() => import("./pages/Services"));
const Appointments = withLazy(() => import("./pages/Appointments"));
const Signup = withLazy(() => import("./pages/auth/Signup"));
const InviteAcceptance = withLazy(() => import("./pages/auth/InviteAcceptance"));
const PaymentScreen = withLazy(() => import("./pages/auth/PaymentScreen"));
const Onboarding = withLazy(() => import("./pages/auth/Onboarding"));
const Pricing = withLazy(() => import("./pages/Pricing"));
const Chats = withLazy(() => import("./pages/Chats"));
const NotFound = withLazy(() => import("./pages/NotFound"));
const GuidePageRoute = withLazy(() => import("./pages/GuidePageRoute"));
const ReferAndEarn = withLazy(() => import("./pages/ReferAndEarn"));
const Invoices = withLazy(() => import("./pages/Invoices"));
const Reports = withLazy(() => import("./pages/Reports"));
const AIScribeConsole = withLazy(() => import("./pages/AIScribeConsole"));
const Claims = withLazy(() => import("./pages/Claims"));
const AdminCustomFields = withLazy(() => import("./pages/admin/AdminCustomFields"));
const AdminIndustries = withLazy(() => import("./pages/admin/AdminIndustries"));
const AdminProcessTemplates = withLazy(() => import("./pages/admin/AdminProcessTemplates"));
const AvatarReceptionView = withLazy(() => import("../reception/avatar/AvatarReceptionView"), "AvatarReceptionView");
const AdminAutomations = withLazy(() => import("./pages/admin/AdminAutomations"));
const AdminDocumentTemplates = withLazy(() => import("./pages/admin/AdminDocumentTemplates"));
const AdminFormTemplates = withLazy(() => import("./pages/admin/AdminFormTemplates"));
const PatientPortalLayout = withLazy(() => import("./pages/patient/PatientPortalLayout"));
const PatientStatusScreen = withLazy(() => import("./pages/patient/PatientStatusScreen"));
const PatientBookingScreen = withLazy(() => import("./pages/patient/PatientBookingScreen"));
const PatientPharmacyScreen = withLazy(() => import("./pages/patient/PatientPharmacyScreen"));
const PatientBillScreen = withLazy(() => import("./pages/patient/PatientBillScreen"));
const PatientPaymentScreen = withLazy(() => import("./pages/patient/PatientPaymentScreen"));
const PatientLoginScreen = withLazy(() => import("./pages/patient/PatientLoginScreen"));
const PatientDocumentsScreen = withLazy(() => import("./pages/patient/PatientDocumentsScreen"));
const PatientFormsScreen = withLazy(() => import("./pages/patient/PatientFormsScreen"));
const PatientFormFillScreen = withLazy(() => import("./pages/patient/PatientFormFillScreen"));
const PatientProfileScreen = withLazy(() => import("./pages/patient/PatientProfileScreen"));
const PatientCareBotScreen = withLazy(() => import("./pages/patient/PatientCareBotScreen"));
const PatientMessagesScreen = withLazy(() => import("./pages/patient/PatientMessagesScreen"));
const AdminAIVoicesModels = withLazy(() => import("./pages/admin/AdminAIVoicesModels"));
const AdminPlans = withLazy(() => import("./pages/admin/AdminPlans"));
const AdminBilling = withLazy(() => import("./pages/admin/AdminBilling"));
const AdminProductsServices = withLazy(() => import("./pages/admin/AdminProductsServices"));
const AdminKnowledgeBase = withLazy(() => import("./pages/admin/AdminKnowledgeBase"));
const AdminRolesPermissions = withLazy(() => import("./pages/admin/AdminRolesPermissions"));
const AdminSidebarConfig = withLazy(() => import("./pages/admin/AdminSidebarConfig"));

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
      { path: "login", Component: PatientLoginScreen },
      { path: "status", Component: PatientStatusScreen },
      { path: "checkin", Component: PatientStatusScreen },
      { path: "book", Component: PatientBookingScreen },
      { path: "documents", Component: PatientDocumentsScreen },
      { path: "forms", Component: PatientFormsScreen },
      { path: "forms/:formId", Component: PatientFormFillScreen },
      { path: "profile", Component: PatientProfileScreen },
      { path: "pharmacy", Component: PatientPharmacyScreen },
      { path: "bill", Component: PatientBillScreen },
      { path: "pay", Component: PatientPaymentScreen },
      { path: "messages", Component: PatientMessagesScreen },
      { path: "care-bot", Component: PatientCareBotScreen },
      { path: "bot", Component: PatientCareBotScreen },
      { path: ":clientId", Component: PatientStatusScreen },
    ],
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/verify",
    Component: Login,
  },
  {
    path: "/pricing",
    Component: Pricing,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/invite",
    Component: InviteAcceptance,
  },
  {
    path: "/invite/:token",
    Component: InviteAcceptance,
  },
  {
    path: "/payment",
    Component: PaymentScreen,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/onbaording",
    Component: Onboarding,
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
          { path: "tasks", Component: Tasks },
          { path: "automation", Component: Automation },
          { path: "knowledge-base", Component: KnowledgeBase },
          { path: "forms", element: <Navigate to="/web-forms" replace /> },
          { path: "forms/:id", element: <Navigate to="/web-forms" replace /> },
          { path: "web-forms", Component: WebForms },
          { path: "web-forms/new", element: <Navigate to="/web-forms" replace /> },
          { path: "web-forms/builder", element: <Navigate to="/web-forms" replace /> },
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
              { path: "settings/:tab/:subtab", Component: Settings },
              { path: "settings/billing/:subtab", Component: Settings },
              { path: "settings/team/:id", Component: ManageTeamMember },
              { path: "billing", Component: Settings },
              { path: "billing/:subtab", Component: Settings },
            ],
          },
          { path: "services", Component: Services },
          { path: "roles", element: <Navigate to="/settings/team?tab=roles" replace /> },
          { path: "appointments", Component: Appointments },
          { path: "chats", Component: Chats },
          { path: "email-agent", element: <Navigate to="/chats?channel=email&subMode=agent" replace /> },
          { path: "agents/email-agent", element: <Navigate to="/chats?channel=email&subMode=agent" replace /> },
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
          { path: "ai-voices-models", Component: AdminAIVoicesModels },
          { path: "ai-voices", Component: AdminAIVoicesModels },
          { path: "voice-config", Component: AdminAIVoicesModels },
          { path: "document-templates", Component: AdminDocumentTemplates },
          { path: "document-template", Component: AdminDocumentTemplates },
          { path: "users", Component: UserManagement },
          { path: "organizations", Component: Organizations },
          { path: "forms", Component: AdminFormTemplates },
          { path: "form-templates", Component: AdminFormTemplates },
          { path: "form-builder", element: <Navigate to="/admin/forms" replace /> },
          { path: "form-builder/:formId", element: <Navigate to="/admin/forms" replace /> },
          { path: "services", Component: AdminProductsServices },
          { path: "products-services", Component: AdminProductsServices },
          { path: "product-services", Component: AdminProductsServices },
          { path: "industry-services", Component: AdminProductsServices },
          { path: "knowledge-base", Component: AdminKnowledgeBase },
          { path: "knowledge", Component: AdminKnowledgeBase },
          { path: "roles", Component: AdminRolesPermissions },
          { path: "roles-permissions", Component: AdminRolesPermissions },
          { path: "roles-and-permissions", Component: AdminRolesPermissions },
          { path: "sidebar-config", Component: AdminSidebarConfig },
          { path: "sidebar", Component: AdminSidebarConfig },
          { path: "sidebar-templates", Component: AdminSidebarConfig },
          { path: "plans", Component: AdminPlans },
          { path: "plans-credits", Component: AdminPlans },
          { path: "billing", Component: AdminBilling },
          { path: "subscriptions", Component: AdminBilling },
          { path: "credits", Component: AdminPlans },
          { path: "settings", Component: Settings },
          { path: "tasks", Component: Tasks },
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
