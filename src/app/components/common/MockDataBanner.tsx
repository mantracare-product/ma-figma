/** Small banner used wherever RCM results come from simulated payers / clearinghouse / remittances. */
export default function MockDataBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="mock-data-banner">
      <b>Mock data:</b> {children || "payer, clearinghouse and remittance responses on this page are simulated; nothing is sent to a real payer."}
    </div>
  );
}
