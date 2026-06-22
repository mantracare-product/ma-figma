export interface ClientFormSubmission {
  id: string;            // unique, e.g. "SUB-CL001-1"
  clientId: string;      // must match Client.id, e.g. "CL-001"
  formId: number;        // must match a Form.id from INITIAL_FORMS
  sentAt: string;        // date form was sent/shared with the client
  submittedAt: string;   // display date, same style as Client.lastContact, e.g. "Apr 8, 2024"
  status: "completed" | "pending" | "failed";
  fields: Record<string, string>; // keys MUST exactly match that Form's field `label`s — no extra, no missing
}

export const CLIENT_FORM_SUBMISSIONS: ClientFormSubmission[] = [
  // CL-001: Sarah Johnson (Contact Us x2)
  {
    id: "SUB-CL001-1",
    clientId: "CL-001",
    formId: 1,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-08",
    status: "completed",
    fields: {
      "Full Name": "Sarah Johnson",
      "Email": "sarah.j@email.com",
      "Phone": "+1 5551234567",
      "Message": "Hi, I have a quick question about the patient intake process."
    }
  },
  {
    id: "SUB-CL001-2",
    clientId: "CL-001",
    formId: 1,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Sarah Johnson",
      "Email": "sarah.j@email.com",
      "Phone": "+1 5551234567",
      "Message": "Following up on my previous query regarding the insurance document verification."
    }
  },
  {
    id: "SUB-CL001-3",
    clientId: "CL-001",
    formId: 5,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "Full Name": "Sarah Johnson",
      "Date of Birth": "09/14/1990",
      "Email": "sarah.j@email.com",
      "Phone": "+1 5551234567",
      "Primary Insurance": "Blue Shield",
      "Medical History": "No major issues.",
      "Consent to Treatment": "Yes"
    }
  },
  {
    id: "SUB-CL001-4",
    clientId: "CL-001",
    formId: 4,
    sentAt: "2024-04-09",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Name": "Sarah Johnson",
      "Email": "sarah.j@email.com"
    }
  },
  // CL-002: Michael Chen (no submissions)

  // CL-003: Emily Davis (Contact Us x1, Book a Demo x1)
  {
    id: "SUB-CL003-1",
    clientId: "CL-003",
    formId: 1,
    sentAt: "2024-04-06",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "Full Name": "Emily Davis",
      "Email": "emily.d@email.com",
      "Phone": "+1 5553456789",
      "Message": "How do I update my primary insurance information?"
    }
  },
  {
    id: "SUB-CL003-2",
    clientId: "CL-003",
    formId: 2,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "First Name": "Emily",
      "Last Name": "Davis",
      "Work Email": "emily.d@email.com",
      "Company": "Healthcare Plus",
      "Team Size": "11–50",
      "What are you looking for?": "Want a full demonstration of the billing flow integrations."
    }
  },
  // CL-004: Robert Wilson (single Contact Us x1)
  {
    id: "SUB-CL004-1",
    clientId: "CL-004",
    formId: 1,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-08",
    status: "completed",
    fields: {
      "Full Name": "Robert Wilson",
      "Email": "rwilson@email.com",
      "Phone": "+1 5554567890",
      "Message": "I want to schedule an appointment but couldn't select a slot."
    }
  },
  // CL-005: Jessica Brown (no submissions)

  // CL-006: David Martinez (Contact Us x3)
  {
    id: "SUB-CL006-1",
    clientId: "CL-006",
    formId: 1,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "Full Name": "David Martinez",
      "Email": "d.martinez@email.com",
      "Phone": "+1 5556789012",
      "Message": "Hello, do you accept out-of-network insurance plans?"
    }
  },
  {
    id: "SUB-CL006-2",
    clientId: "CL-006",
    formId: 1,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Full Name": "David Martinez",
      "Email": "d.martinez@email.com",
      "Phone": "+1 5556789012",
      "Message": "Just sent my document check details. Please confirm receipt."
    }
  },
  {
    id: "SUB-CL006-3",
    clientId: "CL-006",
    formId: 1,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-12",
    status: "completed",
    fields: {
      "Full Name": "David Martinez",
      "Email": "d.martinez@email.com",
      "Phone": "+1 5556789012",
      "Message": "Is there any update on my insurance approval status?"
    }
  },
  // CL-007: Lisa Anderson (Book a Demo x1, Newsletter Signup x1)
  {
    id: "SUB-CL007-1",
    clientId: "CL-007",
    formId: 2,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-08",
    status: "completed",
    fields: {
      "First Name": "Lisa",
      "Last Name": "Anderson",
      "Work Email": "l.anderson@email.com",
      "Company": "MediCare Group",
      "Team Size": "51–200",
      "What are you looking for?": "Demo for our finance and patient onboarding team."
    }
  },
  {
    id: "SUB-CL007-2",
    clientId: "CL-007",
    formId: 4,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Name": "Lisa Anderson",
      "Email": "l.anderson@email.com"
    }
  },
  // CL-008: James Taylor (no submissions)

  // CL-009: Amanda Clark (Book a Demo x1)
  {
    id: "SUB-CL009-1",
    clientId: "CL-009",
    formId: 2,
    sentAt: "2024-04-06",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "First Name": "Amanda",
      "Last Name": "Clark",
      "Work Email": "a.clark@email.com",
      "Company": "Amanda Clark Corp",
      "Team Size": "1–10",
      "What are you looking for?": "I want to see how the automated scheduling works."
    }
  },
  // CL-010: Christopher Lee (Contact Us x1)
  {
    id: "SUB-CL010-1",
    clientId: "CL-010",
    formId: 1,
    sentAt: "2024-04-03",
    submittedAt: "2024-04-07",
    status: "failed",
    fields: {
      "Full Name": "Christopher Lee",
      "Email": "c.lee@email.com",
      "Phone": "+1 5550123456",
      "Message": "I have an issue uploading my ID copy."
    }
  },
  // CL-011: Jennifer White (Newsletter Signup x2)
  {
    id: "SUB-CL011-1",
    clientId: "CL-011",
    formId: 4,
    sentAt: "2024-04-10",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Name": "Jennifer White",
      "Email": "j.white@email.com"
    }
  },
  {
    id: "SUB-CL011-2",
    clientId: "CL-011",
    formId: 4,
    sentAt: "2024-04-11",
    submittedAt: "2024-04-13",
    status: "completed",
    fields: {
      "Name": "Jennifer White",
      "Email": "j.white@email.com"
    }
  },
  // CL-012: Matthew Lewis (Contact Us x1, Patient Intake Form x1)
  {
    id: "SUB-CL012-1",
    clientId: "CL-012",
    formId: 1,
    sentAt: "2024-04-01",
    submittedAt: "2024-04-04",
    status: "completed",
    fields: {
      "Full Name": "Matthew Lewis",
      "Email": "m.lewis@email.com",
      "Phone": "+1 5552345679",
      "Message": "Inquiring about primary care services."
    }
  },
  {
    id: "SUB-CL012-2",
    clientId: "CL-012",
    formId: 5,
    sentAt: "2024-04-02",
    submittedAt: "2024-04-06",
    status: "completed",
    fields: {
      "Full Name": "Matthew Lewis",
      "Date of Birth": "09/18/1991",
      "Email": "m.lewis@email.com",
      "Phone": "+1 5552345679",
      "Primary Insurance": "Aetna",
      "Medical History": "Seasonal allergies.",
      "Consent to Treatment": "Yes"
    }
  },
  // CL-013: Priya Sharma (Patient Intake Form x1, Contact Us x1)
  {
    id: "SUB-CL013-1",
    clientId: "CL-013",
    formId: 5,
    sentAt: "2024-04-09",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Priya Sharma",
      "Date of Birth": "03/24/1987",
      "Email": "priya.sharma@email.com",
      "Phone": "+91 9820172818",
      "Primary Insurance": "Cigna",
      "Medical History": "None.",
      "Consent to Treatment": "Yes"
    }
  },
  {
    id: "SUB-CL013-2",
    clientId: "CL-013",
    formId: 1,
    sentAt: "2024-04-10",
    submittedAt: "2024-04-12",
    status: "completed",
    fields: {
      "Full Name": "Priya Sharma",
      "Email": "priya.sharma@email.com",
      "Phone": "+91 9820172818",
      "Message": "Can I reschedule my appointment for next Tuesday?"
    }
  },
  // CL-014: Rahul Patel (Newsletter Signup x1)
  {
    id: "SUB-CL014-1",
    clientId: "CL-014",
    formId: 4,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Name": "Rahul Patel",
      "Email": "rahul.p@email.com"
    }
  },
  // CL-015: Ananya Reddy (Patient Intake Form x1)
  {
    id: "SUB-CL015-1",
    clientId: "CL-015",
    formId: 5,
    sentAt: "2024-04-06",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Ananya Reddy",
      "Date of Birth": "11/05/1994",
      "Email": "ananya.r@email.com",
      "Phone": "+91 9123456789",
      "Primary Insurance": "Blue Cross Blue Shield",
      "Medical History": "No major conditions.",
      "Consent to Treatment": "Yes"
    }
  },
  // CL-016: Vikram Singh (Book a Demo x2)
  {
    id: "SUB-CL016-1",
    clientId: "CL-016",
    formId: 2,
    sentAt: "2024-04-06",
    submittedAt: "2024-04-07",
    status: "completed",
    fields: {
      "First Name": "Vikram",
      "Last Name": "Singh",
      "Work Email": "vikram.s@email.com",
      "Company": "Vikram Singh Corp",
      "Team Size": "11–50",
      "What are you looking for?": "Looking for automatic slot selection tools."
    }
  },
  {
    id: "SUB-CL016-2",
    clientId: "CL-016",
    formId: 2,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "First Name": "Vikram",
      "Last Name": "Singh",
      "Work Email": "vikram.s@email.com",
      "Company": "Vikram Singh Corp",
      "Team Size": "11–50",
      "What are you looking for?": "Requesting team-wide access for demo trial."
    }
  },
  // CL-017: Sneha Gupta (no submissions)

  // CL-018: Arjun Desai (Contact Us x1, Newsletter Signup x1)
  {
    id: "SUB-CL018-1",
    clientId: "CL-018",
    formId: 1,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Full Name": "Arjun Desai",
      "Email": "arjun.d@email.com",
      "Phone": "+91 9456789012",
      "Message": "Hi, I have a billing inquiry."
    }
  },
  {
    id: "SUB-CL018-2",
    clientId: "CL-018",
    formId: 4,
    sentAt: "2024-04-09",
    submittedAt: "2024-04-13",
    status: "completed",
    fields: {
      "Name": "Arjun Desai",
      "Email": "arjun.d@email.com"
    }
  },
  // CL-019: Kavya Iyer (Patient Intake Form x1)
  {
    id: "SUB-CL019-1",
    clientId: "CL-019",
    formId: 5,
    sentAt: "2024-04-10",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Full Name": "Kavya Iyer",
      "Date of Birth": "07/12/1990",
      "Email": "kavya.i@email.com",
      "Phone": "+91 9567890123",
      "Primary Insurance": "UnitedHealthcare",
      "Medical History": "Asthma.",
      "Consent to Treatment": "Yes"
    }
  },
  // CL-020: Rohan Kumar (Contact Us x1)
  {
    id: "SUB-CL020-1",
    clientId: "CL-020",
    formId: 1,
    sentAt: "2024-04-06",
    submittedAt: "2024-04-08",
    status: "completed",
    fields: {
      "Full Name": "Rohan Kumar",
      "Email": "rohan.k@email.com",
      "Phone": "+91 9678901234",
      "Message": "Hi, I'd like to sign up for your Patient Intake process."
    }
  },
  // CL-021: Deepika Nair (Contact Us x2)
  {
    id: "SUB-CL021-1",
    clientId: "CL-021",
    formId: 1,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Deepika Nair",
      "Email": "deepika.n@email.com",
      "Phone": "+91 9789012345",
      "Message": "Do you offer telehealth appointments?"
    }
  },
  {
    id: "SUB-CL021-2",
    clientId: "CL-021",
    formId: 1,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-12",
    status: "completed",
    fields: {
      "Full Name": "Deepika Nair",
      "Email": "deepika.n@email.com",
      "Phone": "+91 9789012345",
      "Message": "Following up on the telehealth query."
    }
  },
  // CL-022: Aditya Mehta (no submissions)

  // CL-023: Ahmed Al-Mansoori (Patient Intake Form x1, Book a Demo x1)
  {
    id: "SUB-CL023-1",
    clientId: "CL-023",
    formId: 5,
    sentAt: "2024-04-09",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Ahmed Al-Mansoori",
      "Date of Birth": "04/01/1985",
      "Email": "ahmed.am@email.com",
      "Phone": "+971 501234567",
      "Primary Insurance": "Oman Insurance",
      "Medical History": "Hypertension.",
      "Consent to Treatment": "Yes"
    }
  },
  {
    id: "SUB-CL023-2",
    clientId: "CL-023",
    formId: 2,
    sentAt: "2024-04-11",
    submittedAt: "2024-04-13",
    status: "completed",
    fields: {
      "First Name": "Ahmed",
      "Last Name": "Al-Mansoori",
      "Work Email": "ahmed.am@email.com",
      "Company": "Ahmed Al-Mansoori Corp",
      "Team Size": "11–50",
      "What are you looking for?": "Need to demo the multi-country patient intake options."
    }
  },
  // CL-024: Fatima Hassan (Book a Demo x1)
  {
    id: "SUB-CL024-1",
    clientId: "CL-024",
    formId: 2,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "First Name": "Fatima",
      "Last Name": "Hassan",
      "Work Email": "fatima.h@email.com",
      "Company": "Fatima Hassan Corp",
      "Team Size": "1–10",
      "What are you looking for?": "Looking for billing support tools."
    }
  },
  // CL-025: Omar Al-Rashid (Newsletter Signup x1)
  {
    id: "SUB-CL025-1",
    clientId: "CL-025",
    formId: 4,
    sentAt: "2024-04-07",
    submittedAt: "2024-04-11",
    status: "completed",
    fields: {
      "Name": "Omar Al-Rashid",
      "Email": "omar.ar@email.com"
    }
  },
  // CL-026: Layla Khalifa (no submissions)

  // CL-027: Youssef Said (Patient Intake Form x2)
  {
    id: "SUB-CL027-1",
    clientId: "CL-027",
    formId: 5,
    sentAt: "2024-04-09",
    submittedAt: "2024-04-10",
    status: "completed",
    fields: {
      "Full Name": "Youssef Said",
      "Date of Birth": "12/12/1982",
      "Email": "youssef.s@email.com",
      "Phone": "+971 505678901",
      "Primary Insurance": "AXA Gulf",
      "Medical History": "No significant history.",
      "Consent to Treatment": "Yes"
    }
  },
  {
    id: "SUB-CL027-2",
    clientId: "CL-027",
    formId: 5,
    sentAt: "2024-04-10",
    submittedAt: "2024-04-12",
    status: "completed",
    fields: {
      "Full Name": "Youssef Said",
      "Date of Birth": "12/12/1982",
      "Email": "youssef.s@email.com",
      "Phone": "+971 505678901",
      "Primary Insurance": "AXA Gulf",
      "Medical History": "No significant history. Updated info.",
      "Consent to Treatment": "Yes"
    }
  },
  // CL-028: Oliver Thompson (Contact Us x1, Book a Demo x1, Newsletter Signup x1)
  {
    id: "SUB-CL028-1",
    clientId: "CL-028",
    formId: 1,
    sentAt: "2024-04-02",
    submittedAt: "2024-04-05",
    status: "completed",
    fields: {
      "Full Name": "Oliver Thompson",
      "Email": "oliver.t@email.com",
      "Phone": "+44 7412345678",
      "Message": "Hi, do you support UK clients?"
    }
  },
  {
    id: "SUB-CL028-2",
    clientId: "CL-028",
    formId: 2,
    sentAt: "2024-04-03",
    submittedAt: "2024-04-07",
    status: "completed",
    fields: {
      "First Name": "Oliver",
      "Last Name": "Thompson",
      "Work Email": "oliver.t@email.com",
      "Company": "Oliver Thompson Corp",
      "Team Size": "1–10",
      "What are you looking for?": "Demo for our clinic onboarding flow."
    }
  },
  {
    id: "SUB-CL028-3",
    clientId: "CL-028",
    formId: 4,
    sentAt: "2024-04-08",
    submittedAt: "2024-04-09",
    status: "completed",
    fields: {
      "Name": "Oliver Thompson",
      "Email": "oliver.t@email.com"
    }
  },
  // CL-029: Charlotte Evans (Patient Intake Form x1)
  {
    id: "SUB-CL029-1",
    clientId: "CL-029",
    formId: 5,
    sentAt: "2024-04-11",
    submittedAt: "2024-04-13",
    status: "completed",
    fields: {
      "Full Name": "Charlotte Evans",
      "Date of Birth": "06/05/1993",
      "Email": "charlotte.e@email.com",
      "Phone": "+44 7423456789",
      "Primary Insurance": "Bupa",
      "Medical History": "None.",
      "Consent to Treatment": "Yes"
    }
  },
  // CL-030: William Davies (Contact Us x1)
  {
    id: "SUB-CL030-1",
    clientId: "CL-030",
    formId: 1,
    sentAt: "2024-03-15",
    submittedAt: "2024-03-18",
    status: "pending",
    fields: {
      "Full Name": "William Davies",
      "Email": "william.d@email.com",
      "Phone": "+44 7434567890",
      "Message": "General inquiry about billing support."
    }
  },
  // Submissions matching DUMMY_SUBMISSIONS in WebForms
  {
    id: "SUB-CL001-5",
    clientId: "CL-001",
    formId: 1,
    sentAt: "2026-06-10",
    submittedAt: "Jun 12, 2026",
    status: "completed",
    fields: { "Full Name": "Sarah Johnson", "Email": "sarah.j@email.com", "Phone": "+1 5551234567", "Message": "I'd like to learn more about your AI features." }
  },
  {
    id: "SUB-CL002-1",
    clientId: "CL-002",
    formId: 2,
    sentAt: "2026-06-09",
    submittedAt: "Jun 11, 2026",
    status: "pending",
    fields: { "First Name": "Michael", "Last Name": "Chen", "Work Email": "mchen@email.com", "Company": "Innovate Solutions", "Team Size": "51–100", "What are you looking for?": "We need an AI receptionist for our support team." }
  },
  {
    id: "SUB-CL003-3",
    clientId: "CL-003",
    formId: 4,
    sentAt: "2026-06-10",
    submittedAt: "Jun 11, 2026",
    status: "completed",
    fields: { "Name": "Emily Davis", "Email": "emily.d@email.com" }
  },
  {
    id: "SUB-CL004-2",
    clientId: "CL-004",
    formId: 1,
    sentAt: "2026-06-08",
    submittedAt: "Jun 10, 2026",
    status: "pending",
    fields: { "Full Name": "Robert Wilson", "Email": "rwilson@email.com", "Phone": "+1 5554567890", "Message": "Can you integrate with HubSpot?" }
  },
  {
    id: "SUB-CL005-1",
    clientId: "CL-005",
    formId: 2,
    sentAt: "2026-06-07",
    submittedAt: "Jun 9, 2026",
    status: "completed",
    fields: { "First Name": "Jessica", "Last Name": "Brown", "Work Email": "jbrown@email.com", "Company": "Jessica Brown Corp", "Team Size": "1–10", "What are you looking for?": "Interested in enterprise pricing." }
  },
  {
    id: "SUB-CL006-4",
    clientId: "CL-006",
    formId: 4,
    sentAt: "2026-06-06",
    submittedAt: "Jun 8, 2026",
    status: "pending",
    fields: { "Name": "David Martinez", "Email": "d.martinez@email.com" }
  },
  {
    id: "SUB-CL007-3",
    clientId: "CL-007",
    formId: 1,
    sentAt: "2026-06-05",
    submittedAt: "Jun 7, 2026",
    status: "failed",
    fields: { "Full Name": "Lisa Anderson", "Email": "l.anderson@email.com", "Phone": "+1 5557890123", "Message": "Looking for a demo of your CRM tools." }
  },
  {
    id: "SUB-CL008-1",
    clientId: "CL-008",
    formId: 2,
    sentAt: "2026-06-03",
    submittedAt: "Jun 5, 2026",
    status: "pending",
    fields: { "First Name": "James", "Last Name": "Taylor", "Work Email": "jtaylor@email.com", "Company": "James Taylor Corp", "Team Size": "1–10", "What are you looking for?": "Small agency needing AI scheduling." }
  }
];
