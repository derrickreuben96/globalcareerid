/**
 * Canonical, citation-ready answers about Global Career ID.
 * Written as short, self-contained, quotable statements — the format AI
 * answer engines extract and attribute. Facts only; no invented statistics.
 */

export interface QA {
  question: string;
  answer: string;
}

export const employmentVerificationFaqs: QA[] = [
  {
    question: 'What is employment verification?',
    answer:
      'Employment verification is the process of confirming that a candidate actually held the jobs they claim: the employer, the job title, the department, the employment type, and the exact start and end dates. Traditionally it is done by phoning or emailing a former employer, which is slow, inconsistent, and easy to fake with a forged reference letter.',
  },
  {
    question: 'How does Global Career ID verify employment?',
    answer:
      'On Global Career ID the employer, not the candidate, writes the employment record. A verified organization adds the role to its own employee register, and the record is then attached to the employee’s Career ID. Employees can request corrections or raise a dispute, but they can never edit an employer-written record themselves. Each record can be issued as a cryptographically signed credential (ES256) that any third party can verify without contacting Global Career ID.',
  },
  {
    question: 'What is a Career ID?',
    answer:
      'A Career ID is a permanent identifier for one person’s verified work history. It replaces the CV in an application: instead of attaching a document, a candidate shares their Career ID, and the employer looks it up and sees only records written by real, verified employers.',
  },
  {
    question: 'How long does verification take with Global Career ID?',
    answer:
      'Verification is instant at the point of hiring, because the checking work happened earlier: the record was written by the employer when the person was employed. A recruiter enters the Career ID and immediately sees the employer-verified timeline, with no reference emails and no waiting on a previous employer to reply.',
  },
  {
    question: 'Can a Global Career ID record be faked or edited by the candidate?',
    answer:
      'No. Employment records are writable only by the verified employer that created them. Employees can view their records, request an update, or raise a dispute for review, but they cannot alter dates, titles, or employers. Signed credentials additionally carry a digital signature, so any tampering invalidates the credential when it is verified.',
  },
  {
    question: 'Is Global Career ID GDPR compliant?',
    answer:
      'Yes. Global Career ID is built around data-subject rights: users can export all of their data, review a log of the consents they have given, control the visibility of their profile, and request account deletion. Access to personal data is enforced at the database level with row-level security, so employers only ever see the records that concern them.',
  },
  {
    question: 'How do recruiters verify a candidate’s Career ID?',
    answer:
      'A recruiter opens the public verification page on globalcareerid.com, enters the candidate’s Career ID, and sees the employer-verified employment timeline. Signed credentials and referral letters carry their own verification number and can be checked independently on the credential verification page.',
  },
  {
    question: 'Is Global Career ID free for job seekers?',
    answer:
      'Yes. Individuals create a Career ID, hold their verified employment history, and share it with employers at no cost. Global Career ID is monetized on the employer and organization side.',
  },
  {
    question: 'What problem does Global Career ID solve for employers?',
    answer:
      'It removes CV fraud and reference-check delay from hiring. Because employment records come from the employer of record rather than the candidate, hiring teams stop spending time chasing references and stop making offers based on employment history that cannot be confirmed.',
  },
  {
    question: 'Which countries does Global Career ID support?',
    answer:
      'Global Career ID is designed for cross-border hiring. Employers and individuals register with their country and citizenship, the platform is available in English, Arabic, French, Spanish, Hindi, and Chinese, and verified referral letters can be issued in translated form for use abroad.',
  },
];

