/**
 * Structured-data builders used by GEO (Generative Engine Optimization) pages.
 * Keeping them in one place guarantees every AI/answer-engine surface receives
 * the same canonical facts about Global Career ID.
 */

export const SITE_URL = 'https://globalcareerid.com';
export const ORG_NAME = 'Global Career ID';

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: ORG_NAME,
  url: SITE_URL,
  description:
    'Global Career ID issues employer-verified employment records so hiring teams can confirm a candidate’s work history instantly instead of trusting an unverifiable CV.',
  sameAs: [
    'https://www.linkedin.com/company/global-career-id/',
    'https://www.facebook.com/profile.php?id=61587225303471',
  ],
};

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: ORG_NAME,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Employment verification and HR technology',
  operatingSystem: 'Web, iOS, Android',
  url: SITE_URL,
  description:
    'Employment verification platform where employers write and cryptographically sign employee work records, and candidates share one verifiable Career ID instead of a CV.',
  featureList: [
    'Employer-written, tamper-evident employment records',
    'Cryptographically signed credentials (ES256) verifiable by any third party',
    'Instant Career ID lookup for recruiters',
    'Bulk employee onboarding for HR teams',
    'Verified referral letters with verification numbers',
    'Dispute and correction workflow for employees',
    'GDPR data export, consent logs and account deletion',
  ],
};

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${opts.path}` },
    author: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
    dateModified: opts.dateModified ?? new Date().toISOString().slice(0, 10),
  };
}

export function howToJsonLd(opts: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function definedTermSetJsonLd(
  name: string,
  path: string,
  terms: { term: string; definition: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name,
    url: `${SITE_URL}${path}`,
    hasDefinedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
      inDefinedTermSet: `${SITE_URL}${path}`,
    })),
  };
}
