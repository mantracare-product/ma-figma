# Process & Stage Configuration

## What this page is for
The **Process Settings** page is the control room of MantraAssist. It allows you to design automated workflows, structure key customer milestones (stages), select the AI receptionist's model, voice speed, and recording settings, link knowledge databases, and visual workflow builders.

---

## Process-Level Advanced Settings

At the Process level, configurations apply as global defaults for **all stages** within that process. If you modify these settings here, they automatically filter down to every stage unless a stage explicitly sets its own overrides.

### 1. Global AI Voice & Model
- **What it does:** Selects the default AI Model (e.g. Gemini 2.5 Flash, GPT-4o Mini, Deepseek V4 Flash), Voice Speed (0.5x to 2.0x), Voice selection, Tone, and Style.
- **Why it helps you:** Ensures your AI receptionist sounds consistent across all phone calls.
- **How to use it:** Expand **Advanced Settings**, click **AI Voice & Model**, choose your default AI parameters from the drop-downs, or slide the Voice Speed range.

### 2. Global Extension Digits
- **What it does:** Configures extension digits (e.g. "press 3 for Billing") and maps them to telephone routing numbers.
- **Why it helps you:** Enables callers to easily jump to specific departments or staff on the spot.
- **How to use it:** Click **Extension Digits**, click **+ Add Extension**, fill in the digits code, set the route phone number, and click **Save**.

### 3. Global Record Calls
- **What it does:** Toggle call recording for all calls in this process.
- **Why it helps you:** Keeps recordings for auditing, compliance, or quality check purposes.
- **How to use it:** Click the toggle switch on the **Record Calls** card to turn recording on or off globally.

### 4. Global Call Duration limits
- **What it does:** Sets the maximum minutes a call can last and defines the wrap-up window.
- **Why it helps you:** Prevents runaway calls that incur excessive fees. If a call is set to 5 minutes with a 1-minute wrap-up window, the AI will start wrapping up the call at the 4-minute mark.
- **How to use it:** Click **Call Duration**, set the duration limit (in minutes) and the hangup wrap-up window.

### 5. Global Retry Rules
- **What it does:** Defines how many times (attempts) and how often (delay in minutes) the system retries placing an outbound call if the client doesn't answer.
- **Why it helps you:** Automates persistent follow-ups without manual agent dialing.
- **How to use it:** Under **Retry Rules**, toggle the feature on, choose your retry attempts limit (e.g. 3 attempts), delay minutes (e.g. 30 minutes), and optional Fallback Stage if all attempts fail.

### 6. Global Skip Day Rules
- **What it does:** Specifies days of the week or specific dates when the AI should avoid placing automated outbound calls.
- **Why it helps you:** Prevents calling patients on weekends or public holidays.
- **How to use it:** Select weekly days to skip (e.g. Sun, Sat) or add custom calendar dates in the dates picker list.

### 7. Global Voicemail Detection
- **What it does:** Tells the AI to immediately disconnect the call if it detects an answering machine instead of a live human.
- **Why it helps you:** Avoids paying call fees for talk time spent speaking to answering machines.
- **How to use it:** Toggle **Enable Voicemail Detection** on or off.

---

## Stage-Level Configuration

Clicking a stage in the sidebar opens the stage-specific editor, containing five tab sections. **Stage-level settings always override process-level defaults for that specific stage only.**

---

## ## Basic Tab

Configures the primary behavior, routing, and scripting of the selected stage.

### 8. Call Actions & Sources
- **What it does:** Sets the stage call type (AI Receives Calls, AI Makes Calls, Transfer to Human, No Call Activity) and links phone numbers.
- **Why it helps you:** Defines whether this stage is inbound (waiting for a call) or outbound (placing a call).
- **How to use it:** Select your option from the **Call Actions** dropdown, then link inbound/outbound phone numbers.

### 9. Greeting Phrase & Caller Pitch Editors
- **What it does:** Script editors to write exactly what the AI receptionist should say first when a call connects.
- **Why it helps you:** Controls the initial customer experience.
- **How to use it:** Type your custom script in the text boxes (e.g. "Hi, this is Alex from Mantra Care Health...").

---

## ## Advanced Tab

Stage-level settings that override the global Process-level defaults for the selected stage.

### 10. AI Model & Speed overrides
- **What it does:** Overrides the global AI voice model and speech rate for this specific stage.
- **Why it helps you:** Useful if a specific stage (like complex billing verification) needs a higher-capability model than general onboarding stages.
- **How to use it:** Toggle expand the card, select your stage model, and adjust voice speed.

### 11. Overridden Duration, Retries, Skip Days, Voicemail
- **What it does:** Provides identical card inputs as the Process-level Advanced Settings (Call Duration, Retry Rules, Skip Day Rules, Detect Voicemail).
- **Why it helps you:** Allows customized logic. For example, you can globally skip outbound calling on weekends, but allow a critical post-op follow-up stage to call on weekends.
- **How to use it:** Expand the relevant card, input the custom rules, and save. These parameters override the global defaults.

---

## ## Knowledge Base Tab

Connects documents and guidelines directly to the stage's AI receptionist.

### 12. Knowledge Library Links
- **What it does:** Allows linking specific uploaded reference documents or FAQs.
- **Why it helps you:** Empowers the AI to answer stage-specific customer questions accurately (e.g. billing terms vs. preparation instructions).
- **How to use it:** Click **Add Knowledge Base**, check the items you want the AI to read, and save changes.

---

## ## Automation Tab

Sets up post-call and event-triggered automated tasks.

### 13. Call Event Automations
- **What it does:** Triggers actions like updating fields, sending texts, or moving stages based on what happened during a call.
- **Why it helps you:** Keeps processes moving without manual admin effort.
- **How to use it:** Add automation rules, set the triggers (e.g. "When call ends, send SMS template 'Appointment Confirmed'").

---

## ## Flow Builder Tab

A visual node editor mapping out conversational steps and decision trees.

### 14. Drag-and-Drop Step Canvas
- **What it does:** Visual canvas displaying conversational nodes, logic branches (If Condition), database updates, and live transfers.
- **Why it helps you:** Lets you design the complete step-by-step logic of the AI's phone conversation.
- **How to use it:** Click **+ Add Step** to insert nodes. Link steps together. Double-click a step to edit parameters (like condition rules, API Webhook links, or SMS updates).

---

## Common workflows

### Workflow A: Overriding Skip Days for urgent follow-ups
1. Click your "Post-Op Follow-up" stage in your Process settings.
2. Click the **Advance** tab.
3. Open the **Skip Day Rules** card.
4. Toggle **Enable Skip Day Rules** to **Off**.
5. Save changes. The system will now place post-op calls on weekends, even though the global Process settings skip weekend calling.

### Workflow B: Adding a FAQ guide to scheduling
1. Go to "Schedule Appointment" stage.
2. Click the **Knowledge Base** tab.
3. Click **Add Knowledge Base**.
4. Select "Appointment Rules & FAQ" from the available documents list.
5. Click **Save**. The AI receptionist will now answer booking related questions using that FAQ document.
