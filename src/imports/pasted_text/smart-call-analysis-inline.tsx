Here's the detailed prompt for this fix:

Fix Prompt: Smart Call Analysis — Remove Popup Modal, Show Fields Inline
Current Behavior (to remove)
When a template is selected from the "Select Template" dropdown inside the Smart Call Analysis step detail drawer, it currently opens the showAnalysisScenarioModal popup (the "Add Smart Analysis Scenario" modal with all fields). This popup must be completely removed from the Smart Call Analysis step detail flow.
New Behavior (to implement)
When the user selects a template from the "Select Template" dropdown (Customer Feedback, Sales Data, Call Classification, Call Outcome), the modal must NOT open. Instead, the fields from that modal must appear inline directly below the "Select Template" dropdown within the step detail drawer body itself.

Implementation Details
Step 1: Add new local state variables (reset these in resetStepDetailState()):
const [smartAnalysisTrackWhat, setSmartAnalysisTrackWhat] = useState("")
const [smartAnalysisFieldName, setSmartAnalysisFieldName] = useState("")
const [smartAnalysisCaptureDesc, setSmartAnalysisCaptureDesc] = useState("")
const [smartAnalysisDataFormat, setSmartAnalysisDataFormat] = useState("Text - Simple text responses like summaries or comments")
const [smartAnalysisOutputExample, setSmartAnalysisOutputExample] = useState("")
const [smartAnalysisExpectedFormat, setSmartAnalysisExpectedFormat] = useState("")
const [smartAnalysisSelectedTemplate, setSmartAnalysisSelectedTemplate] = useState("")
Add all 7 of these to resetStepDetailState() with their default values.

Step 2: Replace template dropdown click behavior
The existing "Select Template" dropdown button with 4 options (Customer Feedback, Sales Data, Call Classification, Call Outcome) currently sets analysisScenarioData and opens setShowAnalysisScenarioModal(true).
Change each option's onClick to instead:

Set smartAnalysisSelectedTemplate to the template name (e.g. "Customer Feedback")
Pre-fill the 6 new state variables with the template's data (same pre-fill values already used in the existing onClick handlers — trackWhat, fieldName, captureDescription, dataFormat, outputExample, expectedFormat)
Close the dropdown (setShowTemplateDropdown(false))
Do NOT call setShowAnalysisScenarioModal(true)


Step 3: Render inline fields below the "Select Template" button
Immediately after the "Select Template" dropdown button (and after the "Add Custom" button if it's still present — but per previous prompt it was removed), add a conditional block:
{smartAnalysisSelectedTemplate !== "" && (
  <div className="space-y-4 mt-4 p-4 border border-border rounded-lg bg-white">
    ...fields...
  </div>
)}
Inside this block, render these fields in order, styled exactly like the existing modal fields (label in DM Sans semibold, inputs/textareas with Outfit font, border border-border, rounded-lg):

"What do you want to track?" — required (* red) — text <input> bound to smartAnalysisTrackWhat — with <Info> icon tooltip next to label
"Field Name" — required (* red) — text <input> bound to smartAnalysisFieldName — with <Info> icon tooltip
"What the AI will capture during calls" — required (* red) — <textarea> (3 rows) bound to smartAnalysisCaptureDesc — with <Info> icon tooltip
"Format of data" — required (* red) — <select> bound to smartAnalysisDataFormat with options:

Text - Simple text responses like summaries or comments
JSON - Structured data format
Number - Numeric values
Boolean - Yes/No values
— with <Info> icon tooltip


"Output Format Example" — optional (label in muted gray, no *) — <textarea> (2 rows) bound to smartAnalysisOutputExample — with <Info> icon tooltip
"Expected Output Format" — required (* red) — <textarea> (2 rows) bound to smartAnalysisExpectedFormat — with <Info> icon tooltip
"Add Scenario" button — full width or right-aligned blue button — onClick:

Validates that smartAnalysisTrackWhat, smartAnalysisFieldName, smartAnalysisCaptureDesc, smartAnalysisExpectedFormat are non-empty (show toast.error if not)
On success: pushes a new entry into callAnalysisScenarios array:



     {
       id: Date.now(),
       name: smartAnalysisTrackWhat,
       description: smartAnalysisCaptureDesc,
       dataFormat: smartAnalysisDataFormat
     }

Then resets all 7 smartAnalysis* state variables back to their defaults (clears the form)
Shows toast.success("Analysis scenario added successfully")


Step 4: Keep the scenarios list display unchanged
Below the inline form area, continue to show the existing callAnalysisScenarios list (Scenario #1, #2 etc. with Edit and Remove buttons) and the empty state blue box — exactly as currently rendered. No change needed there.

Step 5: Do NOT open showAnalysisScenarioModal anywhere inside the Smart Call Analysis step detail
The existing showAnalysisScenarioModal Modal component at the bottom of the file can remain (it may be triggered elsewhere), but inside the smartcallanalysis step detail rendering block, never call setShowAnalysisScenarioModal(true). The modal is fully bypassed for this step — all interaction is inline.