# Call Logs & Details

## What this page is for
The **Call Logs** page is a ledger of every phone call handled by MantraAssist. It provides call recordings, full transcripts, and AI-generated summaries with sentiment analysis, helping you monitor call quality, verify details, and audit the performance of your AI receptionist.

---

## Features on this page

### 1. Call Analytics Summary
- **What it does:** Displays cards showing metrics for the selected time range, including total calls placed/received, average call length, total call billing/cost, and success rate.
- **Why it helps you:** Gives you an immediate summary of call volume and costs without needing to export reports.
- **How to use it:** Read the metric cards at the top of the call logs table.

### 2. Call Logs Table
- **What it does:** A comprehensive table containing details for every individual call: Direction (Inbound vs. Outbound), Client Name/Number, Duration, Date, Cost, and Call Status (Completed, Voicemail, Failed, etc.).
- **Why it helps you:** Helps you track down a specific call or check the status of a specific client's phone interaction.
- **How to use it:** Click any row in the table to open that call's full recording, transcript, and AI summary.

### 3. Log Search & Filters
- **What it does:** Allows you to search calls by client name or number, and filter the table by Date, Call Status (e.g. only show calls where Voicemail was detected), Direction, or Duration.
- **Why it helps you:** Speeds up audits. You can find "all failed outbound calls longer than 2 minutes" to investigate issues quickly.
- **How to use it:** Type a search query in the search bar. Click **Filters**, choose your parameters, and click **Apply**.

---

## Call Details View (Audio Player & Transcript)

Clicking any call row opens the **Call Details** screen.

### 4. Interactive Call Recording Player
- **What it does:** Displays a visual waveform of the call audio with play, pause, skip forward/backward buttons, and a playback speed selector (e.g., 1.5x, 2x).
- **Why it helps you:** Lets you listen to the actual recording of a call to verify exactly what was said, how the client sounded, or how the AI performed.
- **How to use it:** Click the **Play** button. Adjust the speed slider to listen faster. Click anywhere on the waveform timeline to skip directly to that part of the conversation.

### 5. AI Call Summary & Key Insights
- **What it does:** Provides a bulleted AI-generated summary of the call, lists identified action items (e.g., "Schedule follow-up on Friday"), tags (e.g., "Billing Inquiry"), and customer sentiment (Positive, Neutral, or Negative).
- **Why it helps you:** Saves you from listening to a 10-minute recording. You can read the summary in 5 seconds to know what happened on the call.
- **How to use it:** Read the **AI Summary** card on the left panel of the details screen.

### 6. Interactive Call Transcript
- **What it does:** Displays the complete written transcript of the call, clearly separating speakers ("AI Receptionist" vs. "Caller") with exact timestamps.
- **Why it helps you:** Provides a readable text log of the call. If you click on any text bubble, the audio player will jump to that exact sentence in the recording.
- **How to use it:** Scroll through the transcript bubbles in the main panel. Click on any text bubble to hear that specific sentence played back.

### 7. Technical Call Metadata
- **What it does:** Displays details on the AI model used, response latency, token count, call rate, and total billing.
- **Why it helps you:** Essential for developers or administrators to monitor system performance and verify exact billing calculations per call.
- **How to use it:** Read the **Technical Details** metadata column on the right side of the details screen.

---

## Common workflows

### Workflow A: Investigating a failed booking call
1. Go to the **Call Logs** page and search for the client's name.
2. Click the row to open the **Call Details** screen.
3. Read the **AI Call Summary** and check the **Customer Sentiment** badge. If it is marked "Negative," scroll to the transcript.
4. Click the text bubbles where the sentiment turns negative. Listen to the audio to hear what went wrong (e.g. if the caller got frustrated with the AI's calendar options) and adjust your process settings accordingly.

### Workflow B: Auditing daily call costs and volume
1. Click the **Filters** button on the logs table.
2. Select "Today" as the date range.
3. Look at the metrics at the top: review **Total Cost** and **Success Rate**.
4. Click **Export CSV** to download a spreadsheet report for your bookkeeping.
