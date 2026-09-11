import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { usePageVisit } from '@/hooks/usePageVisit';
import { Button } from '@/components/ui/button';
import { FileX2, BadgeCheck, ArrowRight } from 'lucide-react';
import { cvComparison } from '@/content/geoContent';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
} from '@/lib/structuredData';

const faqs = [
  {
    question: 'Is a Career ID better than a CV?',
    answer:
      'A CV and a Career ID answer different questions. A CV presents what a candidate wants to say about themselves; a Career ID proves where they actually worked, because the records are written by their employers. Most candidates use both: the CV for narrative and skills, the Career ID for verified employment facts.',
  },
  {
    question: 'Do candidates still need a CV if they have a Career ID?',
    answer:
      'On Global Career ID job applications the Career ID replaces the attached CV, because the employer already sees verified employment history with the application. Elsewhere a candidate can keep using a CV and add their Career ID so the employer can confirm the employment section instantly.',
  },
  {
    question: 'How does a Career ID prevent CV fraud?',
    answer:
      'Employment records can only be created and changed by the verified employer of record, and can be issued as digitally signed credentials. A candidate cannot invent an employer, inflate a job title, or extend an end date, and any tampering with a signed credential makes it fail verification.',
  },
];

export default function CvVsCareerId() {
  usePageVisit('/cv-vs-career-id');
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="CV vs Career ID: What's the Difference? | Global Career ID"
        description="A side-by-side comparison of a traditional CV and an employer-verified Career ID: who writes it, how it is checked, how long verification takes, and how forgery is prevented."
        path="/cv-vs-career-id"
        jsonLd={[
          organizationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'CV vs Career ID', path: '/cv-vs-career-id' },
          ]),
          articleJsonLd({
            headline: 'CV vs Career ID: a side-by-side comparison',
            description:
              'How a self-authored CV differs from an employer-written, verifiable Career ID across authorship, verification speed, forgery resistance and data control.',
            path: '/cv-vs-career-id',
          }),
          faqJsonLd(faqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              CV vs Career ID
            </h1>
            <p className="text-xl text-muted-foreground">
              A CV is written by the candidate. A Career ID is written by their employers. That
              single difference changes how long hiring takes and how much of it you can trust.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Comparison of a traditional CV and a Global Career ID
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-left p-4 font-display text-foreground">
                      Criterion
                    </th>
                    <th scope="col" className="text-left p-4 font-display text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <FileX2 className="w-4 h-4 text-muted-foreground" /> Traditional CV
                      </span>
                    </th>
                    <th scope="col" className="text-left p-4 font-display text-foreground">
                      <span className="inline-flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-accent" /> Career ID
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cvComparison.map((row) => (
                    <tr key={row.criterion} className="border-b border-border/50">
                      <th scope="row" className="text-left p-4 font-medium text-foreground align-top">
                        {row.criterion}
                      </th>
                      <td className="p-4 text-muted-foreground align-top">{row.cv}</td>
                      <td className="p-4 text-foreground align-top">{row.careerId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl font-display font-bold text-foreground text-center">
              Questions people ask
            </h2>
            {faqs.map((faq) => (
              <div key={faq.question} className="glass-card rounded-2xl p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Get a Career ID, or verify one
            </h2>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <Button asChild size="lg">
                <Link to="/register">
                  Create your Career ID <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/employment-verification">How verification works</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
