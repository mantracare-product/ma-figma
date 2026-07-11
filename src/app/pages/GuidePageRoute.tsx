import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router";
import { Search, ChevronRight, X, Menu, ExternalLink, Layers, Users, Phone, Kanban, GitBranch, FileText, MessageSquare, Calendar, Briefcase, Building2, CreditCard, Settings as SettingsIcon, Home } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  1. CONTENT DATA                                                    */
/*  Slugify rule: lowercase, strip punctuation, spaces -> hyphens       */
/*  Keep these ids stable — HowItWorksModal guideUrl props link here.  */
/* ------------------------------------------------------------------ */

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

interface Feature {
    title: string;
    whatItDoes: string;
    whyHelps: string;
    howToUse: string;
}

interface Workflow {
    title: string;
    steps: string[];
}

interface GuidePageData {
    slug: string;
    title: string;
    intro: string;
    icon: React.ComponentType<{ className?: string }>;
    group: string;
    features: Feature[];
    workflows: Workflow[];
    subheadings?: { id: string; title: string; note?: string }[]; // for pages with named tab groups like Process Settings
}

const GUIDE_DATA: GuidePageData[] = [
    {
        slug: "dashboard",
        title: "Overview Dashboard",
        intro:
            "The Overview Dashboard is the home screen in MantraAssist. It provides a visual, real-time summary of call volumes, successfully completed calls, average call length, call costs, and client conversion rates across stages.",
        icon: Home,
        group: "Core",
        features: [
            {
                title: "High-Level Performance Metrics",
                whatItDoes: "Displays four stats cards: Total Call Volume, Completed Calls, Success Rate, and Average Call Duration.",
                whyHelps: "Gives you an instant understanding of your operations. Positive or negative indicators show how current performance compares to the previous period.",
                howToUse: "View the large numbers at the top of the dashboard.",
            },
            {
                title: "Call Volume & Trend Charts",
                whatItDoes: "Displays a line and area chart mapping call volumes day-by-day (Monday through Sunday) alongside a comparison of completed and failed calls.",
                whyHelps: "Helps you identify peak days and hours of the week so you can adjust schedule rules or outbound calling plans.",
                howToUse: "Hover your mouse over any point on the chart lines to see a pop-up breakdown of call counts for that specific day.",
            },
            {
                title: "Conversion Funnel Chart",
                whatItDoes: "Displays a step-down bar chart representing the percentage of clients who successfully transition from one stage to another (e.g. Initial Contact → Insurance Verification → Appointment).",
                whyHelps: "Pinpoints exactly where clients drop off in your workflow so you can fix bottlenecks.",
                howToUse: "Read the percentage markers on each stage bar. A sharp drop highlights an area that needs operational review.",
            },
            {
                title: "Interactive Filters Bar",
                whatItDoes: "Filters all statistics by date range, Process, Stage, Call Type (Inbound vs. Outbound), and Industry.",
                whyHelps: "Lets you zero in on a single process or time period instead of looking at cluttered mixed data.",
                howToUse: "Click Filters at the top right, select Process/Stage/Call Type/Industry from the dropdowns, then click 1W, 1M, or 3M, or input a custom date range.",
            },
            {
                title: "How MantraAssist Works Guide Button",
                whatItDoes: "Opens a step-by-step interactive popup guide explaining the core concepts of the platform.",
                whyHelps: "Serves as a quick refresher if you or a team member forget how call routing, stages, or automation work.",
                howToUse: "Click the How MantraAssist Works button next to the Filters button at the top right of the page.",
            },
        ],
        workflows: [
            {
                title: "Checking new process drop-offs",
                steps: [
                    "Click the Filters button.",
                    "Select your new campaign from the Process drop-down.",
                    "Review the Conversion Funnel chart and find where the bars shrink significantly.",
                    "If there's a major drop-off at a stage like Insurance Verify, alert the relevant team.",
                ],
            },
            {
                title: "Reviewing weekend call performance",
                steps: [
                    "Click Filters and select Custom Date Range.",
                    "Pick Saturday and Sunday dates for the past weekend.",
                    "Review the Call Volume & Trend chart and success rate.",
                    "Check if failures were higher than weekdays and adjust voicemail/retry rules if needed.",
                ],
            },
        ],
    },
    {
        slug: "clients",
        title: "Client & Contact Management",
        intro:
            "The Clients screen is your customer database. It allows you to view, search, import, and organize all patients or clients, track which workflow stage they are currently in, assign them to team members, and view their complete communication timeline.",
        icon: Users,
        group: "Core",
        features: [
            {
                title: "Clients List & Customizable Table",
                whatItDoes: "Displays a spreadsheet-like list of clients with Name, Contact Info, Active Processes, current Stage, Assigned Owner, and Last Contact date.",
                whyHelps: "Keeps all customer data organized; drag columns to prioritize what matters most.",
                howToUse: "Scroll the list. Drag column headers to rearrange. Click a header to sort.",
            },
            {
                title: "Search & List Filters",
                whatItDoes: "Search by name, phone, or email; filter by Active/Inactive, Country, Process, or Stage.",
                whyHelps: "Quickly pulls up specific cohorts, e.g. \"all inactive clients in Canada.\"",
                howToUse: "Type a keyword in the search bar, or click Filters, set parameters, and watch the list update in real time.",
            },
            {
                title: "Add Client Popup Form",
                whatItDoes: "Opens a manual input form to create a new client record, set their initial stage, and assign a team member.",
                whyHelps: "Lets you log new clients who contact you through offline channels or walk-ins.",
                howToUse: "Click + Add Client, fill in Name, Email, Phone, Country, starting Process and Stage, then Save.",
            },
            {
                title: "Bulk Import & Export",
                whatItDoes: "Upload a list of clients in bulk from a CSV/spreadsheet, or download your current list.",
                whyHelps: "Saves hours of manual entry when syncing contacts from external CRMs or old databases.",
                howToUse: "Import: click Import Clients, choose a file, map columns, upload. Export: click Export Clients to download the current filtered view.",
            },
            {
                title: "Milestone Progression Bar",
                whatItDoes: "A visual roadmap showing all stages of a client's current process, highlighting completed milestones and current position.",
                whyHelps: "Gives an instant visual summary of how far a client has progressed.",
                howToUse: "View the progress dots at the top of the profile drawer. Hover a dot to see the stage name and status.",
            },
            {
                title: "Interactive \"Call Client\" Button",
                whatItDoes: "Triggers MantraAssist to place an outbound phone call to this client immediately.",
                whyHelps: "Lets you run a manual follow-up or test a stage call flow without switching screens.",
                howToUse: "Click the green Call Client button in the profile header.",
            },
            {
                title: "Communication Timeline & Activity Log",
                whatItDoes: "A chronological feed of every interaction — calls, texts, WhatsApp, emails, CRM updates, and stage movements.",
                whyHelps: "Provides a complete audit log of exactly what the AI receptionist said and when.",
                howToUse: "Click the Timeline tab. Click any call log entry to view its summary or jump to the transcript.",
            },
            {
                title: "Custom Client Variables (Fields Tab)",
                whatItDoes: "Displays custom data fields collected from the client during calls or forms.",
                whyHelps: "Houses all client profile information in one place, editable manually if details change.",
                howToUse: "Click the Fields tab. Click Edit Profile to update values, then Save.",
            },
        ],
        workflows: [
            {
                title: "Importing leads and assigning them to a process",
                steps: [
                    "Click Import Clients at the top right.",
                    "Select your spreadsheet and map name, phone, and email fields.",
                    "Assign the imported list to a Process and Stage (e.g. New Leads → Initial Contact).",
                    "Click Submit. The AI receptionist will start placing calls per the process schedule.",
                ],
            },
            {
                title: "Reviewing details before calling a client",
                steps: [
                    "Search for the client by name.",
                    "Double-click their row to open the Client Profile.",
                    "Check the Progression Bar to see their current stage.",
                    "Check the Fields tab, then review the Timeline for the last call transcript before calling.",
                ],
            },
        ],
    },
    {
        slug: "call-logs",
        title: "Call Logs & Details",
        intro:
            "The Call Logs page is a ledger of every phone call handled by MantraAssist. It provides call recordings, full transcripts, and AI-generated summaries with sentiment analysis, helping you monitor call quality, verify details, and audit AI performance.",
        icon: Phone,
        group: "Core",
        features: [
            {
                title: "Call Analytics Summary",
                whatItDoes: "Cards showing total calls, average call length, total cost, and success rate for the selected time range.",
                whyHelps: "Gives an immediate summary of call volume and costs without exporting reports.",
                howToUse: "Read the metric cards at the top of the call logs table.",
            },
            {
                title: "Call Logs Table",
                whatItDoes: "A table with Direction, Client Name/Number, Duration, Date, Cost, and Call Status per call.",
                whyHelps: "Helps you track down a specific call or check a client's phone interaction status.",
                howToUse: "Click any row to open that call's recording, transcript, and AI summary.",
            },
            {
                title: "Log Search & Filters",
                whatItDoes: "Search by client name/number and filter by Date, Call Status, Direction, or Duration.",
                whyHelps: "Speeds up audits, e.g. finding all failed outbound calls longer than 2 minutes.",
                howToUse: "Type in the search bar, or click Filters, choose parameters, and click Apply.",
            },
            {
                title: "Interactive Call Recording Player",
                whatItDoes: "A visual waveform with play/pause/skip and a playback speed selector.",
                whyHelps: "Lets you verify exactly what was said, how the client sounded, or how the AI performed.",
                howToUse: "Click Play. Adjust the speed slider. Click anywhere on the waveform to skip to that part.",
            },
            {
                title: "AI Call Summary & Key Insights",
                whatItDoes: "An AI-generated bulleted summary, action items, tags, and customer sentiment (Positive/Neutral/Negative).",
                whyHelps: "Saves you from listening to a 10-minute recording — read the summary in 5 seconds.",
                howToUse: "Read the AI Summary card on the left panel of the call details screen.",
            },
            {
                title: "Interactive Call Transcript",
                whatItDoes: "The complete written transcript, separating AI vs. Caller speech with timestamps.",
                whyHelps: "Provides a readable text log; clicking a bubble jumps the audio to that sentence.",
                howToUse: "Scroll the transcript. Click any text bubble to hear that sentence played back.",
            },
            {
                title: "Technical Call Metadata",
                whatItDoes: "Details on AI model used, response latency, token count, call rate, and total billing.",
                whyHelps: "Essential for developers/admins to monitor system performance and billing accuracy.",
                howToUse: "Read the Technical Details column on the right side of the call details screen.",
            },
        ],
        workflows: [
            {
                title: "Investigating a failed booking call",
                steps: [
                    "Search for the client's name on the Call Logs page.",
                    "Click the row to open Call Details.",
                    "Read the AI Summary and check the Sentiment badge.",
                    "If negative, click into the transcript where sentiment turns, and listen to the audio to hear what went wrong.",
                ],
            },
            {
                title: "Auditing daily call costs and volume",
                steps: [
                    "Click Filters and select Today as the date range.",
                    "Review Total Cost and Success Rate at the top.",
                    "Click Export CSV to download a spreadsheet report.",
                ],
            },
        ],
    },
    {
        slug: "deals",
        title: "Deals & Sales Pipeline",
        intro:
            "The Deals screen is a visual Kanban board representing your sales pipelines. It lets you monitor prospective deal values, drag cards across columns representing process stages, track deal statuses, and check associated call activity metrics.",
        icon: Kanban,
        group: "Core",
        features: [
            {
                title: "Interactive Kanban Board",
                whatItDoes: "Deals as card widgets arranged in columns representing process stages.",
                whyHelps: "An instant visual representation of your sales pipeline health.",
                howToUse: "Press and hold a deal card, drag it to another column, and release — its stage updates automatically.",
            },
            {
                title: "Search & Pipeline Selector",
                whatItDoes: "Search deals by name/client and switch between active pipelines using a dropdown.",
                whyHelps: "Keeps separate sales flows organized so agents only see relevant deals.",
                howToUse: "Use the search field at the top left, or the pipeline dropdown next to it.",
            },
            {
                title: "Add Deal Popup Form",
                whatItDoes: "Specify Deal Name, Client, Amount, Currency, Owner, and initial Pipeline Stage.",
                whyHelps: "Lets you log and track financial values tied to client milestones manually.",
                howToUse: "Click + Add Deal, fill in the fields, and click Save.",
            },
            {
                title: "Deal Status Badges (Won/Lost)",
                whatItDoes: "Mark a deal as Won or Lost via inline card actions.",
                whyHelps: "Cleans up your board while retaining record history for conversion analytics.",
                howToUse: "Click the three dots on a card and select Mark Won or Mark Lost.",
            },
        ],
        workflows: [
            {
                title: "Advancing a deal after manual verification",
                steps: [
                    "Find the deal card for the client.",
                    "Drag it from Initial Contact to Insurance Verify.",
                    "The system records the stage change and updates pipeline value statistics.",
                ],
            },
            {
                title: "Closing a won deal",
                steps: [
                    "Click the three-dot menu on the deal card.",
                    "Select Mark Won.",
                    "The board total value adjusts and the win is tracked in organization statistics.",
                ],
            },
        ],
    },
    {
        slug: "process-settings",
        title: "Process & Stage Configuration",
        intro:
            "The Process Settings page is the control room of MantraAssist. It allows you to design automated workflows, structure key customer milestones (stages), select the AI receptionist's model, voice speed, and recording settings, link knowledge databases, and build workflows visually.",
        icon: GitBranch,
        group: "Automation",
        subheadings: [
            { id: "process-level-advanced-settings", title: "Process-Level Advanced Settings", note: "Global defaults for all stages" },
            { id: "stage-level-configuration", title: "Stage-Level Configuration", note: "Overrides for one specific stage" },
            { id: "basic-tab", title: "Basic Tab" },
            { id: "advanced-tab", title: "Advanced Tab" },
            { id: "knowledge-base-tab", title: "Knowledge Base Tab" },
            { id: "automation-tab", title: "Automation Tab" },
            { id: "flow-builder-tab", title: "Flow Builder Tab" },
        ],
        features: [
            // ── Process-level (global defaults for every stage) ──
            {
                title: "Global AI Voice & Model",
                whatItDoes: "Selects the default AI Model, Voice Speed (0.5x–2.0x), Voice, Tone, and Style.",
                whyHelps: "Ensures your AI receptionist sounds consistent across all phone calls.",
                howToUse: "Expand Advanced Settings → AI Voice & Model, choose defaults from the dropdowns or slider.",
            },
            {
                title: "Global Extension Digits",
                whatItDoes: "Configures extension digits (e.g. \"press 3 for Billing\") mapped to routing numbers.",
                whyHelps: "Enables callers to jump straight to specific departments or staff.",
                howToUse: "Click Extension Digits → + Add Extension, fill in the digits code and route number, then Save.",
            },
            {
                title: "Global Record Calls",
                whatItDoes: "Toggle call recording for all calls in this process.",
                whyHelps: "Keeps recordings for auditing, compliance, or quality checks.",
                howToUse: "Click the toggle on the Record Calls card.",
            },
            {
                title: "Global Call Duration limits",
                whatItDoes: "Sets the maximum call length and the wrap-up window.",
                whyHelps: "Prevents runaway calls and excessive fees — e.g. a 5-minute call with a 1-minute wrap-up window starts wrapping up at 4 minutes.",
                howToUse: "Click Call Duration, set the duration limit and hangup wrap-up window.",
            },
            {
                title: "Global Retry Rules",
                whatItDoes: "Defines how many attempts and how often the system retries an unanswered outbound call.",
                whyHelps: "Automates persistent follow-ups without manual dialing.",
                howToUse: "Toggle Retry Rules on, set attempts and delay minutes, and an optional Fallback Stage.",
            },
            {
                title: "Global Skip Day Rules",
                whatItDoes: "Specifies days or dates when the AI should avoid placing automated outbound calls.",
                whyHelps: "Prevents calling clients on weekends or public holidays.",
                howToUse: "Select weekly days to skip, or add custom calendar dates.",
            },
            {
                title: "Global Voicemail Detection",
                whatItDoes: "Tells the AI to disconnect immediately if it detects an answering machine.",
                whyHelps: "Avoids paying call fees for talk time spent with voicemail.",
                howToUse: "Toggle Enable Voicemail Detection on or off.",
            },

            // ── Stage → Basic tab ──
            {
                title: "Call Actions & Type",
                whatItDoes: "A dropdown that sets what this stage does with a call: AI Receives Calls, AI Makes Calls, No Call Activity, or Transfer to Human.",
                whyHelps: "This one setting decides whether the stage is inbound, outbound, silent, or handed to a person — every other field on the Basic tab appears or disappears based on it.",
                howToUse: "Open the stage's Basic tab and choose a value from the Call Actions dropdown at the top.",
            },
            {
                title: "Inbound / Outbound Source & Responsible Person",
                whatItDoes: "When Call Actions is AI Receives Calls or AI Makes Calls, a multi-select lets you attach one or more phone numbers as the inbound or outbound source. When it's Transfer to Human, a Responsible Person dropdown appears instead so you can pick the team member the call goes to.",
                whyHelps: "Connects the stage to the right phone numbers or the right person, so calls actually reach where they're supposed to.",
                howToUse: "Click + Add in the source box to attach numbers, or pick a name from Responsible Person when the stage is set to Transfer to Human.",
            },
            {
                title: "When to Move to This Stage",
                whatItDoes: "A free-text field where you describe, in plain English, the condition that should move a contact into this stage.",
                whyHelps: "Gives the AI a plain-language rule instead of rigid logic, so you can describe real-world triggers like \"after the client confirms their insurance details.\"",
                howToUse: "Expand When to Move to This Stage and type the trigger condition into the text box.",
            },
            {
                title: "Caller Pitch — Single Prompt Mode",
                whatItDoes: "One combined text box where you write the entire outbound call script as a single prompt, with an optional Generate with AI shortcut.",
                whyHelps: "The fastest way to get a stage talking — good for simple stages that don't need a highly structured script.",
                howToUse: "Expand Caller Pitch, keep the Single Prompt toggle selected, and type your script directly into the box.",
            },
            {
                title: "Caller Pitch — Comprehensive Mode",
                whatItDoes: "Splits the script into four collapsible sections: Greeting / Intro Message (what the AI says first), Objective (the AI's goal for the call), Business Information (facts the AI should know, added as titled items you can mark Active), and Languages (a primary language plus optional secondary languages).",
                whyHelps: "Gives more control over a complex script than one open text box, and keeps the greeting, goal, business facts, and languages easy to edit independently of each other.",
                howToUse: "Expand Caller Pitch, switch the toggle to Comprehensive, then expand each of the four sections to fill it in.",
            },

            // ── Stage → Advance tab (per-stage overrides of the process-level defaults above) ──
            {
                title: "AI Voice & Model (Stage Override)",
                whatItDoes: "Overrides the process-level AI Model, Voice Speed, Voice, Tone, and Style for this specific stage only.",
                whyHelps: "Lets a single stage — like a technical support handoff — use a different model or voice than the rest of the process.",
                howToUse: "Open the Advance tab and expand AI Voice & Model to set stage-specific values; leave it unset to keep the process-level default.",
            },
            {
                title: "Record Calls (Stage Override)",
                whatItDoes: "A toggle that turns call recording on or off for this stage only, independent of the process-level setting.",
                whyHelps: "Useful when one stage handles sensitive information and needs a different recording policy than the rest of the process.",
                howToUse: "Open the Advance tab and use the Record Calls toggle.",
            },
            {
                title: "Call Duration (Stage Override)",
                whatItDoes: "Sets a stage-specific maximum call length and wrap-up window, overriding the process-level limit.",
                whyHelps: "Some stages, like a quick confirmation call, need a shorter cap than others, like a detailed intake call.",
                howToUse: "Open the Advance tab, expand Call Duration, and set the duration limit and wrap-up window for this stage.",
            },
            {
                title: "Retry Rules (Stage Override)",
                whatItDoes: "Sets stage-specific retry attempts, delay between attempts, and an optional Fallback Stage.",
                whyHelps: "Lets a critical stage retry more (or less) aggressively than the process default, and defines where a contact goes once retries are exhausted.",
                howToUse: "Open the Advance tab, expand Retry Rules, toggle it on, and set attempts, delay, and a Fallback Stage.",
            },
            {
                title: "Skip Day Rules (Stage Override)",
                whatItDoes: "Defines days or dates this stage should avoid calling, overriding the process-level Skip Day Rules.",
                whyHelps: "Lets an urgent stage keep calling on days the rest of the process skips, or the reverse.",
                howToUse: "Open the Advance tab, expand Skip Day Rules, and toggle it on or off, or set custom dates for this stage.",
            },
            {
                title: "Detect Voicemail (Stage Override)",
                whatItDoes: "Toggles voicemail detection for this stage only, overriding the process-level default.",
                whyHelps: "Some stages may want the AI to leave a voicemail message instead of hanging up immediately.",
                howToUse: "Open the Advance tab and use the Enable Voicemail Detection toggle.",
            },

            // ── Stage → Knowledge Base tab ──
            {
                title: "Knowledge Library Links",
                whatItDoes: "Links specific uploaded reference documents or FAQs to this stage.",
                whyHelps: "Empowers the AI to answer stage-specific questions accurately.",
                howToUse: "Click Add Knowledge Base, check the items to include, and save.",
            },

            // ── Stage → Automation tab ──
            {
                title: "Automation Triggers: On Stage Entry, In Call & Post Call",
                whatItDoes: "Groups every automation step into one of three lanes based on when it fires: On Stage Entry (runs the moment a contact enters the stage, before any call starts), In Call (fires live, mid-conversation, based on what the caller says), and Post Call (fires automatically once the call ends).",
                whyHelps: "Lets you automate the right moment for each action — updating a field the instant a contact arrives is very different from reacting to something said live on a call.",
                howToUse: "Open the Automation tab, click Add Step, then pick On Entering Stage, In Call, or Post Call from the Trigger selector in the step's detail drawer.",
            },
            {
                title: "Execution Mode: Wait vs Parallel",
                whatItDoes: "For On Stage Entry and Post Call steps, choose Wait (this step starts only after the previous step finishes) or In Parallel (this step runs independently alongside other active steps).",
                whyHelps: "Wait keeps a strict, ordered sequence; Parallel lets you fire off multiple actions — like a WhatsApp message and an SMS — at the same time instead of one after another.",
                howToUse: "In the step's detail drawer, click the Execution field and choose Wait or In Parallel from the Execution Timing popup.",
            },
            {
                title: "Delay & Connect After",
                whatItDoes: "Delay sets how long to wait after the previous step finishes before this one runs, in seconds, minutes, hours, days, weeks, or months. Connect After (shown when Execution is Wait) picks which specific step must finish before this one starts, or Start of flow to run first.",
                whyHelps: "Gives fine control over pacing — for example, waiting 24 hours after stage entry before sending a reminder text.",
                howToUse: "In the step's detail drawer, set a number and unit in Delay, and choose a predecessor from the Connect After dropdown.",
            },
            {
                title: "Conditions: Field Conditions & Intent Conditions",
                whatItDoes: "An optional Conditions toggle restricts a step to only run when rules are met. On Stage Entry and Post Call steps use Field Conditions, comparing a field from any source — System, Call Log, Stage, Process, Appointment, Organization, or Custom — against a value. In Call steps additionally offer Intent Conditions, which match on what the caller says, e.g. a \"billing_query\" intent.",
                whyHelps: "Stops a step from firing blindly every time — for example, only send the follow-up SMS if Call Status equals Completed, or only trigger a transfer if the caller's intent matches \"speak to a human.\"",
                howToUse: "In the step's detail drawer, toggle Conditions on, then add Field Conditions and, for In Call steps, Intent Conditions.",
            },
            {
                title: "Workflow Logic & Caller Engagement Automations",
                whatItDoes: "Workflow Logic automations control the flow itself: Process/Stage Movement moves the contact to a different process and stage, and End Workflow terminates the workflow and marks the contact done. Caller Engagement automations act on the live call: Auto Hangup ends the call with an optional closing message, Transfer Call hands the call to a human or another AI agent, and Idle Messages speaks a message when the caller goes quiet.",
                whyHelps: "These are the automations that change what happens to the contact or the call itself, rather than just sending a message.",
                howToUse: "Click Add Step in the Automation tab, choose the Workflow Logic or Caller Engagement category on the left, and select the automation.",
            },
            {
                title: "Communication & Data Automations",
                whatItDoes: "Communication automations send messages to the contact — WhatsApp, SMS, and Email — each using pre-configured templates. Data & Assignment automations update records: Field Update changes a specific field value, and Assign to a Human assigns a team member to review or handle the contact.",
                whyHelps: "Covers the everyday follow-up work, like notifying a client or updating their record, without any manual effort.",
                howToUse: "Click Add Step in the Automation tab, choose the Communication or Data & Assignment category on the left, and select the automation.",
            },
            {
                title: "Webhook / API Automations",
                whatItDoes: "API Automation triggers actions in external systems through your connected API integrations. Webhook Automation sends an event payload to a connected webhook URL when the step runs.",
                whyHelps: "Lets MantraAssist push data out to other software — a CRM, a spreadsheet, an internal tool — the moment something happens in a call or stage.",
                howToUse: "Click Add Step in the Automation tab, choose the Webhook / API category on the left, and select API Automation or Webhook Automation.",
            },

            // ── Stage → Flow Builder tab ──
            {
                title: "Flow Builder Canvas",
                whatItDoes: "A visual, node-based canvas that lays out every automation step from this stage — On Stage Entry, In Call, and Post Call — as connected nodes in separate lanes, generated automatically from the Automation tab.",
                whyHelps: "Makes the order and branching of a stage's automations easy to see and edit at a glance, especially once a stage has many steps.",
                howToUse: "Open the Flow Builder tab. Drag a node's bottom port to another node's top port to change what runs next; select a step and use the left panel to add a Condition, Wait, or Parallel Branch; double-click any node to open its full configuration. Changes made here sync both ways with the Automation tab.",
            },
        ],
        workflows: [
            {
                title: "Overriding Skip Days for urgent follow-ups",
                steps: [
                    "Click your Post-Op Follow-up stage.",
                    "Click the Advance tab, open Skip Day Rules.",
                    "Toggle Enable Skip Day Rules to Off and save.",
                    "The system will now place calls on weekends for this stage, even though the global Process settings skip weekends.",
                ],
            },
            {
                title: "Adding a FAQ guide to scheduling",
                steps: [
                    "Go to the Schedule Appointment stage.",
                    "Click the Knowledge Base tab, then Add Knowledge Base.",
                    "Select the Appointment Rules & FAQ document and click Save.",
                ],
            },
            {
                title: "Sending a reminder SMS and WhatsApp message at the same time",
                steps: [
                    "Go to the stage's Automation tab and click Add Step.",
                    "Choose SMS from the Communication category, set Trigger to Post Call, and set Execution to In Parallel.",
                    "Click Add Step again, choose WhatsApp, and give it the same Trigger and Execution.",
                    "Both messages now fire together once the call ends, instead of one waiting for the other to finish.",
                ],
            },
            {
                title: "Only transferring to a human when the caller asks about billing",
                steps: [
                    "Add a Transfer Call automation and set its Trigger to In Call.",
                    "Toggle Conditions on and open Intent Conditions.",
                    "Type a caller intent like billing_query and add it.",
                    "The transfer now only fires when the AI detects that intent during the conversation — check the Flow Builder tab to see it appear as a conditioned node.",
                ],
            },
        ],
    },
    {
        slug: "web-forms",
        title: "Web Forms & Form Builder",
        intro:
            "The Web Forms screen allows you to create, edit, and manage client-facing web forms. You can use templates, design custom layouts using a visual builder, share forms with clients, and test form submissions inside a preview sandbox.",
        icon: FileText,
        group: "Automation",
        features: [
            {
                title: "Capsule Stat Metrics",
                whatItDoes: "Capsule widgets showing total submissions, completion rates, average completion time, and active forms count.",
                whyHelps: "A quick visual performance summary of all your active forms.",
                howToUse: "Read the capsule items at the top of the screen.",
            },
            {
                title: "Forms Management Table",
                whatItDoes: "Lists all forms with field counts, completion counts, date created, and Actions column.",
                whyHelps: "Keeps all client forms organized with quick actions.",
                howToUse: "Click the action icons next to any row to edit, delete, or test.",
            },
            {
                title: "Create Form Templates",
                whatItDoes: "Choose pre-built configurations like Contact Form, Appointment Booking, Lead Generation, Quote Request, or Event Registration.",
                whyHelps: "Saves time by starting with standard field layouts.",
                howToUse: "Click + Create Form, select a template, name your form, and click Create.",
            },
            {
                title: "Drag-and-Drop Form Builder",
                whatItDoes: "An interactive canvas to drag fields (Text, Email, Phone, Date, Time, Number) to design the form.",
                whyHelps: "Lets you build custom intake forms without writing code.",
                howToUse: "Drag field cards onto the canvas, edit labels via the pencil icon, drag to reorder, and click Save.",
            },
            {
                title: "Form Testing Sandbox",
                whatItDoes: "A simulation screen to preview the form as a client would, fill test inputs, and see the payload results.",
                whyHelps: "Verifies fields and validations work correctly before sending real links.",
                howToUse: "Click the Test icon next to a form, fill in preview inputs, submit, and review the JSON payload.",
            },
        ],
        workflows: [
            {
                title: "Building an Appointment Booking form",
                steps: [
                    "Click + Create Form and choose Appointment Booking.",
                    "Drag a Date field and a Time field onto the canvas.",
                    "Edit the date field label and mark it Required.",
                    "Click Save Form and copy the shareable link.",
                ],
            },
            {
                title: "Testing form submissions",
                steps: [
                    "Find your form and click the Test icon.",
                    "Type test information, including an invalid email.",
                    "Submit — confirm the validator blocks it, then fix and resubmit to inspect the output.",
                ],
            },
        ],
    },
    {
        slug: "chats",
        title: "Live Chat Messaging",
        intro:
            "The Chats screen is your hub for live text communications. It aggregates incoming SMS, WhatsApp, and Web Chat messages into a single inbox, allowing team members to monitor conversations, take over manually from the AI receptionist, and text clients directly.",
        icon: MessageSquare,
        group: "Automation",
        features: [
            {
                title: "Inbox Conversations Sidebar",
                whatItDoes: "Lists all active chat threads with client name, latest message snippet, time, and unread badges.",
                whyHelps: "Keeps text communications organized; filter to only Unread or Assigned to Me.",
                howToUse: "Scroll the inbox list and click any contact to load their history.",
            },
            {
                title: "Message History Canvas",
                whatItDoes: "Displays the historic message log with chat bubbles separating client vs. AI/human messages.",
                whyHelps: "Lets you read full context before replying.",
                howToUse: "Scroll up or down within the chat window.",
            },
            {
                title: "Messaging Editor Bar",
                whatItDoes: "A text entry panel with quick templates, emoji, file attachments, and a send button.",
                whyHelps: "Quick templates save time on common responses.",
                howToUse: "Type your message and click Send, or click the paperclip icon to upload files.",
            },
            {
                title: "Human Takeover Toggle Switch",
                whatItDoes: "A switch marked AI Receptionist Auto-Reply. Toggling it off pauses the AI and assigns the chat to a human.",
                whyHelps: "Essential when a client asks something the AI can't handle.",
                howToUse: "Toggle the AI Auto-Reply switch in the chat header.",
            },
            {
                title: "Client Metadata Panel (Right Sidebar)",
                whatItDoes: "A collapsible panel with the client's email, phone, location, workflow stage, and notes box.",
                whyHelps: "Provides client details without navigating to the Clients tab.",
                howToUse: "Read the details panel; click inside Notes to type reminders and save.",
            },
        ],
        workflows: [
            {
                title: "Intervening when a client gets confused",
                steps: [
                    "Look for a conversation with a frustrated sentiment alert.",
                    "Click the client's name to load the conversation and read where the AI struggled.",
                    "Toggle AI Auto-Reply to Off.",
                    "Type your response and press Send.",
                ],
            },
            {
                title: "Sending a quick booking template link",
                steps: [
                    "Open the chat thread and toggle AI Auto-Reply to Off.",
                    "Click Templates and select the Booking Link template.",
                    "Click Send — it's saved to the client's profile timeline.",
                ],
            },
        ],
    },
    {
        slug: "appointments",
        title: "Appointments & Calendar",
        intro:
            "The Appointments screen manages your calendar booking logs and schedules. It displays metric cards, lists booked sessions, offers interactive calendar views (Day, Week, Month, Schedule), and hosts rescheduling parameters.",
        icon: Calendar,
        group: "Core",
        features: [
            {
                title: "Booking Summary Cards",
                whatItDoes: "Cards tracking Total Bookings, Upcoming slots, Completed, and Canceled sessions.",
                whyHelps: "Tracks customer booking volume and cancellation rates.",
                howToUse: "Read the summary cards at the top of the dashboard.",
            },
            {
                title: "Appointments Log Table",
                whatItDoes: "A spreadsheet listing every booking: Client Name, Service, Assigned Staff, Date, Time, and Status.",
                whyHelps: "Useful for confirming if a client has an active slot.",
                howToUse: "Search client names, or filter by Staff and Service columns.",
            },
            {
                title: "Interactive Calendar Planner (Views)",
                whatItDoes: "Displays appointment blocks with Day, Week, Month, and Schedule views.",
                whyHelps: "A visual planner to spot double-bookings or empty slots.",
                howToUse: "Click Day, Week, or Month. Double-click a slot to book, or drag a block to reschedule.",
            },
            {
                title: "Create Event Popup Form",
                whatItDoes: "A manual slot creation form with Event Name, Start/End Date-Time, Calendar target, Location, and Attendees.",
                whyHelps: "Lets team members block out personal or company time, or manually book phone appointments.",
                howToUse: "Click + Create Event or double-click a date cell, fill in the form, and save.",
            },
        ],
        workflows: [
            {
                title: "Rescheduling an appointment on the calendar",
                steps: [
                    "Go to Calendar → Week view.",
                    "Locate the appointment block.",
                    "Drag it to the new time and release.",
                    "The system updates the appointment and sends an SMS notification to the client.",
                ],
            },
            {
                title: "Auditing cancellations",
                steps: [
                    "Click Filters on the appointments log.",
                    "Select Canceled from the Status dropdown.",
                    "Review the list, checking the assigned staff column for patterns.",
                ],
            },
        ],
    },
    {
        slug: "services",
        title: "Services Management",
        intro:
            "The Services page allows you to define your business offerings. The AI receptionist uses these services to quote pricing, check staff availability, and schedule appointments on your calendar.",
        icon: Briefcase,
        group: "Core",
        features: [
            {
                title: "Services Directory List",
                whatItDoes: "A table with Service Name, Cost, Duration, Description, and Active Status.",
                whyHelps: "Keeps your service catalog organized for fast updates.",
                howToUse: "View the list; click the action menu next to a row to edit or delete.",
            },
            {
                title: "Add Service Popup Form",
                whatItDoes: "Requires Service Name, Price, Duration, Description, and Assignees.",
                whyHelps: "Lets you offer new products or consultation packages clients can book.",
                howToUse: "Click + Add Service, fill in the parameters, and click Save.",
            },
            {
                title: "Service Status Toggles",
                whatItDoes: "A switch to toggle services between Active and Inactive.",
                whyHelps: "Temporarily disables bookings without deleting the template.",
                howToUse: "Toggle the switch in the status column of the service row.",
            },
        ],
        workflows: [
            {
                title: "Adding a new service",
                steps: [
                    "Click + Add Service.",
                    "Type the Name, Cost, and Duration.",
                    "Add a description and assign qualified staff.",
                    "Click Save — the AI will now offer this service to callers.",
                ],
            },
            {
                title: "Adjusting service pricing",
                steps: [
                    "Find the service in the table and click the edit pencil icon.",
                    "Update the cost field.",
                    "Click Save — the AI instantly quotes the updated price.",
                ],
            },
        ],
    },
    {
        slug: "team-and-organization",
        title: "Team & Organization Management",
        intro:
            "These settings screens allow you to manage multiple business branch accounts (organizations), invite and assign team members, configure user permissions, connect calendars, and customize staff schedules.",
        icon: Users,
        group: "Team & Admin",
        features: [
            {
                title: "Organization Switcher",
                whatItDoes: "A dropdown to switch between separate organization/branch accounts.",
                whyHelps: "Keeps data separate for different clinics or businesses.",
                howToUse: "Click the organization name in the top bar and select a branch.",
            },
            {
                title: "User Management List",
                whatItDoes: "Displays all team members with role, email, and active status.",
                whyHelps: "Provides a directory to add or remove staff and monitor access.",
                howToUse: "Scroll the user list; click + Add User to register a new member.",
            },
            {
                title: "Add User Permissions Setup",
                whatItDoes: "Sets access rights across Core, Operations, and System sections.",
                whyHelps: "Ensures security — e.g. agents can view call logs but not edit billing.",
                howToUse: "Select View or Write per module on the invite form, assign a role, and Save.",
            },
            {
                title: "Personal Information & Custom Fields",
                whatItDoes: "Fields for contact details, gender, language, timezone, and custom attributes.",
                whyHelps: "Keeps team details organized and records timezone offsets for scheduling.",
                howToUse: "Click Personal Info, click Edit Profile, update, and save.",
            },
            {
                title: "Calendar Sync (Google & Outlook)",
                whatItDoes: "Connects a staff member's external calendar to the platform.",
                whyHelps: "Allows the AI to see real-time availability and book without overlaps.",
                howToUse: "Under the Calendar tab, click Connect Google Calendar or Connect Outlook.",
            },
            {
                title: "Weekly Availability Hours",
                whatItDoes: "Configures the days/hours a team member is available for bookings.",
                whyHelps: "Ensures the AI only schedules appointments during official shift hours.",
                howToUse: "Select Availability, toggle weekdays, and adjust start/end times.",
            },
            {
                title: "Days Off & Vacation Log",
                whatItDoes: "Adds specific dates to a team member's vacation list.",
                whyHelps: "Prevents the AI from booking slots during holidays or leave.",
                howToUse: "Under Days Off, choose dates and click + Add.",
            },
            {
                title: "Assigned Services",
                whatItDoes: "Links a team member to specific services they're qualified to perform.",
                whyHelps: "Allows the AI to match bookings to the correct staff member.",
                howToUse: "Click the Services tab, check applicable services, and Save.",
            },
        ],
        workflows: [
            {
                title: "Adding a new receptionist agent",
                steps: [
                    "Click + Add User, input name/email, set Role to Agent.",
                    "Set Core to View/Write, Operations to View, System to None.",
                    "Click Invite — they receive an invitation email.",
                ],
            },
            {
                title: "Setting up shift hours and calendar sync",
                steps: [
                    "Open the profile and click Calendar → Connect Google Calendar.",
                    "Switch to Availability, check Monday–Friday, set 09:00–05:00.",
                    "Click Save — the AI can now book onto this schedule.",
                ],
            },
        ],
    },
    {
        slug: "organizations",
        title: "Organizations",
        intro:
            "The Organizations screen allows system administrators to manage corporate accounts, parent entities, or multiple company branches from a single unified control panel.",
        icon: Building2,
        group: "Team & Admin",
        features: [
            {
                title: "Active Organizations list",
                whatItDoes: "Displays all corporate entities or branch locations under your master portal account.",
                whyHelps: "Keeps separate branches organized, each with its own numbers, processes, and billing.",
                howToUse: "Scroll the organization rows; click a row to view details or switch accounts.",
            },
            {
                title: "Corporate Detail cards",
                whatItDoes: "Displays company info, contact email, primary domain, and assigned process count.",
                whyHelps: "A quick overview of branch configuration and workload.",
                howToUse: "Read the summary information panels.",
            },
            {
                title: "Add Organization Popup Form",
                whatItDoes: "Requires Company Name, Industry, Website Domain, and timezone.",
                whyHelps: "Allows managers to spin up new branches in seconds.",
                howToUse: "Click + Add Organization, fill in details, and Save.",
            },
        ],
        workflows: [
            {
                title: "Adding a new clinic branch location",
                steps: [
                    "Click + Add Organization.",
                    "Enter Company Name, Industry, and web address.",
                    "Click Save — it's now selectable in the header switcher.",
                ],
            },
        ],
    },
    {
        slug: "billing-payments",
        title: "Billing & Payments",
        intro:
            "The Billing & Payments screen manages your platform subscription, pricing packages, payment cards, invoice lookups, and transactional history logs.",
        icon: CreditCard,
        group: "Billing",
        features: [
            {
                title: "Subscription & Usage overview",
                whatItDoes: "Displays your current plan and monthly usage statistics.",
                whyHelps: "Tracks spending and warns you as you approach plan limits.",
                howToUse: "Read the subscription card at the top of the screen.",
            },
            {
                title: "Payment Method Card manager",
                whatItDoes: "Secure inputs to save or update your credit card details.",
                whyHelps: "Prevents service interruptions from billing issues.",
                howToUse: "Click Update Card, enter card details, and click Save.",
            },
            {
                title: "Invoices & Transaction History",
                whatItDoes: "Lists all billed transactions, dates, IDs, items, status, and costs.",
                whyHelps: "Provides a record for bookkeeping and downloadable invoices.",
                howToUse: "Scroll the transaction table; click Download next to any invoice row.",
            },
        ],
        workflows: [
            {
                title: "Downloading a past invoice",
                steps: [
                    "Go to Billing → Transaction History.",
                    "Locate last month's payment row.",
                    "Click Download PDF.",
                ],
            },
            {
                title: "Updating a payment method",
                steps: [
                    "Go to the Payment Method section.",
                    "Click Edit/Update, type new card details, and Save.",
                ],
            },
        ],
    },
    {
        slug: "settings",
        title: "Settings & Profile",
        intro:
            "The Settings screens allow you to configure business profiles, purchase routing numbers, create custom contact database fields, set up external CRM/EHR integrations, search the AI Voice catalog, and update user login details.",
        icon: SettingsIcon,
        group: "Team & Admin",
        features: [
            {
                title: "Business Details Tab",
                whatItDoes: "Inputs for Company Name, Industry, Website, Country, Timezone, and Currency.",
                whyHelps: "Localizes call durations, date calculations, and billing reports.",
                howToUse: "Fill in fields and click Save Changes.",
            },
            {
                title: "Custom Fields Tab",
                whatItDoes: "Creates custom variables and input categories for Clients, Call Logs, or Team Members.",
                whyHelps: "Tailors the database to capture industry-specific data.",
                howToUse: "Select a category, click + Add Custom Field, choose the type, name it, and save.",
            },
            {
                title: "Telephony & Phone Numbers Tab",
                whatItDoes: "Lists active routing numbers and country-specific cost tables, and verifies new numbers.",
                whyHelps: "Connects physical numbers to AI voice models, including in other countries.",
                howToUse: "Select a country, search numbers, and purchase, or click Verify Number for an existing office number.",
            },
            {
                title: "Integrations & API Webhooks",
                whatItDoes: "Links credentials for HubSpot, Salesforce, Google Calendar, or custom Webhook URLs.",
                whyHelps: "Connects MantraAssist to your existing software so call events instantly sync.",
                howToUse: "Click Connect on an integration card, log in, or paste your webhook URL.",
            },
            {
                title: "AI Voice Catalog Tab",
                whatItDoes: "A searchable listing of AI receptionist voices with preview buttons, accents, and gender.",
                whyHelps: "Helps you find the perfect voice tone for your client demographic.",
                howToUse: "Search voices, click Play/Preview, and select your preference.",
            },
            {
                title: "Profile Picture Upload & Personal Info",
                whatItDoes: "Upload avatar photos and update personal email, phone, gender, and password.",
                whyHelps: "Customizes how other team members see you on logs and calendars.",
                howToUse: "Click the profile picture widget, update fields, and save.",
            },
        ],
        workflows: [
            {
                title: "Creating an \"Insurance Group Number\" custom field",
                steps: [
                    "Go to Settings → Custom Fields.",
                    "Under Clients, click + Add Custom Field.",
                    "Input the label, choose the type, check Required, and Save.",
                ],
            },
            {
                title: "Syncing call logs to your CRM",
                steps: [
                    "Go to Settings → Integrations.",
                    "Click Connect on HubSpot or Salesforce.",
                    "Log in and authorize — call summaries now sync automatically.",
                ],
            },
        ],
    },
];

