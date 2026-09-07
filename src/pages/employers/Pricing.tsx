import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  SITE_URL,
} from '@/lib/structuredData';

const plans = [
  {
    name: 'Individual',
    price: 'Free',
    audience: 'Job seekers and employees',
    features: [
      'Your permanent Career ID',
      'Employer-verified employment timeline',
      'Share your profile or a signed credential',
      'Request corrections and raise disputes',
      'Data export, consent log and account deletion',
    ],
    cta: { label: 'Create your Career ID', to: '/register' },
    highlight: false,
  },
  {
    name: 'Organization — Starter',
    price: 'Free while you evaluate',
    audience: 'Teams trying verified hiring',
    features: [
      'Verified organization profile',
      'Record your own employees’ roles',
      'Verify candidate Career IDs',
      'Post jobs and receive Career ID applications',
      'Verified referral letters with verification numbers',
    ],
    cta: { label: 'Start free', to: '/register' },
    highlight: true,
  },
  {
    name: 'Organization — Scale',
    price: 'Quoted',
    audience: 'High-volume and multi-country hiring',
    features: [
      'Bulk employee onboarding from spreadsheets',
      'Cryptographically signed credentials at scale',
      'Audit logs and dispute workflow oversight',
      'Multi-country and multi-language support',
      'Onboarding support for your HR team',
    ],
    cta: { label: 'Request a demo', to: '/for-employers/demo' },
    highlight: false,
  },
];

const faqs = [
  {
    question: 'Is Global Career ID free?',
    answer:
      'It is always free for individuals: creating a Career ID, holding verified employment records, and sharing them with employers costs nothing. Organizations start free while they evaluate the platform, and larger plans are quoted based on headcount and hiring volume.',
  },
  {
    question: 'How is an organization plan priced?',
    answer:
      'Organization pricing is scoped to your headcount, how many people you hire per month, and how many countries you hire in. Request a demo and we will quote it with you rather than guessing on a page.',
  },
  {
    question: 'Do you charge candidates to be verified?',
    answer:
      'No. Candidates are never charged for verification. Employment records are created by the employer, so the cost sits with the organization, never with the person being verified.',
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing for Employers & Job Seekers | Global Career ID"
        description="Global Career ID is free for individuals. Organizations start free while evaluating, and high-volume plans are quoted on headcount and hiring volume. No candidate ever pays to be verified."
        path="/pricing"
        jsonLd={[
          organizationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Global Career ID',
            description:
              'Employment verification platform with employer-written, cryptographically signable employment records.',
            url: `${SITE_URL}/pricing`,
            brand: { '@type': 'Brand', name: 'Global Career ID' },
            offers: [
              {
                '@type': 'Offer',
                name: 'Individual',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `${SITE_URL}/register`,
                description: 'Free for job seekers and employees, forever.',
              },
              {
                '@type': 'Offer',
                name: 'Organization — Starter',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `${SITE_URL}/register`,
                description: 'Free while your organization evaluates verified hiring.',
              },
              {
                '@type': 'Offer',
                name: 'Organization — Scale',
                availability: 'https://schema.org/InStock',
                url: `${SITE_URL}/for-employers/demo`,
                description:
                  'Quoted on headcount, monthly hiring volume and number of hiring countries.',
              },
            ],
          },
          faqJsonLd(faqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Free for the people being verified. Scoped to your hiring for organizations.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`glass-card rounded-2xl p-6 ${
                    plan.highlight ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <h2 className="font-display font-semibold text-foreground text-lg">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{plan.audience}</p>
                  <p className="text-2xl font-display font-bold text-foreground mb-6">
                    {plan.price}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" variant={plan.highlight ? 'default' : 'outline'}>
                    <Link to={plan.cta.to}>
                      {plan.cta.label} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-4">
              Pricing questions
            </h2>
            {faqs.map((faq) => (
              <div key={faq.question} className="glass-card rounded-2xl p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
