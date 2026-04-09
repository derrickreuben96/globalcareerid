import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  UserCheck, 
  Building2, 
  Search, 
  Shield, 
  QrCode,
  FileCheck,
  CheckCircle
} from 'lucide-react';

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    {
      number: '01',
      title: t('howItWorksPage.step1Title'),
      description: t('howItWorksPage.step1Desc'),
      icon: UserCheck,
      details: [
        t('howItWorksPage.step1Detail1'),
        t('howItWorksPage.step1Detail2'),
        t('howItWorksPage.step1Detail3'),
      ]
    },
    {
      number: '02',
      title: t('howItWorksPage.step2Title'),
      description: t('howItWorksPage.step2Desc'),
      icon: Building2,
      details: [
        t('howItWorksPage.step2Detail1'),
        t('howItWorksPage.step2Detail2'),
        t('howItWorksPage.step2Detail3'),
      ]
    },
    {
      number: '03',
      title: t('howItWorksPage.step3Title'),
      description: t('howItWorksPage.step3Desc'),
      icon: FileCheck,
      details: [
        t('howItWorksPage.step3Detail1'),
        t('howItWorksPage.step3Detail2'),
        t('howItWorksPage.step3Detail3'),
      ]
    },
    {
      number: '04',
      title: t('howItWorksPage.step4Title'),
      description: t('howItWorksPage.step4Desc'),
      icon: Search,
      details: [
        t('howItWorksPage.step4Detail1'),
        t('howItWorksPage.step4Detail2'),
        t('howItWorksPage.step4Detail3'),
      ]
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: t('howItWorksPage.employerVerifiedOnly'),
      description: t('howItWorksPage.employerVerifiedOnlyDesc'),
    },
    {
      icon: QrCode,
      title: t('howItWorksPage.instantSharing'),
      description: t('howItWorksPage.instantSharingDesc'),
    },
    {
      icon: CheckCircle,
      title: t('howItWorksPage.alwaysAccurate'),
      description: t('howItWorksPage.alwaysAccurateDesc'),
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            {t('howItWorksPage.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorksPage.subtitle')}
          </p>
        </section>

        {/* Steps */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step) => (
              <Card key={step.number} className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[200px_1fr] gap-0">
                    <div className="bg-primary/5 p-8 flex flex-col items-center justify-center">
                      <span className="text-5xl font-display font-bold text-primary/30">
                        {step.number}
                      </span>
                      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mt-4">
                        <step.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="p-8">
                      <h3 className="text-2xl font-display font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-verified flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
              {t('howItWorksPage.whyItWorks')}
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {benefits.map((benefit) => (
                <Card key={benefit.title} className="glass-card text-center">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">
            {t('cta.readyToGetStarted')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('cta.joinThousandsSimple')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                <UserCheck className="w-5 h-5 mr-2" />
                {t('howItWorksPage.createYourProfile')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/verify">
                <Search className="w-5 h-5 mr-2" />
                {t('howItWorksPage.verifyAProfile')}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
