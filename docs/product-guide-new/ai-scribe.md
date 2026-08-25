# AI Scribe & Clinical Voice Intelligence

## What this page is for
The **AI Scribe** console (`/scribe`) is an ambient, voice-first clinical documentation and automated prescription engine built into MantraAssist. It captures real-time doctor-patient audio during clinical encounters, generates speaker-diarized transcripts using Deepgram Nova-2 Medical STT, extracts clinical entities into an 11-section electronic health record (EHR) schema, and enables clinicians to customize the layout, generate verified PDF prescriptions, and dispatch them to patients via WhatsApp in 1 click.

---

## Features on this page

### 1. Transcripts Catalog & Search Bar
- **What it does:** Displays a centralized table containing all past and present consultation records with Patient Name, Session Date, Duration, Responsible Doctor, Created Timestamp, and Status badge. Includes live full-text filtering by patient name or clinical keyword.
- **Why it helps you:** Keeps all patient encounter documentation structured, searchable, and auditable in one central location.
- **How to use it:** Type a patient's name or keyword in the search bar to filter instantly. Click any row to open the complete consultation detail drawer.

### 2. "Add Scribe" Action Button & Consultation Drawer
- **What it does:** A prominent dark capsule button that opens the New Consultation drawer, allowing clinicians to either start a real-time ambient recording or upload pre-existing audio / text transcripts.
- **Why it helps you:** Provides a seamless entry point to begin documenting visits with zero friction.
- **How to use it:** Click **Add Scribe** on the top-right of the table row. Select the patient and doctor, choose your input method, and start the encounter.

### 3. Live Consultation Recorder & Audio Waveform
- **What it does:** Runs an ambient microphone capture with a live pulsing waveform and active timer counter. Deepgram Nova-2 Medical STT processes the speech stream and automatically tags doctor vs. patient turns.
- **Why it helps you:** Enables hands-free, eye-to-eye patient consultations without having to look at a keyboard or type notes.
- **How to use it:** In the New Consultation drawer, click **Start Live Recording**. Conduct your consultation naturally, then click **End Consultation** to automatically compile the record.

### 4. Upload Audio / Raw Text Ingestion
- **What it does:** Supports uploading recorded audio files (`.mp3`, `.wav`, `.m4a`) or pasting raw unformatted conversation notes. The entity extraction engine parses and structures the content into the EHR format.
- **Why it helps you:** Accommodates dictation devices, tele-health recordings, and offline notes.
- **How to use it:** In the consultation drawer, click **Upload Audio / Text**, drag your audio file or paste text, and click **Create Transcript**.

---

## Consultation Detail View & Interactive EHR Builder

Clicking any consultation row opens the comprehensive **2-Column Clinical Detail Drawer**.

### 5. 11-Section Modular EHR Schema
The left panel automatically structures clinical findings into 11 dedicated, interactive sections:
1. **Patient Demographics & Encounter Info**: Name, Age, Gender, Department, Date.
2. **Chief Complaints**: Primary reasons for visit with chip-based tag management.
3. **Diagnosis & ICD-10 Code**: Primary clinical diagnosis with medical coding.
4. **Medications & Dosages**: Table of drug name, dosage, frequency, and duration.
5. **Symptoms & Observations**: Clickable multi-tag chips with 1-click removal `(✕)` and instant inline entry.
6. **Precautions & Warnings**: Highlighted safety directives, contraindications, and dietary restrictions.
7. **Vitals & Clinical Metrics**: Blood pressure, heart rate, temperature, SpO2, BMI.
8. **Lab & Diagnostic Tests**: Ordered laboratory panels, radiology, or blood tests.
9. **Diet & Lifestyle Advice**: Exercise guidance, sleep hygiene, and nutritional notes.
10. **Follow-Up Schedule**: Recommended return date and condition triggers.
11. **Doctor Notes & Sign-off**: Freeform clinical commentary and physician signature block.

### 6. Drag-and-Drop Layout Customizer
- **What it does:** Allows clinicians to drag entire EHR sections via their grip handle to reorder the layout, add custom fields (`+ Add Field`) to any section, or create entirely new sections (`+ Add Section`).
- **Why it helps you:** Accommodates any medical specialty (Cardiology, Pediatrics, Dermatology, General Practice) and clinic-specific documentation standards.
- **How to use it:** Grab the section header grip handle and drag up/down to reposition. Click `+ Add Field` within any section to add custom key-value pairs.

### 7. Interactive Audio Player & Speaker-Diarized Transcript
- **What it does:** Positioned on the right panel, it displays a waveform audio player alongside the verbatim speaker turns (Doctor vs. Patient) with precise timestamps.
- **Why it helps you:** Allows rapid clinical audit — clinicians can listen back to specific moments in the consultation to verify dosage or symptoms.
- **How to use it:** Press Play on the audio bar or click any transcript turn to jump audio directly to that timestamp.

### 8. Verified Prescription PDF Generation
- **What it does:** Compiles the customized EHR data into a print-ready, officially formatted medical prescription PDF featuring the clinic header, Rx insignia, structured dosage table, doctor signature line, and verification watermark.
- **Why it helps you:** Replaces disconnected EHR prescription printing tools with instant 1-click document creation.
- **How to use it:** Click **Generate PDF Prescription** in the detail drawer header to preview and save the PDF.

### 9. 1-Click WhatsApp Direct Dispatch
- **What it does:** Opens a pre-formatted WhatsApp dispatch modal that delivers the secure digital prescription download link directly to the patient's phone.
- **Why it helps you:** Patients receive their treatment plan and digital Rx immediately on their phone before leaving the clinic, improving adherence.
- **How to use it:** Click **Send via WhatsApp** in the table action menu or inside the detail drawer, review the preview text, and click **Send Message Now**.

---

## Common Clinical Workflows

### Workflow A: Conducting an In-Person Consultation with Ambient Voice
1. Open the **AI Scribe** page (`/scribe`) and click **Add Scribe**.
2. Select or enter the patient's name and assign the attending physician.
3. Click **Start Live Recording** and place your device on the desk.
4. Speak normally with the patient — ask about symptoms, perform exam, and discuss prescriptions.
5. Click **End Consultation**. The system instantly diarizes speech and populates the 11 EHR sections.
6. Review the extracted diagnosis, verify medications, and click **Generate PDF Prescription**.
7. Click **Send via WhatsApp** to dispatch the prescription to the patient.

### Workflow B: Customizing EHR Sections for Specialty Clinics
1. Open any consultation from the **AI Scribe** table.
2. Click and hold the grip handle on the **Lab & Diagnostic Tests** section and drag it above **Medications**.
3. In the **Symptoms** section, click `✕` on any irrelevant symptom chip, and type a new symptom tag into the box.
4. Click `+ Add Field` at the bottom of the section to record specialty metrics (e.g. "Intraocular Pressure: 16 mmHg").
5. Click **Save Changes** — your custom configuration is saved to the record.

### Workflow C: Reviewing and Auditing Past Encounters
1. Type the patient's name in the **AI Scribe** search bar.
2. Click the table row to open the consultation.
3. On the right panel, scroll down the transcript to review what the patient stated regarding medication allergies.
4. Play the audio snippet directly to verify the exact dialogue.
