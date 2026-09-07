import { useEffect, useState } from 'react';
import {
  IndustryCategory,
  Industry,
  IndustryStarterBundle,
  ProcessTemplate,
  FormTemplate,
  DocumentTemplate,
  DefaultServiceTemplate,
  CustomFieldTemplate,
  ProvisionedWorkspace,
  ProvisioningStepLog,
} from './types/industry-templates';

// ==========================================
// SEED DATA: CATEGORIES
// ==========================================
export const SEED_CATEGORIES: IndustryCategory[] = [
  {
    id: 'cat-healthcare',
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'All healthcare related services',
    icon: 'Stethoscope',
    displayOrder: 1,
    isActive: true,
    industriesCount: 24,
  },
  {
    id: 'cat-auto',
    name: 'Automobile',
    slug: 'automobile',
    description: 'Services tied to buying, maintaining, and servicing vehicles.',
    icon: 'Car',
    displayOrder: 2,
    isActive: true,
    industriesCount: 4,
  },
  {
    id: 'cat-coaching',
    name: 'Coaching & Advisory',
    slug: 'coaching-advisory',
    description: 'Professional coaches and advisors guiding clients on personal, financial, or legal matters outside clinical care.',
    icon: 'Sparkles',
    displayOrder: 3,
    isActive: true,
    industriesCount: 3,
  },
  {
    id: 'cat-wellness',
    name: 'Wellness & Lifestyle',
    slug: 'wellness-lifestyle',
    description: 'Non-clinical practitioners supporting physical and lifestyle health through nutrition, fitness, yoga, and mindfulness.',
    icon: 'Activity',
    displayOrder: 4,
    isActive: true,
    industriesCount: 3,
  },
  {
    id: 'cat-realestate',
    name: 'Real Estate',
    slug: 'real-estate',
    description: 'Services covering property buying, selling, renting, and the advisory work around a deal.',
    icon: 'Home',
    displayOrder: 5,
    isActive: true,
    industriesCount: 3,
  },
  {
    id: 'cat-household',
    name: 'Household Care',
    slug: 'household-care',
    description: "On-demand visits where a professional comes to the client's home to fix, install, clean, or improve something.",
    icon: 'Wrench',
    displayOrder: 6,
    isActive: true,
    industriesCount: 4,
  },
  {
    id: 'cat-tech',
    name: 'IT/Tech',
    slug: 'it-tech',
    description: 'IT/Tech related services',
    icon: 'Cpu',
    displayOrder: 7,
    isActive: true,
    industriesCount: 7,
  },
];

