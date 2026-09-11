import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';
import { HiringCostCalculator } from '@/components/employers/HiringCostCalculator';
import { usePageVisit } from '@/hooks/usePageVisit';
import { TIERS, PRICE_PER_VERIFICATION } from '@/lib/pricing';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  SITE_URL,
} from '@/lib/structuredData';

const faqs = [
  {
    question: 'Is Global Career ID free?',
    answer:
      'It is always free for individuals: creating a Career ID, holding verified employment records, and sharing them with employers costs nothing. Organizations can start on pay-as-you-go with no monthly fee and pay $12 per Career ID verification.',
  },
  {
    question: 'What does a verification cost?',
    answer:
      'A single Career ID verification is $12 on pay-as-you-go. The Growth plan is $299 per month and includes 40 verifications, with extra verifications at $12 each. High-volume and multi-country hiring is quoted on the Scale plan.',
  },
  {
    question: 'How is the Scale plan priced?',
    answer:
      'Scale pricing is scoped to your headcount, how many people you hire per month, and how many countries you hire in. Request a demo and we will quote it with you rather than guessing on a page.',
  },
  {
    question: 'Do you charge candidates to be verified?',
    answer:
      'No. Candidates are never charged for verification. Employment records are created by the employer, so the cost sits with the organization, never with the person being verified.',
  },
];

export default function Pricing() {
  usePageVisit('/pricing');

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing: $12 per Verification | Global Career ID"
        description="Free for individuals forever. Organizations pay $12 per Career ID verification, or $299/month on Growth including 40 verifications. High-volume hiring is quoted on Scale."
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
            offers: TIERS.map((tier) => ({
              '@type': 'Offer',
              name: tier.name,
              ...(tier.monthlyPrice !== null
                ? { price: String(tier.monthlyPrice), priceCurrency: 'USD' }
                : {}),
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}${tier.cta.to}`,
              description: `${tier.audience}. ${tier.priceNote ?? ''}`.trim(),
            })),
          },
          faqJsonLd(faqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Free for the people being verified. ${PRICE_PER_VERIFICATION} per verification for
              organizations, or a monthly plan when you hire regularly.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
              {TIERS.map((plan) => (
                <div
                  key={plan.name}
                  className={`glass-card rounded-2xl p-6 ${
                    plan.highlight ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <h2 className="font-display font-semibold text-foreground text-lg">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{plan.audience}</p>
                  <p className="text-3xl font-display font-bold text-foreground">{plan.price}</p>
                  {plan.priceNote && (
                    <p className="text-xs text-muted-foreground mb-6">{plan.priceNote}</p>
                  )}
                  <ul className="space-y-3 mb-8 mt-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.highlight ? 'default' : 'outline'}
                  >
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
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-8">
              Compare it to what you spend today
            </h2>
            <HiringCostCalculator />
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl space-y-6">
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
