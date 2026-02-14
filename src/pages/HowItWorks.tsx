import { Link } from 'react-router-dom';
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
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    description: 'Register with your email to get your unique Global Career ID Profile ID. This becomes your verified professional identity.',
    icon: UserCheck,
    details: [
      'Quick registration - takes less than 2 minutes',
      'Receive a unique Profile ID (e.g., TW-2026-ABC12)',
      'Your profile is ready to receive verified records'
    ]
  },
  {
    number: '02',
    title: 'Employers Add Records',
    description: 'When you join a company, your verified employer adds your role to your profile. When you leave, they close the record.',
    icon: Building2,
    details: [
      'Only verified employers can add records',
      'Records include job title, dates, and department',
      'Employment status is always current and accurate'
    ]
  },
  {
    number: '03',
    title: 'Build Your History',
    description: 'As you progress in your career, each verified role is added to your profile, creating an authentic work timeline.',
    icon: FileCheck,
    details: [
      'Each role is employer-verified',
      'Complete history builds over time',
      'No gaps or false claims possible'
    ]
  },
  {
    number: '04',
    title: 'Share & Get Hired',
    description: 'Share your Profile ID with recruiters or potential employers. They can instantly verify your complete work history.',
    icon: Search,
    details: [
      'Share via ID, QR code, or direct link',
      'Instant verification - no phone calls needed',
      'Control your profile visibility settings'
    ]
  }
];

const benefits = [
  {
    icon: Shield,
    title: 'Employer-Verified Only',
    description: 'Records can only be added by verified employers, eliminating CV fraud completely.'
  },
  {
    icon: QrCode,
    title: 'Instant Sharing',
    description: 'Share your profile with a simple ID or QR code. No more emailing CVs or PDFs.'
  },
  {
    icon: CheckCircle,
    title: 'Always Accurate',
    description: 'Your work history is always current and accurate—updated in real-time by employers.'
  }
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            How Global Career ID Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple, fair process that puts verified truth at the center of hiring. 
            No more fake CVs, no more time-consuming reference checks.
          </p>
        </section>

        {/* Steps */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step, index) => (
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
              Why It Works
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
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of professionals who've made the switch to verified hiring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                <UserCheck className="w-5 h-5 mr-2" />
                Create Your Profile
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/verify">
                <Search className="w-5 h-5 mr-2" />
                Verify a Profile
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}