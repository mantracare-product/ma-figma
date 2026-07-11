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
          { path: "web-forms", Component: WebForms },
          { path: "web-forms/new", Component: NewFormTemplate },
          { path: "web-forms/builder", Component: FormBuilder },
          { path: "web-forms/test", Component: WebFormsTest },
          { path: "web-forms/test/:formId", Component: WebFormsTest },
          { path: "organizations", Component: Organizations },
          { path: "users", Component: UserManagement },
          { path: "payments", Component: Payments },
          { path: "transactions", Component: Transactions },
          { path: "settings", Component: Settings },
          { path: "settings/team/:id", Component: ManageTeamMember },
          { path: "services", Component: Services },
          { path: "appointments", Component: Appointments },
          { path: "chats", Component: Chats },
          { path: "profile", Component: Profile },
          { path: "guide", Component: GuidePageRoute },
          { path: "guide/:slug", Component: GuidePageRoute },
        ],
      },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