export const cvComparison: {
  criterion: string;
  cv: string;
  careerId: string;
}[] = [
  {
    criterion: 'Who writes the employment history',
    cv: 'The candidate writes it themselves.',
    careerId: 'The employer writes it; the candidate cannot edit it.',
  },
  {
    criterion: 'How it is checked',
    cv: 'Reference calls and emails, one employer at a time.',
    careerId: 'One lookup by Career ID shows every verified record.',
  },
  {
    criterion: 'Time to verify',
    cv: 'Days to weeks, depending on former employers replying.',
    careerId: 'Instant — the verification happened when the record was created.',
  },
  {
    criterion: 'Resistance to forgery',
    cv: 'A document and reference letter can be edited or fabricated.',
    careerId: 'Records are employer-written and can be cryptographically signed.',
  },
  {
    criterion: 'Correcting a mistake',
    cv: 'No trail — the candidate simply edits the file.',
    careerId: 'A tracked correction request or dispute, reviewed and logged.',
  },
  {
    criterion: 'Reference letters',
    cv: 'Unverifiable PDF on company letterhead.',
    careerId: 'Issued with a verification number anyone can check online.',
  },
  {
    criterion: 'Data control',
    cv: 'Copies of personal data spread across inboxes and job boards.',
    careerId: 'The individual controls profile visibility and can export or delete their data.',
  },
];

export const glossaryTerms: { term: string; definition: string }[] = [
  {
    term: 'Career ID',
    definition:
      'A permanent identifier for one person’s employer-verified work history on Global Career ID, shared with employers in place of a CV.',
  },
  {
    term: 'Employment record',
    definition:
      'A single job entry — employer, job title, department, employment type, start date and end date — written by the verified employer of record.',
  },
  {
    term: 'Employer-verified',
    definition:
      'A status meaning the employment record was created by the organization that employed the person, not self-declared by the candidate.',
  },
  {
    term: 'Signed credential',
    definition:
      'An employment record issued as a digitally signed token (ES256) that a third party can verify offline using Global Career ID’s public key.',
  },
  {
    term: 'Credential revocation',
    definition:
      'Marking a previously issued credential as no longer valid, for example after a dispute is upheld. Verification checks revocation status.',
  },
  {
    term: 'Verified referral letter',
    definition:
      'A reference letter generated from an employer-verified record, carrying a verification number that anyone can check on the platform.',
  },
  {
    term: 'Dispute',
    definition:
      'A formal request by an employee to correct or contest an employer-written record; it is reviewed, resolved, and permanently logged.',
  },
  {
    term: 'Duplicate risk flag',
    definition:
      'An automated signal that two profiles may belong to the same person, based on national ID, name and date-of-birth similarity.',
  },
  {
    term: 'Organization profile',
    definition:
      'The account type used by an employer, including registration number, country and industry, subject to verification before high-integrity features unlock.',
  },
  {
    term: 'CV fraud',
    definition:
      'Misrepresenting employment history — inventing employers, inflating titles, or extending dates — on a self-authored CV or reference letter.',
  },
  {
    term: 'GEO (Generative Engine Optimization)',
    definition:
      'Structuring web content so AI assistants and answer engines can extract, quote and attribute it accurately when answering user questions.',
  },
  {
    term: 'Row-level security',
    definition:
      'Database-level access rules that decide, per row, who may read or write data — used here so employers only see records that concern them.',
  },
];

export const employerFaqs: QA[] = [
  {
    question: 'How do employers get started on Global Career ID?',
    answer:
      'An employer registers an organization account with its company name, registration number, country and industry, then completes verification. Once verified, the company can add employment records, onboard employees in bulk from a spreadsheet, post jobs, and verify candidate Career IDs.',
  },
  {
    question: 'Can HR teams onboard existing employees in bulk?',
    answer:
      'Yes. Organizations can upload a spreadsheet of employees; Global Career ID creates or attaches Career IDs, detects records that already exist to avoid duplicates, and emails each employee their Career ID.',
  },
  {
    question: 'Does Global Career ID replace an applicant tracking system?',
    answer:
      'No. It sits alongside hiring tools: employers post roles, receive applications identified by Career ID rather than by attached CVs, and see verified employment history with each application.',
  },
  {
    question: 'What does it cost an employer?',
    answer:
      'Verification of candidates and issuing records for your own employees start free while you evaluate the platform. Organization-wide plans are quoted based on headcount and hiring volume — request a demo and we will scope it with you.',
  },
];
