/**
 * Single source of truth for pricing shown on the pricing page and used by the
 * hiring cost calculator, so the two can never disagree.
 *
 * NOTE: these figures are the published list prices. Update them here only.
 */
export const CURRENCY = 'USD';

/** List price for a single Career ID verification on pay-as-you-go. */
export const PRICE_PER_VERIFICATION = 12;

export interface PricingTier {
  name: string;
  audience: string;
  price: string;
  priceNote?: string;
  monthlyPrice: number | null;
  includedVerifications: number | null;
  features: string[];
  cta: { label: string; to: string };
  highlight: boolean;
}

export const TIERS: PricingTier[] = [
  {
    name: 'Individual',
    audience: 'Job seekers and employees',
    price: 'Free',
    priceNote: 'Always free — candidates never pay to be verified',
    monthlyPrice: 0,
    includedVerifications: null,
    features: [
      'Your permanent Career ID',
      'Employer-verified employment timeline',
      'Share your profile or a signed credential',
      'Apply to verified jobs with one click',
      'Data export, consent log and account deletion',
    ],
    cta: { label: 'Create your Career ID', to: '/register' },
    highlight: false,
  },
  {
    name: 'Pay as you go',
    audience: 'Occasional hiring',
    price: `$${PRICE_PER_VERIFICATION}`,
    priceNote: 'per Career ID verification, no monthly fee',
    monthlyPrice: 0,
    includedVerifications: 0,
    features: [
      'Verified organization profile',
      'Verify any candidate Career ID',
      'Record your own employees’ roles',
      'Post jobs and receive Career ID applications',
      'Verified referral letters with verification numbers',
    ],
    cta: { label: 'Start free', to: '/register' },
    highlight: false,
  },
  {
    name: 'Growth',
    audience: 'Teams hiring every month',
    price: '$299',
    priceNote: 'per month, includes 40 verifications',
    monthlyPrice: 299,
    includedVerifications: 40,
    features: [
      'Everything in Pay as you go',
      '40 verifications included each month',
      `Additional verifications at $${PRICE_PER_VERIFICATION} each`,
      'AI application ranking and screening quotas',
      'Audit logs and dispute workflow',
    ],
    cta: { label: 'Start free trial', to: '/register' },
    highlight: true,
  },
  {
    name: 'Scale',
    audience: 'High-volume, multi-country hiring',
    price: 'Quoted',
    priceNote: 'scoped to headcount, hiring volume and countries',
    monthlyPrice: null,
    includedVerifications: null,
    features: [
      'Unlimited verifications on a committed plan',
      'Bulk employee onboarding from spreadsheets',
      'Cryptographically signed credentials at scale',
      'Multi-country and multi-language support',
      'Onboarding support for your HR team',
    ],
    cta: { label: 'Request a demo', to: '/for-employers/demo' },
    highlight: false,
  },
];

/**
 * Cheapest published plan cost for a given number of verifications per month.
 * Used by the calculator so the comparison always matches the pricing page.
 */
export function bestMonthlyPlanCost(verificationsPerMonth: number): {
  cost: number;
  planName: string;
} {
  const payg = verificationsPerMonth * PRICE_PER_VERIFICATION;
  const growth =
    299 + Math.max(0, verificationsPerMonth - 40) * PRICE_PER_VERIFICATION;
  return payg <= growth
    ? { cost: payg, planName: 'Pay as you go' }
    : { cost: growth, planName: 'Growth' };
}
