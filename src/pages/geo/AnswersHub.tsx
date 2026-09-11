import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { usePageVisit } from '@/hooks/usePageVisit';
import { Button } from '@/components/ui/button';
import { MessagesSquare, ArrowRight } from 'lucide-react';
import { employmentVerificationFaqs, employerFaqs } from '@/content/geoContent';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from '@/lib/structuredData';

const allFaqs = [...employmentVerificationFaqs, ...employerFaqs];

const relatedPages = [
  {
    title: 'Employment verification explained',
    description:
      'What employment verification is, why reference checks fail, and how employer-written records work.',
    path: '/employment-verification',
  },
  {
    title: 'CV vs Career ID',
    description: 'Side-by-side comparison of a self-authored CV and an employer-verified Career ID.',
    path: '/cv-vs-career-id',
  },
  {
    title: 'Glossary',
    description: 'Definitions of Career ID, signed credential, revocation, dispute and more.',
    path: '/glossary',
  },
  {
    title: 'For employers and recruiters',
    description: 'Verify candidates, post jobs, and onboard your existing employees.',
    path: '/for-employers',
  },
  {
    title: 'Request an employer demo',
    description: 'See verified hiring on your own roles with our team.',
    path: '/for-employers/demo',
  },
  {
    title: 'Plans for organizations',
    description: 'What is free, what is quoted, and how organization plans are scoped.',
    path: '/pricing',
  },
];

export default function AnswersHub() {
  usePageVisit('/answers');
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Answers: Verified Hiring & Employment Records | Global Career ID"
        description="Direct answers about employment verification, Career IDs, CV fraud, GDPR compliance, recruiter lookups and employer onboarding on Global Career ID."
        path="/answers"
        jsonLd={[
          organizationJsonLd,
          softwareApplicationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Answers', path: '/answers' },
          ]),
          faqJsonLd(allFaqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
              <MessagesSquare className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Answers about verified hiring
            </h1>
            <p className="text-xl text-muted-foreground">
              Every question we are asked most often, answered in one place — short enough to quote,
              complete enough to act on.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {allFaqs.map((faq) => (
                <article key={faq.question} className="glass-card rounded-2xl p-6">
                  <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                    {faq.question}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-10">
              Go deeper
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {relatedPages.map((page) => (
                <Link
                  key={page.path}
                  to={page.path}
                  className="glass-card rounded-2xl p-6 hover:shadow-card transition-shadow group"
                >
                  <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                    {page.title}
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground">{page.description}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button asChild size="lg">
                <Link to="/register">Create your Career ID</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