// ==========================================
// SEED DATA: MASTER STARTER BUNDLES (8 VERTICALS)
// ==========================================
export const SEED_BUNDLES: IndustryStarterBundle[] = [
  // 1. DENTAL PRACTICE
  {
    id: 'bundle-dental',
    industryId: 'ind-dental',
    industryName: 'Dental Practice',
    categoryName: 'Healthcare & Medical',
    slug: 'dental-practice',
    version: '1.4.0',
    status: 'published',
    recommendedTone: 'Compassionate, Clinical, Reassuring',
    badges: ['Popular', 'HIPAA Ready', 'Turnkey Starter'],
    processTemplate: {
      id: 'proc-dental-01',
      industryId: 'ind-dental',
      industryName: 'Dental Practice',
      name: 'Dental Patient Inbound & Recall Care Journey',
      description: 'Full telephony roadmap covering emergency intake, regular cleaning appointments, and 6-month hygiene recall outreach.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-15T14:30:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 1.0,
        voiceGender: 'female',
        voiceTone: 'Warm & Empathetic',
        recordCalls: true,
        maxDurationMinutes: 6,
        wrapUpWindowSeconds: 45,
        retryRules: {
          enabled: true,
          maxAttempts: 3,
          delayMinutes: 45,
        },
        skipDayRules: {
          enabled: true,
          skipDaysOfWeek: [0, 6], // Sunday & Saturday
          skipHolidays: true,
        },
        voicemailDetection: {
          enabled: true,
          action: 'leave_message',
          voicemailMessage: 'Hello, this is Sarah from {{business_name}} following up on your dental care inquiry. Please call us back at your convenience.',
        },
      },
      stages: [
        {
          id: 'stg-den-1',
          stageOrder: 1,
          name: 'New Patient Inbound & Triage',
          stageCode: 'STG_NEW_PT',
          goal: 'Determine reason for calling, triage pain level/urgency, and capture insurance details.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Thank you for calling {{business_name}}. My name is Sarah, your AI dental care coordinator. Are you calling to book a new appointment or do you have a dental emergency?',
            callerPitch: 'Speak warmly and empathetically. If patient mentions acute pain, swollen gums, or trauma, prioritize same-day emergency slots. Mandatory data points to collect: Full Name, Phone, Primary Concern, Insurance Provider, Preferred Time.',
            targetObjective: 'Book consultation appointment or dispatch emergency protocol',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
        {
          id: 'stg-den-2',
          stageOrder: 2,
          name: 'Pre-Appointment Medical Clearance',
          stageCode: 'STG_PRE_OP',
          goal: 'Confirm upcoming visit time, screen for medical conditions, and verify pre-medication needs.',
          basic: {
            callAction: 'ai_makes_calls',
            greetingPhrase: 'Hi {{client_name}}, this is Sarah from {{business_name}} calling to confirm your upcoming visit on {{appointment_time}} with Dr. Evans.',
            callerPitch: 'Confirm patient arrival 15 minutes early. Ask: "Do you have any penicillin allergies or require antibiotic pre-medication before dental cleanings?" Log responses directly into patient chart.',
            targetObjective: 'Verify patient readiness and medical contraindications',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: true,
            maxDurationMinutes: 4,
            overrideRetryRules: true,
            retryAttempts: 2,
            retryDelayMinutes: 30,
            overrideSkipDays: false,
            overrideVoicemail: true,
            detectVoicemail: true,
            voicemailAction: 'leave_message',
            voicemailMessage: 'Hi {{client_name}}, this is {{business_name}} confirming your dental visit on {{appointment_time}}. Please call us back if you need to reschedule.',
            recordCall: true,
          },
        },
        {
          id: 'stg-den-3',
          stageOrder: 3,
          name: 'Post-Op Hygiene & Procedure Check',
          stageCode: 'STG_POST_OP',
          goal: 'Check recovery status 24h after fillings, extractions, or crown placements.',
          basic: {
            callAction: 'ai_makes_calls',
            greetingPhrase: 'Hello {{client_name}}, Dr. Evans and the care team at {{business_name}} wanted to check in on how you are feeling after your recent {{service_name}}.',
            callerPitch: 'Assess pain level (1-10). Check if bleeding has stopped. Remind them to avoid hot beverages or hard foods for 24 hours. If severe pain > 7 or excessive bleeding, offer immediate warm transfer to on-call dentist.',
            targetObjective: 'Ensure safe healing and prevent complications',
          },
          advanced: {
            overrideAiModel: true,
            aiModel: 'gpt-4o-mini',
            overrideDuration: false,
            overrideRetryRules: true,
            retryAttempts: 3,
            retryDelayMinutes: 60,
            overrideSkipDays: true,
            allowWeekendCalling: true, // Allow post-op checks on Saturdays
            overrideVoicemail: false,
            recordCall: true,
          },
        },
        {
          id: 'stg-den-4',
          stageOrder: 4,
          name: '6-Month Hygiene Recall',
          stageCode: 'STG_RECALL',
          goal: 'Re-engage existing patients due for routine 6-month cleaning and exam.',
          basic: {
            callAction: 'ai_makes_calls',
            greetingPhrase: 'Hi {{client_name}}, this is {{business_name}}! It has been 6 months since your last dental cleaning, and Dr. Evans has an opening next Tuesday or Thursday morning. Would either work for you?',
            callerPitch: 'Present convenient scheduling options. Mention preventive care benefits. If patient requests callback later, note preferred date/time.',
            targetObjective: 'Schedule routine preventive cleaning and checkup',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: true,
            retryAttempts: 2,
            retryDelayMinutes: 120,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-den-01',
        industryId: 'ind-dental',
        industryName: 'Dental Practice',
        title: 'New Patient Intake & Medical History Form',
        slug: 'new-patient-intake',
        category: 'intake',
        description: 'Comprehensive digital registration capturing contact details, medical conditions, insurance card photos, and primary dental concerns.',
        estimatedMinutes: 4,
        submitButtonText: 'Submit Patient Registration',
        successMessage: 'Thank you for submitting your intake form! Your dental chart has been created and our receptionist will confirm your appointment shortly.',
        autoCreateClient: true,
        notificationEmail: 'reception@{{org_domain}}.com',
        notificationSms: '+1 (555) 019-2831',
        createdAt: '2026-01-12T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-den-1',
            title: 'Personal & Contact Information',
            description: 'Please provide legal name and contact coordinates.',
            fields: [
              {
                id: 'f-den-1',
                label: 'Full Legal Name',
                name: 'full_name',
                type: 'text',
                placeholder: 'e.g. Johnathan Doe',
                isRequired: true,
                crmFieldMapping: 'client_name',
              },
              {
                id: 'f-den-2',
                label: 'Date of Birth',
                name: 'dob',
                type: 'date',
                isRequired: true,
                crmFieldMapping: 'client_dob',
              },
              {
                id: 'f-den-3',
                label: 'Mobile Phone Number',
                name: 'phone',
                type: 'phone',
                placeholder: '+1 (555) 000-0000',
                isRequired: true,
                crmFieldMapping: 'client_phone',
              },
              {
                id: 'f-den-4',
                label: 'Email Address',
                name: 'email',
                type: 'email',
                placeholder: 'john@example.com',
                isRequired: true,
                crmFieldMapping: 'client_email',
              },
            ],
          },
          {
            id: 'sec-den-2',
            title: 'Dental Health & Chief Complaint',
            description: 'Tell us about your dental goals and current symptoms.',
            fields: [
              {
                id: 'f-den-5',
                label: 'Primary Reason for Visit',
                name: 'chief_complaint',
                type: 'select',
                isRequired: true,
                options: [
                  { label: 'Routine Cleaning & Exam', value: 'cleaning' },
                  { label: 'Tooth Pain / Cavity Check', value: 'pain_cavity' },
                  { label: 'Broken / Chipped Tooth', value: 'broken_tooth' },
                  { label: 'Teeth Whitening / Cosmetic Consult', value: 'cosmetic' },
                  { label: 'Emergency Toothache / Swelling', value: 'emergency' },
                ],
                crmFieldMapping: 'dental_chief_complaint',
              },
              {
                id: 'f-den-6',
                label: 'Do you experience dental anxiety or fear?',
                name: 'has_dental_anxiety',
                type: 'radio',
                isRequired: false,
                options: [
                  { label: 'No, I feel comfortable', value: 'none' },
                  { label: 'Mild nervousness', value: 'mild' },
                  { label: 'Severe anxiety (Sedation interest)', value: 'severe' },
                ],
                crmFieldMapping: 'dental_anxiety_level',
              },
            ],
          },
          {
            id: 'sec-den-3',
            title: 'Insurance & Payment Preferences',
            fields: [
              {
                id: 'f-den-7',
                label: 'Insurance Provider Network',
                name: 'insurance_provider',
                type: 'text',
                placeholder: 'e.g. Delta Dental, Cigna, MetLife, Self-Pay',
                isRequired: false,
                crmFieldMapping: 'insurance_provider',
              },
              {
                id: 'f-den-8',
                label: 'Member Policy ID',
                name: 'policy_id',
                type: 'text',
                placeholder: 'e.g. D12345678',
                isRequired: false,
                crmFieldMapping: 'policy_id',
              },
              {
                id: 'f-den-9',
                label: 'Insurance Card Photo Upload',
                name: 'insurance_card_file',
                type: 'file',
                helperText: 'Upload a clear photo of the front of your dental insurance card',
                isRequired: false,
              },
            ],
          },
        ],
      },
      {
        id: 'form-den-02',
        industryId: 'ind-dental',
        industryName: 'Dental Practice',
        title: 'Emergency Dental Consultation & Triage Form',
        slug: 'emergency-consult',
        category: 'booking',
        description: 'Fast-track emergency intake form for patients experiencing severe acute dental distress.',
        estimatedMinutes: 2,
        submitButtonText: 'Request Emergency Slot',
        successMessage: 'Emergency alert dispatched! Our on-call dental coordinator has received your request and will call you within 10 minutes.',
        autoCreateClient: true,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-12T10:00:00Z',
        sections: [
          {
            id: 'sec-den-em-1',
            title: 'Urgent Contact & Pain Assessment',
            fields: [
              {
                id: 'f-em-1',
                label: 'Patient Name',
                name: 'patient_name',
                type: 'text',
                isRequired: true,
              },
              {
                id: 'f-em-2',
                label: 'Direct Phone Number',
                name: 'phone_number',
                type: 'phone',
                isRequired: true,
              },
              {
                id: 'f-em-3',
                label: 'Pain Level (1-10 Scale)',
                name: 'pain_scale',
                type: 'select',
                isRequired: true,
                options: [
                  { label: '1-3 (Mild dull ache)', value: '1-3' },
                  { label: '4-6 (Moderate throbbing pain)', value: '4-6' },
                  { label: '7-10 (Severe / Unbearable pain)', value: '7-10' },
                ],
              },
              {
                id: 'f-em-4',
                label: 'Is there visible facial swelling or bleeding?',
                name: 'swelling_bleeding',
                type: 'checkbox',
                isRequired: false,
              },
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-den-01',
        industryId: 'ind-dental',
        industryName: 'Dental Practice',
        serviceId: 'srv-den-1',
        serviceName: 'Routine Hygiene Cleaning & Exam',
        name: 'Patient Informed Consent & Treatment Authorization',
        title: 'Patient Informed Consent & Treatment Authorization',
        description: 'Mandatory clinical consent and treatment agreement for dental procedures, local anesthesia, and diagnostic imaging.',
        creationMethod: 'custom',
        sourceFileName: 'Dental_Patient_Consent_Standard.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'DEN-CON-',
          sequenceDigits: 4,
          currentNumber: 1042,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{patient_name}}', mappedVariable: 'client_name', label: 'Patient Full Name', fieldSource: 'system' },
          { placeholder: '{{patient_dob}}', mappedVariable: 'custom_field_dob', label: 'Date of Birth', fieldSource: 'custom' },
          { placeholder: '{{treatment_date}}', mappedVariable: 'appointment_date', label: 'Treatment Date', fieldSource: 'system' },
          { placeholder: '{{service_name}}', mappedVariable: 'service_name', label: 'Procedure Name', fieldSource: 'system' },
          { placeholder: '{{doctor_name}}', mappedVariable: 'assigned_provider', label: 'Treating Dentist', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1456f0; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800;">DENTAL TREATMENT INFORMED CONSENT</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Clinical Reference Document & Patient Authorization</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #eff6ff; color: #1456f0; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
        Doc #: {{doc_number}}
      </span>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Date: {{treatment_date}}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
    <tr style="background: #f8fafc;">
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 25%; font-weight: bold; color: #475569;">Patient Name:</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 25%; color: #0f172a;">{{patient_name}}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 25%; font-weight: bold; color: #475569;">Date of Birth:</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; width: 25%; color: #0f172a;">{{patient_dob}}</td>
    </tr>
    <tr style="background: #ffffff;">
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Scheduled Service:</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #0f172a;">{{service_name}}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Treating Clinician:</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #0f172a;">{{doctor_name}}</td>
    </tr>
  </table>

  <h4 style="color: #0f172a; margin: 16px 0 8px 0; font-size: 14px;">1. Treatment Acknowledgment & Consent</h4>
  <p style="font-size: 12px; color: #475569; margin-bottom: 12px;">
    I hereby authorize Dr. <strong>{{doctor_name}}</strong> and designated clinical dental assistants to perform the examination, dental diagnostics, administration of local anesthesia, and procedural treatments described under <strong>{{service_name}}</strong>.
  </p>

  <h4 style="color: #0f172a; margin: 16px 0 8px 0; font-size: 14px;">2. Risks & Clinical Considerations</h4>
  <p style="font-size: 12px; color: #475569; margin-bottom: 12px;">
    I understand that dental procedures carry inherent risks including temporary numbness, sensitivity to temperature, swelling, and localized discomfort. Alternative treatment options have been explained to my full satisfaction.
  </p>

  <div style="margin-top: 30px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <p style="font-size: 11px; color: #64748b; margin-bottom: 24px;">Patient / Legal Guardian Signature:</p>
      <div style="border-bottom: 1px solid #334155; width: 100%;"></div>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Authorized Signatory: {{patient_name}}</p>
    </div>
    <div style="width: 45%;">
      <p style="font-size: 11px; color: #64748b; margin-bottom: 24px;">Clinician Verification & Date:</p>
      <div style="border-bottom: 1px solid #334155; width: 100%;"></div>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Verified by: {{doctor_name}} on {{treatment_date}}</p>
    </div>
  </div>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'doc-den-02',
        industryId: 'ind-dental',
        industryName: 'Dental Practice',
        serviceId: 'srv-den-2',
        serviceName: 'Emergency Dental Consultation',
        name: 'HIPAA Privacy Notice & Medical History Disclosure',
        title: 'HIPAA Privacy Notice & Medical History Disclosure',
        description: 'Federal HIPAA compliance acknowledgment, protected health information (PHI) electronic handling authorization.',
        creationMethod: 'import_doc',
        sourceFileName: 'HIPAA_Consent_Release.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'DEN-HIPAA-',
          sequenceDigits: 4,
          currentNumber: 2018,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{patient_name}}', mappedVariable: 'client_name', label: 'Patient Name', fieldSource: 'system' },
          { placeholder: '{{patient_phone}}', mappedVariable: 'client_phone', label: 'Contact Phone', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">HIPAA PRIVACY PRACTICES ACKNOWLEDGMENT</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Notice of Protected Health Information (PHI) Handling | Reference: {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">I acknowledge that I have received and reviewed the Notice of Privacy Practices for dental care, outlining how my clinical records, radiography, and billing records are stored and protected under HIPAA law.</p>
  <p style="font-size: 13px; color: #334155;"><strong>Patient Name:</strong> {{patient_name}} &nbsp;|&nbsp; <strong>Contact Phone:</strong> {{patient_phone}}</p>
</div>`,
        createdAt: '2026-01-09T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      {
        id: 'srv-den-1',
        name: 'Routine Hygiene Cleaning & Exam',
        durationMinutes: 50,
        priceEstimate: 149,
        description: 'Comprehensive oral exam, digital panoramic X-rays, plaque scaling, and polish.',
        category: 'Preventive',
        isPopular: true,
      },
      {
        id: 'srv-den-2',
        name: 'Emergency Dental Consultation',
        durationMinutes: 30,
        priceEstimate: 95,
        description: 'Targeted exam and periapical X-ray for acute pain, chipped teeth, or abscesses.',
        category: 'Emergency',
        isPopular: true,
      },
      {
        id: 'srv-den-3',
        name: 'Professional In-Office Teeth Whitening',
        durationMinutes: 60,
        priceEstimate: 350,
        description: 'LED accelerated whitening delivering up to 8 shades lighter in a single visit.',
        category: 'Cosmetic',
      },
      {
        id: 'srv-den-4',
        name: 'Deep Cleaning (Scaling & Root Planing)',
        durationMinutes: 75,
        priceEstimate: 225,
        description: 'Subgingival periodontal therapy for gum disease management.',
        category: 'Periodontics',
      },
      {
        id: 'srv-den-5',
        name: 'Clear Aligner (Invisalign) Consultation',
        durationMinutes: 45,
        priceEstimate: 0,
        description: '3D iTero digital scan and orthodontic smile simulation.',
        category: 'Orthodontics',
      },
    ],
    customFields: [
      {
        id: 'cf-den-1',
        name: 'Insurance Carrier Name',
        key: 'insurance_carrier',
        type: 'Text',
        entity: 'Client',
        isRequired: false,
        description: 'Primary dental insurance company name',
      },
      {
        id: 'cf-den-2',
        name: 'Dental Anxiety Level',
        key: 'dental_anxiety_level',
        type: 'Select (Dropdown)',
        entity: 'Client',
        options: ['None / Relaxed', 'Mild Anxiety', 'High / Sedation Candidate'],
        isRequired: false,
      },
      {
        id: 'cf-den-3',
        name: 'Last Hygiene Visit Date',
        key: 'last_hygiene_visit',
        type: 'Date',
        entity: 'Client',
        isRequired: false,
      },
      {
        id: 'cf-den-4',
        name: 'Requires Antibiotic Pre-Med',
        key: 'requires_premed',
        type: 'Boolean (Yes/No)',
        entity: 'Client',
        isRequired: false,
      },
      {
        id: 'cf-den-5',
        name: 'Primary Chief Complaint',
        key: 'chief_complaint',
        type: 'Text',
        entity: 'Call Log',
        isRequired: true,
      },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-18T16:00:00Z',
  },

  // 2. CARDIOLOGY PRACTICE
  {
    id: 'bundle-cardiology',
    industryId: 'ind-cardio',
    industryName: 'Cardiology Specialist',
    categoryName: 'Healthcare & Medical',
    slug: 'cardiology-specialist',
    version: '1.2.0',
    status: 'published',
    recommendedTone: 'Clinical, Precise, Empathetic',
    badges: ['HIPAA Ready', 'Clinical Grade'],
    processTemplate: {
      id: 'proc-cardio-01',
      industryId: 'ind-cardio',
      name: 'Cardiology Patient Inbound & Follow-up Journey',
      description: 'Standardized clinical triage for chest pain, palpitations, ECG scheduling, and post-stent follow-up.',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-10T12:00:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 0.95,
        voiceGender: 'male',
        voiceTone: 'Calm & Professional',
        recordCalls: true,
        maxDurationMinutes: 8,
        wrapUpWindowSeconds: 60,
        retryRules: {
          enabled: true,
          maxAttempts: 3,
          delayMinutes: 30,
        },
        skipDayRules: {
          enabled: true,
          skipDaysOfWeek: [0], // Only skip Sunday
          skipHolidays: true,
        },
        voicemailDetection: {
          enabled: true,
          action: 'leave_message',
          voicemailMessage: 'This is {{business_name}} calling regarding your cardiology appointment. Please return our call at your earliest convenience.',
        },
      },
      stages: [
        {
          id: 'stg-card-1',
          stageOrder: 1,
          name: 'Symptom Triage & Intake',
          stageCode: 'STG_CARD_INTAKE',
          goal: 'Screen for emergency cardiac symptoms and route appropriately.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Thank you for calling {{business_name}}. I am the AI clinical coordinator. If you are experiencing severe crushing chest pain or shortness of breath, please hang up and dial 911 immediately.',
            callerPitch: 'Speak with calm authority. Ask if caller has a physician referral, known history of arrhythmia, or hypertension. Collect current medications.',
            targetObjective: 'Triage urgency and book cardiology consultation',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
        {
          id: 'stg-card-2',
          stageOrder: 2,
          name: 'Pre-Test Prep Confirmation',
          stageCode: 'STG_CARD_PREP',
          goal: 'Remind patient of fasting and caffeine restrictions before stress echo or Holter monitor fitting.',
          basic: {
            callAction: 'ai_makes_calls',
            greetingPhrase: 'Hello {{client_name}}, calling from {{business_name}} to confirm your stress test on {{appointment_time}}.',
            callerPitch: 'Remind patient: No caffeine or decaf for 24 hours prior. Wear comfortable sneakers and loose two-piece clothing.',
            targetObjective: 'Ensure test protocol compliance',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: true,
            maxDurationMinutes: 4,
            overrideRetryRules: true,
            retryAttempts: 2,
            retryDelayMinutes: 45,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-card-01',
        industryId: 'ind-cardio',
        title: 'Cardiac Health & Medication Intake Form',
        category: 'intake',
        description: 'Pre-consultation history covering past stents, pacemakers, and medication list.',
        estimatedMinutes: 5,
        submitButtonText: 'Submit Medical Form',
        successMessage: 'Your cardiology intake form has been securely transmitted to Dr. Sharma.',
        autoCreateClient: true,
        createdAt: '2026-01-12T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-card-1',
            title: 'Cardiovascular History',
            fields: [
              {
                id: 'f-card-1',
                label: 'Patient Full Name',
                name: 'full_name',
                type: 'text',
                isRequired: true,
              },
              {
                id: 'f-card-2',
                label: 'Referring Doctor Name',
                name: 'referring_dr',
                type: 'text',
                isRequired: false,
              },
              {
                id: 'f-card-3',
                label: 'Current Blood Pressure / Cardiac Medications',
                name: 'medications',
                type: 'textarea',
                isRequired: true,
              },
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-card-01',
        industryId: 'ind-cardio',
        industryName: 'Cardiology Clinic',
        serviceId: 'srv-card-1',
        serviceName: 'Comprehensive Cardiology Initial Consult',
        name: 'Cardiac Stress Test & Holter Monitor Prep Consent Agreement',
        title: 'Cardiac Stress Test & Holter Monitor Prep Consent Agreement',
        description: 'Pre-procedure informed consent, telemetry protocol acknowledgment, and equipment return authorization.',
        creationMethod: 'custom',
        sourceFileName: 'Cardio_Stress_Holter_Consent.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'CARD-CON-',
          sequenceDigits: 4,
          currentNumber: 1018,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{patient_name}}', mappedVariable: 'client_name', label: 'Patient Name', fieldSource: 'system' },
          { placeholder: '{{doctor_name}}', mappedVariable: 'assigned_provider', label: 'Cardiologist', fieldSource: 'system' },
          { placeholder: '{{treatment_date}}', mappedVariable: 'appointment_date', label: 'Procedure Date', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">CARDIAC DIAGNOSTIC & STRESS TEST CONSENT</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Clinical Cardiology Protocol & Telemetry Agreement</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #fef2f2; color: #dc2626; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #fecaca;">
        Ref: {{doc_number}}
      </span>
    </div>
  </div>
  <p style="font-size: 13px; color: #334155;">I authorize Dr. <strong>{{doctor_name}}</strong> to perform diagnostic cardiac stress evaluation, telemetry analysis, and Holter monitoring for <strong>{{patient_name}}</strong> on <strong>{{treatment_date}}</strong>.</p>
</div>`,
        createdAt: '2026-01-10T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      {
        id: 'srv-card-1',
        name: 'Comprehensive Cardiology Initial Consult',
        durationMinutes: 45,
        priceEstimate: 320,
        description: 'Complete cardiac evaluation, resting 12-lead ECG, and risk assessment.',
        isPopular: true,
      },
      {
        id: 'srv-card-2',
        name: 'Echocardiogram (Transthoracic)',
        durationMinutes: 40,
        priceEstimate: 450,
        description: 'Ultrasound imaging of heart chambers and valves.',
      },
    ],
    customFields: [
      {
        id: 'cf-card-1',
        name: 'Has Pacemaker / ICD',
        key: 'has_pacemaker',
        type: 'Boolean (Yes/No)',
        entity: 'Client',
        isRequired: false,
      },
    ],
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-02-14T14:00:00Z',
  },

  // 3. PERSONAL INJURY LAW
  {
    id: 'bundle-legal-injury',
    industryId: 'ind-legal-injury',
    industryName: 'Personal Injury Law',
    categoryName: 'Legal & Professional',
    slug: 'personal-injury-law',
    version: '2.1.0',
    status: 'published',
    recommendedTone: 'Authoritative, Empathetic, Sharp',
    badges: ['Popular', '24/7 Intake', 'High Conversion'],
    processTemplate: {
      id: 'proc-leg-01',
      industryId: 'ind-legal-injury',
      name: '24/7 Accident Intake & Retainer Qualification',
      description: 'Rapid lead intake to qualify motor vehicle accidents, slip & falls, and workplace injuries before statute of limitations.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'gpt-4o-mini',
        voiceSpeed: 1.0,
        voiceGender: 'neutral',
        voiceTone: 'Empathetic & Authoritative',
        recordCalls: true,
        maxDurationMinutes: 7,
        wrapUpWindowSeconds: 30,
        retryRules: {
          enabled: true,
          maxAttempts: 4,
          delayMinutes: 20,
        },
        skipDayRules: {
          enabled: false, // 24/7 law intake never skips days!
          skipDaysOfWeek: [],
          skipHolidays: false,
        },
        voicemailDetection: {
          enabled: true,
          action: 'leave_message',
          voicemailMessage: 'Hello, this is the legal intake team at {{business_name}} following up on your accident evaluation request. Please call us back at {{business_phone}}.',
        },
      },
      stages: [
        {
          id: 'stg-leg-1',
          stageOrder: 1,
          name: 'Immediate Accident Qualification',
          stageCode: 'STG_ACCIDENT_INTAKE',
          goal: 'Capture date of incident, injury severity, liability fault, and police report status.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Thank you for calling {{business_name}} Legal Group. My name is Alex. We are here to help you get the justice and financial recovery you deserve. Are you calling regarding a recent accident or injury?',
            callerPitch: 'Express genuine sympathy for their situation. Ask: 1) Date of accident, 2) Were you at fault?, 3) Did you receive emergency medical care?, 4) Are you currently represented by another attorney? If high-value case, initiate live attorney warm transfer.',
            targetObjective: 'Qualify contingency case feasibility and schedule attorney consult',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
        {
          id: 'stg-leg-2',
          stageOrder: 2,
          name: 'Retainer Agreement Fast-Track',
          stageCode: 'STG_RETAINER_FOLLOWUP',
          goal: 'Help qualified injured claimants e-sign contingency retainer document.',
          basic: {
            callAction: 'ai_makes_calls',
            greetingPhrase: 'Hi {{client_name}}, this is Alex from {{business_name}}. We sent your contingency retainer agreement to {{client_email}}. I can walk you through the electronic signature right now.',
            callerPitch: 'Remind client of No Fee Unless We Win guarantee. Answer questions regarding 33.3% contingency structure. Verify e-signature completion.',
            targetObjective: 'Obtain signed representation agreement',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: true,
            maxDurationMinutes: 5,
            overrideRetryRules: true,
            retryAttempts: 3,
            retryDelayMinutes: 45,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-leg-01',
        industryId: 'ind-legal-injury',
        title: 'Free Case Evaluation & Accident Intake Form',
        category: 'lead_capture',
        description: 'High-converting mobile form for injured claimants seeking immediate legal assessment.',
        estimatedMinutes: 2,
        submitButtonText: 'Claim Free Case Review',
        successMessage: 'Case details received! An intake attorney will review your file and call you within 15 minutes.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-leg-1',
            title: 'Accident Incident Details',
            fields: [
              {
                id: 'f-leg-1',
                label: 'Your Name',
                name: 'claimant_name',
                type: 'text',
                isRequired: true,
              },
              {
                id: 'f-leg-2',
                label: 'Phone Number',
                name: 'phone',
                type: 'phone',
                isRequired: true,
              },
              {
                id: 'f-leg-3',
                label: 'Type of Accident',
                name: 'accident_type',
                type: 'select',
                isRequired: true,
                options: [
                  { label: 'Auto / Car Collision', value: 'auto' },
                  { label: 'Truck / Semi-Trailer Accident', value: 'truck' },
                  { label: 'Motorcycle / Bicycle Crash', value: 'motorcycle' },
                  { label: 'Slip & Fall / Premises Liability', value: 'slip_fall' },
                  { label: 'Workplace Injury / Construction', value: 'workplace' },
                ],
              },
              {
                id: 'f-leg-4',
                label: 'Did you sustain physical injuries requiring medical care?',
                name: 'has_injuries',
                type: 'radio',
                isRequired: true,
                options: [
                  { label: 'Yes (ER / Hospital / Doctor visit)', value: 'yes' },
                  { label: 'No visible injuries', value: 'no' },
                ],
              },
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-leg-01',
        industryId: 'ind-legal-injury',
        industryName: 'Personal Injury Law',
        serviceId: 'srv-leg-1',
        serviceName: 'Free Case Evaluation (30m)',
        name: 'Contingency Fee Representation Agreement & Power of Attorney',
        title: 'Contingency Fee Representation Agreement & Power of Attorney',
        description: 'Standard attorney representation retainer, litigation expense advance agreement, and client power of attorney.',
        creationMethod: 'import_doc',
        sourceFileName: 'PI_Contingency_Retainer_Agreement.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'LEG-RET-',
          sequenceDigits: 4,
          currentNumber: 5082,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Client Full Name', fieldSource: 'system' },
          { placeholder: '{{incident_date}}', mappedVariable: 'appointment_date', label: 'Incident Date', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #181e25; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #181e25; font-size: 18px; font-weight: 800;">LEGAL RETAINER & CONTINGENCY FEE AGREEMENT</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Matter Ref: {{doc_number}} | Client: {{client_name}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Client agrees to retain counsel for personal injury representation regarding claims arising on {{incident_date}}. Legal fees are 100% contingent on monetary recovery.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      {
        id: 'srv-leg-1',
        name: 'Auto Accident Case Evaluation',
        durationMinutes: 30,
        priceEstimate: 0,
        description: 'Comprehensive liability, police report review, and injury claim assessment.',
        isPopular: true,
      },
    ],
    customFields: [
      {
        id: 'cf-leg-1',
        name: 'Accident Date',
        key: 'accident_date',
        type: 'Date',
        entity: 'Deal / Opportunity',
        isRequired: true,
      },
      {
        id: 'cf-leg-2',
        name: 'Police Report Number',
        key: 'police_report_no',
        type: 'Text',
        entity: 'Deal / Opportunity',
        isRequired: false,
      },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },

  // 4. RESIDENTIAL REAL ESTATE
  {
    id: 'bundle-realestate',
    industryId: 'ind-realestate',
    industryName: 'Residential Real Estate Brokerage',
    categoryName: 'Real Estate & Property',
    slug: 'residential-real-estate',
    version: '1.3.0',
    status: 'published',
    recommendedTone: 'Polished, Enthusiastic, Consultative',
    badges: ['Top Vertical', 'Lead Nurture'],
    processTemplate: {
      id: 'proc-re-01',
      industryId: 'ind-realestate',
      name: 'Buyer & Seller Lead Fast-Response Pipeline',
      description: 'Instant response to Zillow/Realtor leads, private tour scheduling, and home valuation requests.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 1.05,
        voiceGender: 'female',
        voiceTone: 'Enthusiastic & Professional',
        recordCalls: true,
        maxDurationMinutes: 6,
        wrapUpWindowSeconds: 45,
        retryRules: {
          enabled: true,
          maxAttempts: 3,
          delayMinutes: 30,
        },
        skipDayRules: {
          enabled: false, // Real estate operates heavily on weekends!
          skipDaysOfWeek: [],
          skipHolidays: false,
        },
        voicemailDetection: {
          enabled: true,
          action: 'leave_message',
          voicemailMessage: 'Hi, this is Jessica from {{business_name}} regarding the property listing you viewed. Call or text me at {{business_phone}} for exclusive showing access.',
        },
      },
      stages: [
        {
          id: 'stg-re-1',
          stageOrder: 1,
          name: 'Instant Property Lead Qualification',
          stageCode: 'STG_RE_LEAD',
          goal: 'Confirm property address, budget range, pre-approval letter, and buying timeline.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Hi! Thank you for contacting {{business_name}}. I am Jessica, your property concierge. Are you inquiring about a specific home listing or looking to get a valuation on your current home?',
            callerPitch: 'Energetic and helpful. Identify if they are a buyer, seller, or investor. Ask: "Have you been pre-approved with a lender?" and "What is your target move-in timeline?"',
            targetObjective: 'Schedule property showing or listing presentation',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-re-01',
        industryId: 'ind-realestate',
        title: 'Home Valuation & Seller Market Analysis Form',
        category: 'quote',
        description: 'Instant comparative market analysis request for homeowners looking to sell.',
        estimatedMinutes: 2,
        submitButtonText: 'Get Free Home Valuation',
        successMessage: 'Your property report is being generated! Our lead listing agent will deliver your custom CMA within 2 hours.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-re-1',
            title: 'Property Details',
            fields: [
              { id: 'f-re-1', label: 'Property Address', name: 'property_address', type: 'text', isRequired: true },
              { id: 'f-re-2', label: 'Bedrooms / Bathrooms', name: 'beds_baths', type: 'text', isRequired: true },
              { id: 'f-re-3', label: 'Owner Phone Number', name: 'phone', type: 'phone', isRequired: true },
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-re-01',
        industryId: 'ind-realestate',
        industryName: 'Residential Real Estate',
        serviceId: 'srv-re-1',
        serviceName: 'Private Home Showing Tour',
        name: 'Exclusive Buyer Brokerage Agreement & Agency Disclosure',
        title: 'Exclusive Buyer Brokerage Agreement & Agency Disclosure',
        description: 'State real estate association buyer representation agreement, fiduciary duties, and commission terms.',
        creationMethod: 'custom',
        sourceFileName: 'Buyer_Brokerage_Agreement.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'RE-AGR-',
          sequenceDigits: 4,
          currentNumber: 4015,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Buyer Name', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">EXCLUSIVE BUYER BROKERAGE AGREEMENT</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Agency Disclosure & Agreement # {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Buyer <strong>{{client_name}}</strong> hereby appoints Broker as exclusive agent for property search and escrow representation.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      { id: 'srv-re-1', name: 'Private Home Showing Tour', durationMinutes: 45, priceEstimate: 0, description: 'Guided tour of up to 3 shortlisted properties.', isPopular: true },
    ],
    customFields: [
      { id: 'cf-re-1', name: 'Pre-Approved Budget Limit', key: 'budget_max', type: 'Number', entity: 'Client', isRequired: false },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },

  // 5. HVAC & AIR CONDITIONING
  {
    id: 'bundle-hvac',
    industryId: 'ind-hvac',
    industryName: 'HVAC & Air Conditioning Repair',
    categoryName: 'Home Services & Contracting',
    slug: 'hvac-air-conditioning',
    version: '1.1.0',
    status: 'published',
    recommendedTone: 'Responsive, Practical, Direct',
    badges: ['Emergency Dispatch', 'Field Service'],
    processTemplate: {
      id: 'proc-hvac-01',
      industryId: 'ind-hvac',
      name: 'HVAC Emergency Breakdown & Maintenance Dispatch',
      description: 'Handles no-heat / no-cool emergency calls, diagnostic fee transparency, and technician dispatch.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 1.0,
        voiceGender: 'male',
        voiceTone: 'Practical & Helpful',
        recordCalls: true,
        maxDurationMinutes: 5,
        wrapUpWindowSeconds: 30,
        retryRules: { enabled: true, maxAttempts: 3, delayMinutes: 30 },
        skipDayRules: { enabled: false, skipDaysOfWeek: [], skipHolidays: false },
        voicemailDetection: { enabled: true, action: 'hangup' },
      },
      stages: [
        {
          id: 'stg-hvac-1',
          stageOrder: 1,
          name: 'HVAC Emergency Triage & Dispatch',
          stageCode: 'STG_HVAC_DISPATCH',
          goal: 'Determine system type (heat pump, AC, gas furnace), symptoms, and dispatch slot.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Thank you for calling {{business_name}} Heating & Air. Are you experiencing a complete system breakdown, or calling for routine tune-up service?',
            callerPitch: 'Check if AC is blowing warm air or furnace is unlit. Explain our standard $89 diagnostic fee which is waived if repair is performed. Offer next available 2-hour arrival window.',
            targetObjective: 'Book technician dispatch arrival window',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-hvac-01',
        industryId: 'ind-hvac',
        title: 'AC / Furnace Service Request & Diagnostic Booking',
        category: 'booking',
        description: 'Online booking form for emergency repairs and seasonal tune-ups.',
        estimatedMinutes: 2,
        submitButtonText: 'Book Service Dispatch',
        successMessage: 'Your dispatch request is confirmed! A technician will text you 30 minutes before arrival.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-hvac-1',
            title: 'Service Address & Issue',
            fields: [
              { id: 'f-hvac-1', label: 'Service Address', name: 'address', type: 'text', isRequired: true },
              { id: 'f-hvac-2', label: 'Primary Issue', name: 'issue', type: 'select', isRequired: true, options: [
                { label: 'AC Blowing Warm Air', value: 'ac_warm' },
                { label: 'Furnace Not Heating', value: 'no_heat' },
                { label: 'Water Leaking from Unit', value: 'leak' },
                { label: 'Annual Seasonal Tune-up', value: 'tune_up' },
              ]},
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-hvac-01',
        industryId: 'ind-hvac',
        industryName: 'HVAC & Air Conditioning Repair',
        serviceId: 'srv-hvac-1',
        serviceName: 'Comprehensive AC System Diagnostic',
        name: 'HVAC Diagnostic Authorization & Maintenance Agreement',
        title: 'HVAC Diagnostic Authorization & Maintenance Agreement',
        description: 'Customer authorization for technician diagnostic inspection, parts warranty, and service fees.',
        creationMethod: 'import_doc',
        sourceFileName: 'HVAC_Diagnostic_Authorization.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'HVAC-AUTH-',
          sequenceDigits: 4,
          currentNumber: 6023,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Homeowner Name', fieldSource: 'system' },
          { placeholder: '{{service_address}}', mappedVariable: 'hospital_location', label: 'Service Address', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">HVAC DIAGNOSTIC AUTHORIZATION</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Dispatch Work Order Ref: {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Customer <strong>{{client_name}}</strong> authorizes technician on-site diagnostic at <strong>{{service_address}}</strong>.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      { id: 'srv-hvac-1', name: 'Comprehensive AC System Diagnostic', durationMinutes: 60, priceEstimate: 89, description: 'Electrical testing, refrigerant pressure check, and airflow evaluation.', isPopular: true },
    ],
    customFields: [
      { id: 'cf-hvac-1', name: 'HVAC Unit Brand & Age', key: 'unit_brand_age', type: 'Text', entity: 'Client', isRequired: false },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },

  // 6. AUTOMOBILE DEALERSHIP & SERVICE
  {
    id: 'bundle-auto',
    industryId: 'ind-auto',
    industryName: 'Automobile Dealership & Service',
    categoryName: 'Automotive & Transport',
    slug: 'auto-dealership-service',
    version: '1.0.0',
    status: 'published',
    recommendedTone: 'Polite, Efficient, Sales-Oriented',
    badges: ['Test Drives', 'Service Desk'],
    processTemplate: {
      id: 'proc-auto-01',
      industryId: 'ind-auto',
      name: 'Dealership Test Drive & Maintenance Booking Journey',
      description: 'Routes vehicle shoppers to sales reps and maintenance inquiries to service advisors.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 1.0,
        voiceGender: 'male',
        voiceTone: 'Energetic & Professional',
        recordCalls: true,
        maxDurationMinutes: 6,
        wrapUpWindowSeconds: 45,
        retryRules: { enabled: true, maxAttempts: 2, delayMinutes: 60 },
        skipDayRules: { enabled: true, skipDaysOfWeek: [0], skipHolidays: true },
        voicemailDetection: { enabled: true, action: 'leave_message', voicemailMessage: 'Hi, this is {{business_name}} following up on your vehicle inquiry. Call us back anytime!' },
      },
      stages: [
        {
          id: 'stg-auto-1',
          stageOrder: 1,
          name: 'Sales & Service Routing',
          stageCode: 'STG_AUTO_ROUTE',
          goal: 'Identify if caller wants to buy a vehicle, schedule maintenance, or order parts.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Thank you for calling {{business_name}} Motors. My name is David. Are you looking to schedule a test drive, check service department hours, or speak to financing?',
            callerPitch: 'If test drive, ask make/model and preferred weekend or evening slot. If service, ask current vehicle mileage and oil change / brake inspection requirement.',
            targetObjective: 'Book test drive or service appointment',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-auto-01',
        industryId: 'ind-auto',
        title: 'VIP Test Drive & Vehicle Trade-In Request Form',
        category: 'booking',
        description: 'Captures desired vehicle trim, trade-in VIN, and driver license info.',
        estimatedMinutes: 3,
        submitButtonText: 'Reserve My Test Drive',
        successMessage: 'Your test drive vehicle is reserved! Keys will be staged at the front desk.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-auto-1',
            title: 'Vehicle of Interest',
            fields: [
              { id: 'f-auto-1', label: 'Desired Model & Trim', name: 'model_trim', type: 'text', isRequired: true },
              { id: 'f-auto-2', label: 'Do you have a trade-in vehicle?', name: 'has_trade_in', type: 'radio', isRequired: true, options: [
                { label: 'Yes, I want to trade in my car', value: 'yes' },
                { label: 'No trade-in', value: 'no' },
              ]},
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-auto-01',
        industryId: 'ind-auto',
        industryName: 'Automobile Dealership & Service',
        serviceId: 'srv-auto-1',
        serviceName: 'Comprehensive Synthetic Oil Change & Multi-Point Inspection',
        name: 'Vehicle Repair Authorization & Insurance Billing Agreement',
        title: 'Vehicle Repair Authorization & Insurance Billing Agreement',
        description: 'Customer authorization for vehicle teardown, OEM parts ordering, and direct insurer billing.',
        creationMethod: 'custom',
        sourceFileName: 'Auto_Repair_Authorization.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'AUTO-REP-',
          sequenceDigits: 4,
          currentNumber: 7089,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Vehicle Owner', fieldSource: 'system' },
          { placeholder: '{{vehicle_vin}}', mappedVariable: 'policy_number', label: 'Vehicle VIN', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">VEHICLE REPAIR & SERVICE AUTHORIZATION</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Repair Order #: {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Customer <strong>{{client_name}}</strong> authorizes dealership service center to perform inspections on vehicle VIN <strong>{{vehicle_vin}}</strong>.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      { id: 'srv-auto-1', name: 'Comprehensive Synthetic Oil Change & Multi-Point Inspection', durationMinutes: 45, priceEstimate: 89, description: 'Full synthetic oil, OEM oil filter, fluid top-offs, and brake wear report.', isPopular: true },
    ],
    customFields: [
      { id: 'cf-auto-1', name: 'Current Vehicle VIN', key: 'vehicle_vin', type: 'Text', entity: 'Client', isRequired: false },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },

  // 7. IT & AI CONSULTING
  {
    id: 'bundle-tech',
    industryId: 'ind-tech',
    industryName: 'IT & Cloud / AI Consulting',
    categoryName: 'IT & Cloud Services',
    slug: 'it-cloud-consulting',
    version: '1.2.0',
    status: 'published',
    recommendedTone: 'Sharp, Technical, Strategic',
    badges: ['Enterprise Ready', 'Architecture'],
    processTemplate: {
      id: 'proc-tech-01',
      industryId: 'ind-tech',
      name: 'B2B Technical Discovery & Architecture Scoping Journey',
      description: 'Scoping enterprise cloud migrations, custom AI agent builds, and security posture audits.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'deepseek-v4-flash',
        voiceSpeed: 1.0,
        voiceGender: 'neutral',
        voiceTone: 'Strategic & Analytical',
        recordCalls: true,
        maxDurationMinutes: 10,
        wrapUpWindowSeconds: 60,
        retryRules: { enabled: true, maxAttempts: 3, delayMinutes: 60 },
        skipDayRules: { enabled: true, skipDaysOfWeek: [0, 6], skipHolidays: true },
        voicemailDetection: { enabled: true, action: 'leave_message', voicemailMessage: 'Hi, this is the solutions architecture team at {{business_name}}. We are following up on your project consultation request.' },
      },
      stages: [
        {
          id: 'stg-tech-1',
          stageOrder: 1,
          name: 'Technical Scoping & Budget Qualification',
          stageCode: 'STG_TECH_DISCOVERY',
          goal: 'Identify target tech stack (AWS/GCP/Azure), project timeline, and dedicated budget range.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Welcome to {{business_name}} Solutions. I am your AI architecture coordinator. Are you scoping a custom AI workflow, cloud migration, or software engineering project?',
            callerPitch: 'Ask about existing infrastructure, user scale, timeline (e.g. Q1 launch), and decision-maker roles. If budget > $25k, offer direct calendar slot with Principal Solutions Architect.',
            targetObjective: 'Qualify enterprise B2B lead and schedule architecture discovery session',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-tech-01',
        industryId: 'ind-tech',
        title: 'Project Scope, Architecture & Budget Discovery Form',
        category: 'quote',
        description: 'B2B technical questionnaire for engineering leaders and CTOs.',
        estimatedMinutes: 4,
        submitButtonText: 'Request Technical Discovery Call',
        successMessage: 'Discovery submitted! Our Principal Architect will review your technical specifications prior to our call.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-tech-1',
            title: 'Technical Requirements',
            fields: [
              { id: 'f-tech-1', label: 'Company / Project Name', name: 'company_name', type: 'text', isRequired: true },
              { id: 'f-tech-2', label: 'Estimated Engineering Budget Range', name: 'budget_range', type: 'select', isRequired: true, options: [
                { label: '$10,000 - $25,000 (MVP)', value: '10k_25k' },
                { label: '$25,000 - $75,000 (Scale)', value: '25k_75k' },
                { label: '$75,000+ (Enterprise System)', value: '75k_plus' },
              ]},
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-tech-01',
        industryId: 'ind-tech',
        industryName: 'IT & Cloud / AI Consulting',
        serviceId: 'srv-tech-1',
        serviceName: 'Cloud & AI Architecture Scoping Session (60m)',
        name: 'Master Services Agreement (MSA) & Cloud SLA Agreement',
        title: 'Master Services Agreement (MSA) & Cloud SLA Agreement',
        description: 'B2B enterprise terms of service, IP assignment, SOC2 confidentiality, and SLA guarantees.',
        creationMethod: 'custom',
        sourceFileName: 'Enterprise_MSA_Template.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'MSA-IT-',
          sequenceDigits: 4,
          currentNumber: 8012,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Client Organization', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">MASTER SERVICES AGREEMENT (MSA)</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Enterprise IT SOW & SLA Schedule # {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Client <strong>{{client_name}}</strong> agrees to scope and engineering terms outlined in Master Services Schedule.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      { id: 'srv-tech-1', name: 'Cloud & AI Architecture Scoping Session (60m)', durationMinutes: 60, priceEstimate: 0, description: '1-on-1 session with Principal Architect producing high-level system diagram and cost estimate.', isPopular: true },
    ],
    customFields: [
      { id: 'cf-tech-1', name: 'Primary Cloud Provider', key: 'cloud_provider', type: 'Select (Dropdown)', entity: 'Deal / Opportunity', options: ['AWS', 'Google Cloud', 'Microsoft Azure', 'On-Premise / Hybrid'], isRequired: false },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },

  // 8. EXECUTIVE COACHING & ADVISORY
  {
    id: 'bundle-coaching',
    industryId: 'ind-coaching',
    industryName: 'Executive Coaching & Leadership Advisory',
    categoryName: 'Coaching & Advisory',
    slug: 'executive-coaching',
    version: '1.0.0',
    status: 'published',
    recommendedTone: 'Inspirational, Confident, Insightful',
    badges: ['High-Ticket', 'C-Suite Ready'],
    processTemplate: {
      id: 'proc-coach-01',
      industryId: 'ind-coaching',
      name: 'Executive Leadership Strategy Intake & Discovery',
      description: 'High-touch screening for CEOs, founders, and VP-level executives seeking leadership coaching.',
      createdAt: '2026-01-05T10:00:00Z',
      updatedAt: '2026-02-12T14:00:00Z',
      globalSettings: {
        aiModel: 'gemini-2.5-flash',
        voiceSpeed: 0.95,
        voiceGender: 'female',
        voiceTone: 'Warm & Confident',
        recordCalls: true,
        maxDurationMinutes: 8,
        wrapUpWindowSeconds: 45,
        retryRules: { enabled: true, maxAttempts: 2, delayMinutes: 120 },
        skipDayRules: { enabled: true, skipDaysOfWeek: [0, 6], skipHolidays: true },
        voicemailDetection: { enabled: true, action: 'leave_message', voicemailMessage: 'Hello, this is the executive advisory desk at {{business_name}}. We look forward to connecting regarding your leadership coaching goals.' },
      },
      stages: [
        {
          id: 'stg-coach-1',
          stageOrder: 1,
          name: 'Executive Readiness Discovery',
          stageCode: 'STG_COACH_DISCOVERY',
          goal: 'Uncover primary leadership challenges (scaling team, board communications, burnout) and schedule 30m chemistry call.',
          basic: {
            callAction: 'ai_receives_calls',
            greetingPhrase: 'Welcome to {{business_name}} Executive Advisory. I am your leadership intake coordinator. Are you seeking 1-on-1 C-suite coaching or leadership development for your executive team?',
            callerPitch: 'Engage with elevated vocabulary. Ask what their primary focus area is for the next 90 days. Book a confidential 30-minute chemistry session with our Managing Partner.',
            targetObjective: 'Schedule complimentary executive chemistry session',
          },
          advanced: {
            overrideAiModel: false,
            overrideDuration: false,
            overrideRetryRules: false,
            overrideSkipDays: false,
            overrideVoicemail: false,
            recordCall: true,
          },
        },
      ],
    },
    formTemplates: [
      {
        id: 'form-coach-01',
        industryId: 'ind-coaching',
        title: 'Executive Leadership Profile & 90-Day Goals Intake',
        category: 'intake',
        description: 'Confidential pre-coaching survey assessing leadership challenges and personal OKRs.',
        estimatedMinutes: 3,
        submitButtonText: 'Submit Leadership Profile',
        successMessage: 'Thank you for submitting your leadership profile. Your advisor will review your goals prior to our strategy session.',
        autoCreateClient: true,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-10T11:00:00Z',
        sections: [
          {
            id: 'sec-coach-1',
            title: 'Executive Role & Company Stage',
            fields: [
              { id: 'f-coach-1', label: 'Executive Title', name: 'title', type: 'text', isRequired: true, placeholder: 'e.g. CEO, Founder, VP Engineering' },
              { id: 'f-coach-2', label: 'Company Headcount', name: 'headcount', type: 'select', isRequired: true, options: [
                { label: '1 - 20 (Seed / Early stage)', value: 'early' },
                { label: '20 - 100 (Series A/B Growth)', value: 'growth' },
                { label: '100+ (Scaleup / Enterprise)', value: 'enterprise' },
              ]},
            ],
          },
        ],
      },
    ],
    documentTemplates: [
      {
        id: 'doc-coach-01',
        industryId: 'ind-coaching',
        industryName: 'Executive Coaching & Leadership Advisory',
        serviceId: 'srv-coach-1',
        serviceName: 'Executive Strategy Chemistry Call (30m)',
        name: 'Executive Coaching Retainer Agreement & Bilateral NDA',
        title: 'Executive Coaching Retainer Agreement & Bilateral NDA',
        description: 'C-Suite 6-month leadership advisory terms, confidential board communications, and retainer schedule.',
        creationMethod: 'custom',
        sourceFileName: 'Executive_Coaching_Retainer_NDA.docx',
        autoNumbering: {
          enabled: true,
          prefix: 'RIA-AGR-',
          sequenceDigits: 4,
          currentNumber: 9005,
          suffix: '-2026',
        },
        extractedFields: [
          { placeholder: '{{client_name}}', mappedVariable: 'client_name', label: 'Executive Full Name', fieldSource: 'system' },
          { placeholder: '{{doc_number}}', mappedVariable: 'document_number', label: 'Document Number', fieldSource: 'system' },
        ],
        contentHtml: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">EXECUTIVE LEADERSHIP ADVISORY AGREEMENT</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Confidential Engagement Ref: {{doc_number}}</p>
  </div>
  <p style="font-size: 13px; color: #334155;">Engagement confirmation for executive mentorship and bilateral non-disclosure agreement with <strong>{{client_name}}</strong>.</p>
</div>`,
        createdAt: '2026-01-08T09:00:00Z',
        updatedAt: '2026-02-05T10:00:00Z',
      },
    ],
    defaultServices: [
      { id: 'srv-coach-1', name: 'Executive Strategy Chemistry Call (30m)', durationMinutes: 30, priceEstimate: 0, description: 'Confidential 30-minute alignment session to evaluate fit and define 6-month leadership outcomes.', isPopular: true },
    ],
    customFields: [
      { id: 'cf-coach-1', name: 'Executive LinkedIn URL', key: 'linkedin_url', type: 'Text', entity: 'Client', isRequired: false },
    ],
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-15T15:00:00Z',
  },
];

// Seed initial provisioned tenant workspaces
export const SEED_WORKSPACES: ProvisionedWorkspace[] = [
  {
    id: 'ws-apex-dental',
    orgName: 'Apex Family Dental Care',
    subdomain: 'apex-dental',
    industryName: 'Dental Practice',
    categoryName: 'Healthcare & Medical',
    bundleVersion: '1.4.0',
    status: 'active',
    provisionedAt: '2026-02-18T11:20:00Z',
    clonedProcessCount: 1,
    clonedStagesCount: 4,
    clonedFormsCount: 2,
    clonedDocsCount: 2,
    clonedServicesCount: 5,
    clonedCustomFieldsCount: 5,
    aiAssistantReady: true,
  },
  {
    id: 'ws-liberty-injury',
    orgName: 'Liberty Injury Lawyers LLP',
    subdomain: 'liberty-law',
    industryName: 'Personal Injury Law',
    categoryName: 'Legal & Professional',
    bundleVersion: '2.1.0',
    status: 'active',
    provisionedAt: '2026-02-19T09:45:00Z',
    clonedProcessCount: 1,
    clonedStagesCount: 2,
    clonedFormsCount: 1,
    clonedDocsCount: 1,
    clonedServicesCount: 1,
    clonedCustomFieldsCount: 2,
    aiAssistantReady: true,
  },
  {
    id: 'ws-premier-hvac',
    orgName: 'Premier Climate & Air Pro',
    subdomain: 'premier-hvac',
    industryName: 'HVAC & Air Conditioning Repair',
    categoryName: 'Home Services & Contracting',
    bundleVersion: '1.1.0',
    status: 'active',
    provisionedAt: '2026-02-20T14:10:00Z',
    clonedProcessCount: 1,
    clonedStagesCount: 1,
    clonedFormsCount: 1,
    clonedDocsCount: 1,
    clonedServicesCount: 1,
    clonedCustomFieldsCount: 1,
    aiAssistantReady: true,
  },
];

// ==========================================
// STORE STATE & LOCAL STORAGE HELPER
// ==========================================
export const HEALTHCARE_SPECIALTIES = [
  "Cardiologist",
  "Dentist",
  "Dermatologist",
  "Diagnostics",
  "Endocrinologist",
  "ENT Specialist",
  "Fertility/IVF Specialist",
  "Gastroenterologist",
  "General Physician",
  "General Surgery",
  "Gynecologist",
  "Nephrologist",
  "Neurosurgeon",
  "Nutrition",
  "Oncologist",
  "Ophthalmologist",
  "Orthopedic",
  "Pediatrician",
  "Pulmonologist (Lung)",
  "Rheumatologist",
  "Sexologist",
  "Therapist",
  "Psychiatrist",
  "Urologist",
];

const STORAGE_KEYS = {
  CATEGORIES: 'mantra_industry_categories_v2',
  BUNDLES: 'mantra_industry_bundles_v2',
  WORKSPACES: 'mantra_provisioned_workspaces_v2',
};

export class IndustryTemplateStore {
  private static instance: IndustryTemplateStore;
  private categories: IndustryCategory[] = SEED_CATEGORIES;
  private bundles: IndustryStarterBundle[] = SEED_BUNDLES;
  private workspaces: ProvisionedWorkspace[] = SEED_WORKSPACES;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Ensure all 24 healthcare specialties exist as bundles
    HEALTHCARE_SPECIALTIES.forEach((specName) => {
      const specId = `ind-${specName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const exists = this.bundles.some((b) => b.industryName === specName || b.industryId === specId);
      if (!exists) {
        this.bundles.push({
          id: `bundle-${specId}`,
          industryId: specId,
          industryName: specName,
          categoryName: 'Healthcare',
          slug: specId,
          version: '1.0.0',
          status: 'published',
          recommendedTone: 'Clinical, Reassuring, Professional',
          badges: ['HIPAA Ready', 'Turnkey Starter'],
          processTemplate: {
            id: `proc-${specId}-01`,
            industryId: specId,
            industryName: specName,
            name: `${specName} Patient Consultation & Intake Journey`,
            description: `Complete patient scheduling, clinical intake questionnaires, and appointment confirmation workflow for ${specName}.`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            globalSettings: {
              aiModel: 'gemini-2.5-flash',
              voiceSpeed: 1.0,
              voiceGender: 'female',
              voiceTone: 'Warm & Empathetic',
              recordCalls: true,
              maxDurationMinutes: 6,
              wrapUpWindowSeconds: 45,
              retryRules: { enabled: true, maxAttempts: 3, delayMinutes: 45 },
              skipDayRules: { enabled: true, skipDaysOfWeek: [0, 6], skipHolidays: true },
              voicemailDetection: { enabled: true, action: 'leave_message' },
            },
            stages: [
              {
                id: `stg-${specId}-1`,
                stageOrder: 1,
                name: 'New Patient Intake & Triage',
                stageCode: 'STG_INTAKE',
                goal: `Identify primary symptoms, triage urgency, and schedule ${specName} consultation.`,
                basic: {
                  callAction: 'ai_receives_calls',
                  greetingPhrase: `Thank you for calling {{business_name}}. My name is Sarah, your AI care coordinator for ${specName}. How may I help you today?`,
                  callerPitch: `Speak warmly and collect: Full Name, Phone, Primary Concern, Preferred Appointment Time.`,
                  targetObjective: 'Schedule consultation',
                },
                advanced: { recordCall: true },
              },
            ],
          },
          formTemplates: [
            {
              id: `form-${specId}-01`,
              categoryId: 'cat-healthcare',
              categoryName: 'Healthcare',
              industryId: specId,
              industryName: specName,
              title: `${specName} Patient Intake & Medical History Form`,
              category: 'intake',
              description: `Collect patient background, symptoms, and insurance details prior to ${specName} consultation.`,
              estimatedMinutes: 3,
              submitButtonText: 'Submit Registration',
              successMessage: 'Thank you for submitting your intake form!',
              autoCreateClient: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sections: [
                {
                  id: 'sec-1',
                  title: 'Patient Information',
                  fields: [
                    { id: 'f-1', label: 'Full Name', name: 'full_name', type: 'text', isRequired: true, fieldSource: 'standard' },
                    { id: 'f-2', label: 'Phone Number', name: 'phone', type: 'phone', isRequired: true, fieldSource: 'standard' },
                    { id: 'f-3', label: 'Email Address', name: 'email', type: 'email', isRequired: true, fieldSource: 'standard' },
                  ],
                },
              ],
            },
          ],
          documentTemplates: [
            {
              id: `doc-${specId}-01`,
              categoryId: 'cat-healthcare',
              categoryName: 'Healthcare',
              industryId: specId,
              industryName: specName,
              name: `${specName} Informed Consent & Clinical Authorization`,
              title: `${specName} Informed Consent & Clinical Authorization`,
              description: `Patient informed consent, clinical liability release, and treatment agreement for ${specName}.`,
              creationMethod: 'custom',
              autoNumbering: { enabled: true, prefix: 'MED-', sequenceDigits: 4, currentNumber: 1001, suffix: `-${new Date().getFullYear()}` },
              extractedFields: [
                { placeholder: '{{patient_name}}', mappedVariable: 'client_name', label: 'Patient Name' },
                { placeholder: '{{doctor_name}}', mappedVariable: 'primary_doctor', label: 'Clinician' },
              ],
              contentHtml: `<div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
                <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">${specName.toUpperCase()} INFORMED CONSENT</h2>
                <p style="font-size: 13px; color: #334155; line-height: 1.6;">I consent to diagnostic evaluation and treatment procedures conducted by {{doctor_name}}.</p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">Patient Signature: {{patient_name}}</div>
              </div>`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          defaultServices: [
            {
              id: `srv-${specId}-1`,
              name: `Comprehensive ${specName} Consultation`,
              durationMinutes: 45,
              priceEstimate: 175,
              description: `Comprehensive consultation and diagnostic exam with ${specName}.`,
              category: 'Consultation',
              isPopular: true,
            },
          ],
          customFields: [
            { id: `cf-${specId}-1`, name: 'Referring Physician', key: 'referring_physician', type: 'Text', entity: 'Client', isRequired: false },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const storedCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        const storedBundles = localStorage.getItem(STORAGE_KEYS.BUNDLES);
        const storedWorkspaces = localStorage.getItem(STORAGE_KEYS.WORKSPACES);

        if (storedCats) this.categories = JSON.parse(storedCats);
        if (storedBundles) this.bundles = JSON.parse(storedBundles);
        if (storedWorkspaces) this.workspaces = JSON.parse(storedWorkspaces);
      } catch (err) {
        console.error('Failed to load industry template store from localStorage', err);
      }
    }
  }

  public static getInstance(): IndustryTemplateStore {
    if (!IndustryTemplateStore.instance) {
      IndustryTemplateStore.instance = new IndustryTemplateStore();
    }
    return IndustryTemplateStore.instance;
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
        localStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(this.bundles));
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(this.workspaces));
      } catch (err) {
        console.error('Failed to persist industry template store to localStorage', err);
      }
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // Getters
  public getCategories(): IndustryCategory[] {
    return this.categories;
  }

  public getBundles(): IndustryStarterBundle[] {
    return this.bundles;
  }

  public getBundleById(id: string): IndustryStarterBundle | undefined {
    return this.bundles.find((b) => b.id === id || b.industryId === id);
  }

  public getWorkspaces(): ProvisionedWorkspace[] {
    return this.workspaces;
  }

  public getAllProcessTemplates(): ProcessTemplate[] {
    return this.bundles.map((b) => b.processTemplate);
  }

  public getAllFormTemplates(): FormTemplate[] {
    return this.bundles.flatMap((b) =>
      b.formTemplates.map((f) => ({
        ...f,
        categoryId: f.categoryId || b.id || 'cat-general',
        categoryName: f.categoryName || b.categoryName || 'General',
        industryName: f.industryName || b.industryName,
      }))
    );
  }

  public getAllDocumentTemplates(): DocumentTemplate[] {
    return this.bundles.flatMap((b) =>
      b.documentTemplates.map((d) => ({
        ...d,
        categoryId: d.categoryId || b.id || 'cat-general',
        categoryName: d.categoryName || b.categoryName || 'General',
        industryName: d.industryName || b.industryName,
      }))
    );
  }

  public getIndustriesByCategory(categoryIdOrName: string): { id: string; name: string }[] {
    if (!categoryIdOrName || categoryIdOrName === 'All') {
      return this.bundles.map((b) => ({ id: b.industryId, name: b.industryName }));
    }
    const cat = this.categories.find(
      (c) => c.id === categoryIdOrName || c.name === categoryIdOrName || c.slug === categoryIdOrName
    );
    const targetCatName = cat ? cat.name : categoryIdOrName;

    // Direct match for Healthcare
    if (
      targetCatName === 'Healthcare' ||
      targetCatName === 'Healthcare & Medical' ||
      categoryIdOrName === 'cat-healthcare'
    ) {
      return this.bundles
        .filter((b) => b.categoryName === 'Healthcare' || b.categoryName === 'Healthcare & Medical')
        .map((b) => ({ id: b.industryId, name: b.industryName }));
    }

    return this.bundles
      .filter((b) => b.categoryName === targetCatName || b.id === categoryIdOrName)
      .map((b) => ({ id: b.industryId, name: b.industryName }));
  }

  public getAllServices(): DefaultServiceTemplate[] {
    return this.bundles.flatMap((b) => b.defaultServices);
  }

  public getServicesByIndustry(industryId: string): DefaultServiceTemplate[] {
    const bundle = this.bundles.find((b) => b.industryId === industryId || b.id === industryId);
    return bundle ? bundle.defaultServices : [];
  }

  // Bundle Actions
  public saveBundle(bundle: IndustryStarterBundle) {
    const existingIndex = this.bundles.findIndex((b) => b.id === bundle.id);
    if (existingIndex >= 0) {
      const updated = [...this.bundles];
      updated[existingIndex] = { ...bundle, updatedAt: new Date().toISOString() };
      this.bundles = updated;
    } else {
      this.bundles = [
        { ...bundle, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ...this.bundles,
      ];
    }
    this.persist();
  }

  public deleteBundle(id: string) {
    this.bundles = this.bundles.filter((b) => b.id !== id);
    this.persist();
  }

  // Process Template Action
  public updateProcessTemplate(industryId: string, process: ProcessTemplate) {
    const bundle = this.bundles.find((b) => b.industryId === industryId || b.id === industryId);
    if (bundle) {
      bundle.processTemplate = { ...process, updatedAt: new Date().toISOString() };
      bundle.updatedAt = new Date().toISOString();
      this.persist();
    }
  }

  // Form Template Actions
  public saveFormTemplate(form: FormTemplate) {
    // Remove from existing location if it was moved
    this.bundles.forEach((b) => {
      b.formTemplates = b.formTemplates.filter((f) => f.id !== form.id);
    });

    const targetBundle = this.bundles.find(
      (b) => b.industryId === form.industryId || b.id === form.industryId
    ) || this.bundles[0];

    if (targetBundle) {
      targetBundle.formTemplates.unshift({
        ...form,
        industryId: targetBundle.industryId,
        industryName: targetBundle.industryName,
        updatedAt: new Date().toISOString(),
      });
    }

    this.persist();
  }

  public deleteFormTemplate(formId: string) {
    this.bundles.forEach((b) => {
      b.formTemplates = b.formTemplates.filter((f) => f.id !== formId);
    });
    this.persist();
  }

  // Document Template Actions
  public saveDocumentTemplate(doc: DocumentTemplate) {
    // Remove from existing location if it was moved
    this.bundles.forEach((b) => {
      b.documentTemplates = b.documentTemplates.filter((d) => d.id !== doc.id);
    });

    const targetBundle = this.bundles.find(
      (b) => b.industryId === doc.industryId || b.id === doc.industryId
    ) || this.bundles[0];

    if (targetBundle) {
      targetBundle.documentTemplates.unshift({
        ...doc,
        categoryId: doc.categoryId || targetBundle.id || 'cat-healthcare',
        categoryName: doc.categoryName || targetBundle.categoryName || 'Healthcare & Medical',
        industryId: targetBundle.industryId,
        industryName: targetBundle.industryName,
        updatedAt: new Date().toISOString(),
      });
    }

    this.persist();
  }

  public deleteDocumentTemplate(docId: string) {
    this.bundles.forEach((b) => {
      b.documentTemplates = b.documentTemplates.filter((d) => d.id !== docId);
    });
    this.persist();
  }

  // Atomic Onboarding Provisioning Simulation
  public async simulateProvisioning(
    orgName: string,
    subdomain: string,
    bundleId: string,
    onStepUpdate?: (step: ProvisioningStepLog) => void
  ): Promise<ProvisionedWorkspace> {
    const bundle = this.getBundleById(bundleId) || this.bundles[0];

    const steps = [
      { step: 1, title: 'Validating organization & subdomain registration', details: `Allocated subdomain: https://${subdomain}.mantraassist.ai` },
      { step: 2, title: 'Cloning telephony blueprint & stage parameters', details: `Cloned "${bundle.processTemplate.name}" with ${bundle.processTemplate.stages.length} linear stages (Basic + Advanced configs)` },
      { step: 3, title: 'Building dynamic web intake & booking forms', details: `Generated ${bundle.formTemplates.length} web form templates with mapped CRM fields` },
      { step: 4, title: 'Seeding AI Knowledge Base & indexing vector embeddings', details: `Loaded ${bundle.documentTemplates.length} verified clinical/operational documents & FAQ trigger triggers` },
      { step: 5, title: 'Configuring default service catalog & custom CRM fields', details: `Loaded ${bundle.defaultServices.length} standard services and ${bundle.customFields.length} custom entity fields` },
      { step: 6, title: 'Initializing AI Telephony Receptionist & marking ready', details: `Model ${bundle.processTemplate.globalSettings.aiModel} deployed. Ready for live test calls!` },
    ];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (onStepUpdate) {
        onStepUpdate({
          id: `step-${s.step}-${Date.now()}`,
          step: s.step,
          title: s.title,
          status: 'in_progress',
          details: s.details,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
      // Realistic simulation delay
      await new Promise((res) => setTimeout(res, 450));

      if (onStepUpdate) {
        onStepUpdate({
          id: `step-${s.step}-${Date.now()}`,
          step: s.step,
          title: s.title,
          status: 'completed',
          details: s.details,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    const newWorkspace: ProvisionedWorkspace = {
      id: `ws-${Date.now()}`,
      orgName: orgName.trim(),
      subdomain: subdomain.trim().toLowerCase(),
      industryName: bundle.industryName,
      categoryName: bundle.categoryName,
      bundleVersion: bundle.version,
      status: 'active',
      provisionedAt: new Date().toISOString(),
      clonedProcessCount: 1,
      clonedStagesCount: bundle.processTemplate.stages.length,
      clonedFormsCount: bundle.formTemplates.length,
      clonedDocsCount: bundle.documentTemplates.length,
      clonedServicesCount: bundle.defaultServices.length,
      clonedCustomFieldsCount: bundle.customFields.length,
      aiAssistantReady: true,
    };

    this.workspaces = [newWorkspace, ...this.workspaces];
    this.persist();
    return newWorkspace;
  }

  public resetToDefaults() {
    this.categories = SEED_CATEGORIES;
    this.bundles = SEED_BUNDLES;
    this.workspaces = SEED_WORKSPACES;
    this.persist();
  }
}

// React Hook
export function useIndustryTemplateStore() {
  const store = IndustryTemplateStore.getInstance();
  const [, setTick] = useState(0);

  useEffect(() => {
    return store.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, [store]);

  return {
    categories: store.getCategories(),
    bundles: store.getBundles(),
    workspaces: store.getWorkspaces(),
    allProcesses: store.getAllProcessTemplates(),
    allForms: store.getAllFormTemplates(),
    allDocs: store.getAllDocumentTemplates(),
    allServices: store.getAllServices(),
    getServicesByIndustry: (id: string) => store.getServicesByIndustry(id),
    getIndustriesByCategory: (catId: string) => store.getIndustriesByCategory(catId),
    getBundleById: (id: string) => store.getBundleById(id),
    saveBundle: (b: IndustryStarterBundle) => store.saveBundle(b),
    deleteBundle: (id: string) => store.deleteBundle(id),
    updateProcessTemplate: (indId: string, p: ProcessTemplate) => store.updateProcessTemplate(indId, p),
    saveFormTemplate: (f: FormTemplate) => store.saveFormTemplate(f),
    deleteFormTemplate: (id: string) => store.deleteFormTemplate(id),
    saveDocumentTemplate: (d: DocumentTemplate) => store.saveDocumentTemplate(d),
    deleteDocumentTemplate: (id: string) => store.deleteDocumentTemplate(id),
    simulateProvisioning: (org: string, sub: string, bId: string, cb?: (s: ProvisioningStepLog) => void) =>
      store.simulateProvisioning(org, sub, bId, cb),
    resetToDefaults: () => store.resetToDefaults(),
  };
}
