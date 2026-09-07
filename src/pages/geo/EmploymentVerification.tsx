import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ShieldCheck, ArrowRight, Building2, UserCheck, FileCheck2 } from 'lucide-react';
import { employmentVerificationFaqs } from '@/content/geoContent';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from '@/lib/structuredData';

const steps = [
  {
    icon: Building2,
    name: 'The employer writes the record',
    text: 'A verified organization adds the role — job title, department, employment type, start and end date — to its own employee register. The employee never authors it.',
  },
  {
    icon: UserCheck,
    name: 'The record attaches to a Career ID',
    text: 'The record joins the employee’s permanent Career ID, building one continuous, employer-written employment timeline across every job they hold.',
  },
  {
    icon: FileCheck2,
    name: 'Anyone can verify it instantly',
    text: 'A recruiter enters the Career ID on the public verification page, or checks a signed credential’s digital signature independently. No reference emails, no waiting.',
  },
];

export default function EmploymentVerification() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Employment Verification: How It Works | Global Career ID"
        description="What employment verification is, how employer-written records replace reference checks, and how recruiters verify a candidate's work history instantly with a Career ID."
        path="/employment-verification"
        jsonLd={[
          organizationJsonLd,
          softwareApplicationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Employment verification', path: '/employment-verification' },
          ]),
          articleJsonLd({
            headline: 'Employment verification: how it works and why CVs fail',
            description:
              'A plain-language explanation of employment verification, reference checks, CV fraud, and employer-written verified employment records.',
            path: '/employment-verification',
          }),
          howToJsonLd({
            name: 'How to verify a candidate’s employment history',
            description:
              'Verify a candidate’s employment history using an employer-written Career ID record instead of reference calls.',
            steps: steps.map((s) => ({ name: s.name, text: s.text })),
          }),
          faqJsonLd(employmentVerificationFaqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
                Employment verification, explained
              </h1>
              <p className="text-xl text-muted-foreground">
                Employment verification confirms that a candidate really held the jobs they claim —
                the employer, the title, the department, and the exact dates. Global Career ID does
                it by letting the employer write the record, so there is nothing left to check at
                hiring time.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-6 text-muted-foreground leading-relaxed">
              <h2 className="text-3xl font-display font-bold text-foreground">
                Why reference checks stopped working
              </h2>
              <p>
                A CV is written by the person being assessed. A reference letter is a document on
                letterhead that can be edited in minutes. Confirming either means emailing or
                phoning a former employer and hoping somebody replies — often after an offer has
                already been made. The result is a hiring process that runs on unverified claims.
              </p>
              <p>
                Global Career ID inverts the flow. The organization that employed the person is the
                only party that can create or change their employment record. Employees can view
                their history, request a correction, or raise a dispute for review — but they cannot
                alter dates, titles, or employers. Every record can additionally be issued as a
                digitally signed credential, so tampering invalidates it on verification.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
              How verification works on Global Career ID
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.name} className="glass-card rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-accent mb-2">Step {i + 1}</p>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-3">
                    {step.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-display font-bold text-foreground mb-8 text-center">
                Common questions about employment verification
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {employmentVerificationFaqs.map((faq, i) => (
                  <AccordionItem
                    key={faq.question}
                    value={`q-${i}`}
                    className="glass-card rounded-xl px-5 border-none"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Verify a candidate now
            </h2>
            <p className="text-muted-foreground mb-8">
              Have a Career ID in front of you? Look it up. Hiring at volume? Book a walkthrough
              with our team.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/verify">
                  Verify a Career ID <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/for-employers/demo">Request an employer demo</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm">
              <Link to="/cv-vs-career-id" className="text-primary hover:underline">
                CV vs Career ID comparison
              </Link>
              <Link to="/glossary" className="text-primary hover:underline">
                Employment verification glossary
              </Link>
              <Link to="/answers" className="text-primary hover:underline">
                All answers
              </Link>
              <Link to="/how-it-works" className="text-primary hover:underline">
                How it works
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
