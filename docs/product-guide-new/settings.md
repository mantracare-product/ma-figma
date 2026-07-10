# Settings & Profile

## What this page is for
The **Settings** screens allow you to configure business profiles, purchase routing numbers, create custom contact database fields, set up external CRM/EHR integrations, search the AI Voice catalog, and update user login details.

---

## Features on this page

### ## Business Details Tab
- **What it does:** Input fields for Company Name, Industry, Main Website, Country, Timezone, and base Currency.
- **Why it helps you:** Localizes your account settings so that call durations, date calculations, and billing reports display in your timezone and currency.
- **How to use it:** Fill in your business fields and click **Save Changes** at the bottom of the form.

### ## Custom Fields Tab
- **What it does:** Allows creating custom variables and input categories (like "Insurance ID" or "Allergies") to assign to Client Profiles, Call Logs, or Team Members.
- **Why it helps you:** Tailors the database to capture industry-specific variables that standard contact lists don't include.
- **How to use it:** Select a category (e.g. Clients), click **+ Add Custom Field**, choose the field type (Text, Number, Select), name the field, and save.

### ## Telephony & Phone Numbers Tab
- **What it does:** Lists active routing phone numbers, displays country-specific cost tables, and verifies new numbers.
- **Why it helps you:** Connects physical numbers to AI voice models. You can buy numbers in other countries to establish local presences.
- **How to use it:** Select the country, search for available numbers, and purchase. To connect your existing office number, click **Verify Number** and input the PIN verification code sent to your phone.

### ## Integrations & API Webhooks
- **What it does:** Link credentials for HubSpot, Salesforce, Google Calendars, or custom Webhook URLs to send call data to external databases.
- **Why it helps you:** Connects MantraAssist to your existing software suite so that call events instantly sync records.
- **How to use it:** Click the **Connect** button on the integration cards, log in, or paste your webhook URL.

### ## AI Voice Catalog Tab
- **What it does:** A searchable listing of AI receptionist voices (Ava, Sam, Eva, Aria, Jack, Mango) with play preview buttons, accents, and gender descriptions.
- **Why it helps you:** Allows you to find the perfect voice tone for your client demographic.
- **How to use it:** Use the search bar to filter voices (e.g. US Accent, Female). Click the **Play/Preview** button to hear them speak, and select your voice preference.

---

## Profile Settings (Screen / Drawer)

Managing your personal user account.

### 1. Profile Picture Upload & Personal Info
- **What it does:** Upload personal avatar photos, update personal email, phone, gender, and set password credentials.
- **Why it helps you:** Customizes how other team members see you on logs and calendars.
- **How to use it:** Click the profile picture widget to upload a file, update input fields, and save.

---

## Common workflows

### Workflow A: Creating an "Insurance Group Number" custom client field
1. Go to **Settings** and click the **Custom Fields** tab.
2. Under the **Clients** tab list, click **+ Add Custom Field**.
3. Input Label "Insurance Group No.", select type **Number** or **String**, and check **Required**.
4. Click **Save**. Open any Client Profile or Form Builder — this new field is now available.

### Workflow B: Syncing call logs to your CRM
1. Under **Settings**, select the **Integrations** tab.
2. Locate the HubSpot or Salesforce card and click **Connect**.
3. Log in to your account when prompted and authorize the API permissions.
4. Call summaries will now sync to client records automatically.
