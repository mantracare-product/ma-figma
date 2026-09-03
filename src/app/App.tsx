import { RouterProvider } from "react-router";
import { router } from "./routes";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { AIProviderProvider } from "./context/AIProviderContext";
import { AuthProvider } from "./context/AuthContext";
import { HowItWorksProvider } from "./context/HowItWorksContext";
import { OrganizationProvider } from "./context/OrganizationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ClientFieldsProvider } from "./context/ClientFieldsContext";
import { FieldRegistryProvider } from "./context/FieldRegistryContext";
import { InvoiceProvider } from "./context/InvoiceContext";
import { RcmProvider } from "./context/RcmContext";
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
                  <FieldRegistryProvider>
                    <ClientFieldsProvider>
                      <InvoiceProvider>
                        <RcmProvider>
                          <DndProvider backend={HTML5Backend}>
                            <RouterProvider router={router} />
                            <Toaster position="bottom-right" />
                          </DndProvider>
                        </RcmProvider>
                      </InvoiceProvider>
                    </ClientFieldsProvider>
                  </FieldRegistryProvider>
                </AIProviderProvider>
              </HowItWorksProvider>
            </OrganizationProvider>
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}