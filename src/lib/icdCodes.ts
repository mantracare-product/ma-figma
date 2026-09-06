export interface ICDCodeItem {
  code: string;
  shortDescription: string;
  longDescription?: string;
  category: "Mental Health & Therapy" | "Internal Medicine" | "Ophthalmology" | "Musculoskeletal & Ortho" | "Preventive & Routine" | "Neurology & Other";
}

export const COMMON_ICD_CODES: ICDCodeItem[] = [
  // Mental Health & Therapy
  {
    code: "F41.1",
    shortDescription: "Generalized anxiety disorder",
    longDescription: "Generalized anxiety disorder characterized by persistent and excessive worry about various things.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F32.9",
    shortDescription: "Major depressive disorder, single episode, unspecified",
    longDescription: "Major depressive disorder, single episode, unspecified severity.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F33.1",
    shortDescription: "Major depressive disorder, recurrent, moderate",
    longDescription: "Recurrent depressive disorder, currently in moderate episode without psychotic symptoms.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F43.10",
    shortDescription: "Post-traumatic stress disorder, unspecified",
    longDescription: "PTSD resulting from exposure to an identifiable traumatic stressor.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F43.20",
    shortDescription: "Adjustment disorder, unspecified",
    longDescription: "Maladaptive reaction to an identifiable psychosocial stressor.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F41.9",
    shortDescription: "Anxiety disorder, unspecified",
    longDescription: "Unspecified anxiety state.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F90.9",
    shortDescription: "ADHD, unspecified type",
    longDescription: "Attention-deficit hyperactivity disorder, unspecified presentation.",
    category: "Mental Health & Therapy",
  },
  {
    code: "F10.20",
    shortDescription: "Alcohol use disorder, moderate or severe, uncomplicated",
    longDescription: "Alcohol dependence without physical or mental complications.",
    category: "Mental Health & Therapy",
  },

  // Ophthalmology
  {
    code: "H25.11",
    shortDescription: "Age-related nuclear cataract, right eye",
    longDescription: "Nuclear sclerosis senile cataract affecting the right eye.",
    category: "Ophthalmology",
  },
  {
    code: "H25.12",
    shortDescription: "Age-related nuclear cataract, left eye",
    longDescription: "Nuclear sclerosis senile cataract affecting the left eye.",
    category: "Ophthalmology",
  },
  {
    code: "H25.13",
    shortDescription: "Age-related nuclear cataract, bilateral",
    longDescription: "Bilateral nuclear senile cataract.",
    category: "Ophthalmology",
  },
  {
    code: "H52.13",
    shortDescription: "Myopia, bilateral",
    longDescription: "Nearsightedness affecting both eyes.",
    category: "Ophthalmology",
  },
  {
    code: "H40.1130",
    shortDescription: "Primary open-angle glaucoma, bilateral, unspecified stage",
    longDescription: "Open-angle glaucoma bilateral.",
    category: "Ophthalmology",
  },
  {
    code: "H04.123",
    shortDescription: "Dry eye syndrome of bilateral lacrimal glands",
    longDescription: "Dry eye disease / keratoconjunctivitis sicca in both eyes.",
    category: "Ophthalmology",
  },

  // Musculoskeletal & Ortho
  {
    code: "M17.0",
    shortDescription: "Bilateral primary osteoarthritis of knee",
    longDescription: "Primary bilateral gonarthrosis / osteoarthritis of knee joints.",
    category: "Musculoskeletal & Ortho",
  },
  {
    code: "M17.11",
    shortDescription: "Unilateral primary osteoarthritis, right knee",
    longDescription: "Primary osteoarthritis localized to the right knee joint.",
    category: "Musculoskeletal & Ortho",
  },
  {
    code: "M54.50",
    shortDescription: "Low back pain, unspecified",
    longDescription: "Lumbago or acute/chronic low back strain, unspecified.",
    category: "Musculoskeletal & Ortho",
  },
  {
    code: "M54.2",
    shortDescription: "Cervicalgia (Neck pain)",
    longDescription: "Pain in cervical spine region.",
    category: "Musculoskeletal & Ortho",
  },
  {
    code: "M75.101",
    shortDescription: "Unspecified rotator cuff tear or rupture of right shoulder",
    longDescription: "Rotator cuff syndrome / tear of right shoulder.",
    category: "Musculoskeletal & Ortho",
  },
  {
    code: "M25.561",
    shortDescription: "Pain in right knee",
    longDescription: "Right knee arthralgia.",
    category: "Musculoskeletal & Ortho",
  },

  // Internal Medicine & Respiratory
  {
    code: "J20.9",
    shortDescription: "Acute bronchitis, unspecified",
    longDescription: "Acute bronchitis not specified as viral, bacterial, or chemical.",
    category: "Internal Medicine",
  },
  {
    code: "I10",
    shortDescription: "Essential (primary) hypertension",
    longDescription: "High blood pressure without established secondary etiology.",
    category: "Internal Medicine",
  },
  {
    code: "E11.9",
    shortDescription: "Type 2 diabetes mellitus without complications",
    longDescription: "Non-insulin dependent adult-onset diabetes mellitus without specified complications.",
    category: "Internal Medicine",
  },
  {
    code: "J45.909",
    shortDescription: "Unspecified asthma, uncomplicated",
    longDescription: "Bronchial asthma without acute exacerbation.",
    category: "Internal Medicine",
  },
  {
    code: "K21.9",
    shortDescription: "Gastro-esophageal reflux disease without esophagitis",
    longDescription: "GERD / acid reflux without erosive mucosal changes.",
    category: "Internal Medicine",
  },
  {
    code: "R53.83",
    shortDescription: "Other chronic fatigue",
    longDescription: "Chronic malaise and lethargy.",
    category: "Internal Medicine",
  },

  // Preventive & Routine
  {
    code: "Z00.00",
    shortDescription: "General adult medical examination without abnormal findings",
    longDescription: "Routine annual adult physical exam without abnormal findings.",
    category: "Preventive & Routine",
  },
  {
    code: "Z01.00",
    shortDescription: "Encounter for examination of eyes and vision without abnormal findings",
    longDescription: "Routine annual comprehensive eye examination.",
    category: "Preventive & Routine",
  },
  {
    code: "Z71.3",
    shortDescription: "Dietary surveillance and counseling",
    longDescription: "Dietary consultation and education session.",
    category: "Preventive & Routine",
  },
  {
    code: "Z02.89",
    shortDescription: "Encounter for other administrative examinations",
    longDescription: "Pre-employment or administrative physical examination.",
    category: "Preventive & Routine",
  },
];

export function searchICDCodes(query: string, maxResults = 25): ICDCodeItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return COMMON_ICD_CODES.slice(0, maxResults);
  }

  const normalized = q.replace(/[\.\s\-]/g, "");

  return COMMON_ICD_CODES.filter((item) => {
    const codeClean = item.code.toLowerCase().replace(/[\.\s\-]/g, "");
    const shortDesc = item.shortDescription.toLowerCase();
    const longDesc = (item.longDescription || "").toLowerCase();
    const category = item.category.toLowerCase();

    return (
      codeClean.includes(normalized) ||
      item.code.toLowerCase().includes(q) ||
      shortDesc.includes(q) ||
      longDesc.includes(q) ||
      category.includes(q)
    );
  }).slice(0, maxResults);
}

export function getICDCodeItem(code: string): ICDCodeItem | undefined {
  const norm = code.trim().toUpperCase();
  return COMMON_ICD_CODES.find((i) => i.code.toUpperCase() === norm);
}
