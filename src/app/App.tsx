import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AIProviderProvider } from "./context/AIProviderContext";
import { AuthProvider } from "./context/AuthContext";
import { HowItWorksProvider } from "./context/HowItWorksContext";
import { OrganizationProvider } from "./context/OrganizationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SidebarProvider>
            <OrganizationProvider>
              <HowItWorksProvider>
                <AIProviderProvider>
                  <RouterProvider router={router} />
                  <Toaster position="bottom-right" />
                </AIProviderProvider>
              </HowItWorksProvider>
            </OrganizationProvider>
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}