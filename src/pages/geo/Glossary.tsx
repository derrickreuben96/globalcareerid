import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { usePageVisit } from '@/hooks/usePageVisit';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { glossaryTerms } from '@/content/geoContent';
import {
  breadcrumbJsonLd,
  definedTermSetJsonLd,
  organizationJsonLd,
} from '@/lib/structuredData';

export default function Glossary() {
  usePageVisit('/glossary');
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Employment Verification Glossary | Global Career ID"
        description="Plain-language definitions of employment verification terms: Career ID, employer-verified record, signed credential, revocation, verified referral letter, dispute and CV fraud."
        path="/glossary"
        jsonLd={[
          organizationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Glossary', path: '/glossary' },
          ]),
          definedTermSetJsonLd(
            'Global Career ID employment verification glossary',
            '/glossary',
            glossaryTerms,
          ),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
              Employment verification glossary
            </h1>
            <p className="text-xl text-muted-foreground">
              Short, precise definitions of the terms used across Global Career ID and verified
              hiring in general.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <dl className="max-w-3xl mx-auto space-y-5">
              {glossaryTerms.map((item) => (
                <div key={item.term} className="glass-card rounded-2xl p-6">
                  <dt
                    id={item.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                    className="font-display font-semibold text-foreground text-lg mb-2"
                  >
                    {item.term}
                  </dt>
                  <dd className="text-muted-foreground leading-relaxed">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">
              Keep reading
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild variant="outline">
                <Link to="/employment-verification">Employment verification explained</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cv-vs-career-id">CV vs Career ID</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/answers">All answers</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
