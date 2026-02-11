import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Search, 
  Shield, 
  Clock,
  UserCheck,
  FileCheck,
  Lock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const benefits = [
  {
    icon: Search,
    title: 'Verify Talent Instantly',
    description: 'No more manual reference checks or phone calls. Enter a candidate\'s Profile ID and see their complete verified employment history in seconds.',
  },
  {
    icon: Shield,
    title: 'Add and Update Roles Securely',
    description: 'As a verified employer, you can add employment records for your staff. When they leave, update the record. It\'s transparent and tamper-proof.',
  },
  {
    icon: Clock,
    title: 'Reduce Hiring Time and Risk',
    description: 'Stop wasting time on candidates with fake credentials. Every WorkID profile is authentic, so you can make confident hiring decisions faster.',
  }
];

const features = [
  {
    icon: UserCheck,
    title: 'Verified Employer Status',
    description: 'Complete our verification process to start adding records'
  },
  {
    icon: FileCheck,
    title: 'Secure Record Management',
    description: 'Add, update, and close employment records easily'
  },
  {
    icon: Lock,
    title: 'Audit Trail',
    description: 'Complete transparency on all record changes'
  }
];

const steps = [
  {
    number: '1',
    title: 'Register as Employer',
    description: 'Sign up with your company details and business registration'
  },
  {
    number: '2',
    title: 'Get Verified',
    description: 'Our team verifies your company within 24-48 hours'
  },
  {
    number: '3',
    title: 'Start Managing',
    description: 'Add employees, update records, verify candidates'
  }
];

export default function ForEmployers() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">For Employers & Recruiters</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            Hire with <span className="text-primary">Confidence</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Verify candidates instantly. Manage employee records securely. 
            Reduce hiring risk with authenticated employment histories.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register?type=employer">
                Register as Employer
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/verify">Try Verification</Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 mb-20">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
            Why WorkID for Employers?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card 
                key={benefit.title} 
                className="glass-card animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6">
                    <benefit.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works for Employers */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
              Get Started in 3 Steps
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div key={step.number} className="text-center relative">
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border" />
                  )}
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 relative z-10">
                    <span className="text-2xl font-display font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Row */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 pb-20">
          <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-3xl p-12 max-w-3xl mx-auto text-center text-primary-foreground">
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Join verified employers who trust WorkID for authentic candidate verification.
            </p>
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <Link to="/register?type=employer">
                <Building2 className="w-5 h-5 mr-2" />
                Register Your Company
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