const GROUP_ORDER = ["Core", "Automation", "Team & Admin", "Billing"];

/* ------------------------------------------------------------------ */
/*  2. HELPERS                                                         */
/* ------------------------------------------------------------------ */

const getPage = (slug?: string) => GUIDE_DATA.find((p) => p.slug === slug);

const buildSearchIndex = () => {
    const index: { pageSlug: string; pageTitle: string; sectionId: string; sectionTitle: string; text: string }[] = [];
    GUIDE_DATA.forEach((page) => {
        index.push({
            pageSlug: page.slug,
            pageTitle: page.title,
            sectionId: "",
            sectionTitle: "Overview",
            text: page.intro,
        });
        page.features.forEach((f) => {
            index.push({
                pageSlug: page.slug,
                pageTitle: page.title,
                sectionId: slugify(f.title),
                sectionTitle: f.title,
                text: `${f.whatItDoes} ${f.whyHelps} ${f.howToUse}`,
            });
        });
    });
    return index;
};

const SEARCH_INDEX = buildSearchIndex();

/* ------------------------------------------------------------------ */
/*  3. SEARCH BAR                                                      */
/* ------------------------------------------------------------------ */

function GuideSearch({ onNavigate }: { onNavigate: (slug: string, sectionId: string) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return SEARCH_INDEX.filter(
            (item) =>
                item.pageTitle.toLowerCase().includes(q) ||
                item.sectionTitle.toLowerCase().includes(q) ||
                item.text.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [query]);

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Search the guide..."
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {results.map((r, i) => (
                        <button
                            key={i}
                            onMouseDown={() => {
                                onNavigate(r.pageSlug, r.sectionId);
                                setQuery("");
                                setOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                        >
                            <div className="text-xs font-semibold text-blue-600">{r.pageTitle}</div>
                            <div className="text-sm text-gray-800">{r.sectionTitle}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  4. SIDEBAR                                                         */
/* ------------------------------------------------------------------ */

function GuideSidebar({
    currentSlug,
    onNavigate,
    mobileOpen,
    setMobileOpen,
}: {
    currentSlug?: string;
    onNavigate: (slug: string) => void;
    mobileOpen: boolean;
    setMobileOpen: (v: boolean) => void;
}) {
    return (
        <>
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}
            <aside
                className={`fixed md:sticky top-0 md:top-[57px] left-0 z-50 md:z-0 h-screen md:h-[calc(100vh-57px)] w-72 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                <div className="p-5">
                    <Link
                        to="/guide"
                        className="flex items-center gap-2 mb-5 text-sm font-bold text-gray-900"
                        onClick={() => setMobileOpen(false)}
                    >
                        <Layers className="w-4 h-4 text-blue-600" />
                        Product Guide
                    </Link>

                    {GROUP_ORDER.map((group) => {
                        const pages = GUIDE_DATA.filter((p) => p.group === group);
                        if (pages.length === 0) return null;
                        return (
                            <div key={group} className="mb-6">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-2">
                                    {group}
                                </p>
                                <div className="space-y-0.5">
                                    {pages.map((page) => {
                                        const Icon = page.icon;
                                        const active = page.slug === currentSlug;
                                        return (
                                            <button
                                                key={page.slug}
                                                onClick={() => {
                                                    onNavigate(page.slug);
                                                    setMobileOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${active
                                                        ? "bg-blue-50 text-blue-700 font-semibold"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                                                <span className="truncate">{page.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  5. RIGHT MINI TOC (scroll-spy)                                     */
/* ------------------------------------------------------------------ */

function OnThisPage({ page }: { page: GuidePageData }) {
    const [activeId, setActiveId] = useState<string>("");
    const items = page.features.map((f) => ({ id: slugify(f.title), title: f.title }));

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveId(entry.target.id);
                });
            },
            { rootMargin: "-100px 0px -70% 0px" }
        );
        items.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page.slug]);

    return (
        <div className="hidden xl:block w-56 flex-shrink-0 pl-6">
            <div className="sticky top-[80px]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    On this page
                </p>
                <div className="space-y-2 border-l border-gray-200">
                    {items.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={`block pl-3 -ml-px border-l-2 text-sm leading-tight py-0.5 transition-colors ${activeId === item.id
                                    ? "border-blue-600 text-blue-700 font-medium"
                                    : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            {item.title}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  6. HOME PAGE (README-style landing)                                 */
/* ------------------------------------------------------------------ */

function GuideHome({ onNavigate }: { onNavigate: (slug: string) => void }) {
    return (
        <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">MantraAssist Product Guide</h1>
            <p className="text-[15px] leading-relaxed text-gray-600 mb-6">
                MantraAssist acts as an automated virtual receptionist and communications coordinator. It
                places or receives calls, answers questions using a linked knowledge library, updates
                client records, schedules appointments, and sends notifications (via text, WhatsApp, or
                email) to keep your business running smoothly 24/7.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
                <p className="text-sm font-semibold text-gray-900 mb-3">How this product is organized</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    {["Organization", "Processes", "Stages", "Workflow Steps", "In-Call Events / Post-Call Actions"].map(
                        (step, i, arr) => (
                            <React.Fragment key={step}>
                                <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-gray-700 font-medium">
                                    {step}
                                </span>
                                {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                            </React.Fragment>
                        )
                    )}
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
                    <li><span className="font-semibold text-gray-800">Organization</span> — your central account: business profiles, phone numbers, billing, and custom fields.</li>
                    <li><span className="font-semibold text-gray-800">Processes</span> — a specific customer path (e.g. "Patient Intake").</li>
                    <li><span className="font-semibold text-gray-800">Stages</span> — key milestones within a process (e.g. "Initial Contact").</li>
                    <li><span className="font-semibold text-gray-800">Workflow Steps</span> — event rules triggered during or after a call.</li>
                </ul>
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-3">Browse the guide</p>
            <div className="grid sm:grid-cols-2 gap-3">
                {GUIDE_DATA.map((page) => {
                    const Icon = page.icon;
                    return (
                        <button
                            key={page.slug}
                            onClick={() => onNavigate(page.slug)}
                            className="text-left p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <Icon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                                    {page.title}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">{page.intro}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  7. GUIDE PAGE CONTENT                                               */
/* ------------------------------------------------------------------ */

function GuideContent({ page }: { page: GuidePageData }) {
    return (
        <div className="max-w-3xl w-full">
            <div className="mb-8 pb-6 border-b border-gray-200">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                    {page.group}
                </p>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{page.title}</h1>
                <p className="text-[15px] leading-relaxed text-gray-600">{page.intro}</p>
            </div>

            <div className="space-y-10">
                {page.features.map((feature, idx) => {
                    const id = slugify(feature.title);
                    return (
                        <section key={id} id={id} className="scroll-mt-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-baseline gap-2">
                                <span className="text-blue-500 font-mono text-sm">{String(idx + 1).padStart(2, "0")}</span>
                                {feature.title}
                            </h2>
                            <div className="space-y-2.5 pl-1 border-l-2 border-gray-100 ml-1.5 pl-4">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-gray-900">What it does:</span> {feature.whatItDoes}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-gray-900">Why it helps you:</span> {feature.whyHelps}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold text-gray-900">How to use it:</span> {feature.howToUse}
                                </p>
                            </div>
                        </section>
                    );
                })}
            </div>

            {page.workflows.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Common workflows</h2>
                    <div className="space-y-4">
                        {page.workflows.map((wf, i) => (
                            <div key={i} className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                                <p className="text-sm font-semibold text-blue-900 mb-3">{wf.title}</p>
                                <ol className="space-y-2">
                                    {wf.steps.map((step, si) => (
                                        <li key={si} className="flex gap-2.5 text-sm text-gray-700">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                                                {si + 1}
                                            </span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  8. MAIN GUIDE PAGE ROUTE COMPONENT                                  */
/* ------------------------------------------------------------------ */

export default function GuidePageRoute() {
    const { slug } = useParams<{ slug?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const page = getPage(slug);

    const goTo = (targetSlug: string, sectionId?: string) => {
        navigate(`/guide/${targetSlug}${sectionId ? `#${sectionId}` : ""}`);
    };

    // Scroll to hash anchor whenever the route/hash changes
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace("#", "");
            // small delay lets the new page content mount first
            const t = setTimeout(() => {
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 60);
            return () => clearTimeout(t);
        } else if (contentRef.current) {
            contentRef.current.scrollTo({ top: 0 });
        }
    }, [location.pathname, location.hash]);

    return (
        <div className="min-h-screen bg-white">
            {/* Top bar */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
                <div className="flex items-center gap-4 px-4 md:px-6 py-3">
                    <button
                        className="md:hidden p-1.5 -ml-1.5 text-gray-600"
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1 max-w-md">
                        <GuideSearch onNavigate={goTo} />
                    </div>
                    <a
                        href="/"
                        className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                        Back to app <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="flex max-w-[1400px] mx-auto">
                <GuideSidebar
                    currentSlug={page?.slug}
                    onNavigate={goTo}
                    mobileOpen={mobileNavOpen}
                    setMobileOpen={setMobileNavOpen}
                />

                <div ref={contentRef} className="flex-1 min-w-0 px-6 md:px-10 py-8">
                    <div className="flex gap-8">
                        {page ? <GuideContent page={page} /> : <GuideHome onNavigate={goTo} />}
                        {page && <OnThisPage page={page} />}
                    </div>
                </div>
            </div>
        </div>
    );
}