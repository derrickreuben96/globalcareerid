import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AIChatWidget } from '@/components/AIChatWidget';
import { Shield, UserCheck, Building2, Search, QrCode, Lock, CheckCircle, ArrowRight, Users, FileCheck, Clock, Mail } from 'lucide-react';
import { HeroBackground } from '@/components/HeroBackground';
import ceoPhoto from '@/assets/ceo-photo.jpg';

const features = [{
  icon: Shield,
  title: 'Employer-Verified Records',
  description: 'Only verified employers can add employment history. Individuals cannot edit their own work experience.'
}, {
  icon: QrCode,
  title: 'Instant Profile Sharing',
  description: 'Share your verified work history with a unique Profile ID or QR code. No more CV submissions.'
}, {
  icon: Lock,
  title: 'You Control Access',
  description: 'Your data, your rules. Choose who can view your verified profile and revoke access anytime.'
}, {
  icon: FileCheck,
  title: 'AI-Powered Assistance',
  description: 'Get smart skill suggestions, career guidance, and instant answers from our AI assistant—for both job seekers and employers.'
}];

const stats = [{
  value: '100%',
  label: 'Verified Records'
}, {
  value: '0',
  label: 'CV Fraud Risk'
}, {
  value: '<2min',
  label: 'Verification Time'
}];

const howItWorks = [{
  step: '01',
  title: 'Create Your Profile',
  description: 'Register once, receive a unique Profile ID. Your professional identity starts here.',
  icon: UserCheck
}, {
  step: '02',
  title: 'Employers Add Records',
  description: 'When hired, your employer adds the role to your profile. When you leave, they close the record.',
  icon: Building2
}, {
  step: '03',
  title: 'Share & Get Hired',
  description: 'Share your Profile ID with recruiters. They see your verified history instantly.',
  icon: Search
}];

export default function Index() {
  return <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Image Background */}
      <section className="relative pt-32 pb-24 overflow-hidden min-h-[90vh] flex items-center">
        <HeroBackground />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <VerifiedBadge variant="large" label="Trusted Verification Platform" />
            
            <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-display font-bold text-foreground leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-secondary-foreground">
                Global Career ID
              </span>
            </h1>
            
            <p className="mt-6 text-2xl md:text-3xl lg:text-4xl font-display font-semibold text-foreground/90">
              One ID. Every role. Verified.
            </p>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A centralized system where work experience is verified by employers—not written by applicants. 
              Make fake CVs obsolete.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Create Your Profile
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm" asChild>
                <Link to="/verify">
                  <Search className="w-5 h-5" />
                  Verify a Profile
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {stats.map(stat => <div key={stat.label} className="text-center glass-card rounded-xl p-4">
                  <p className="text-3xl md:text-4xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">Employer Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">Privacy First</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">Consent Driven</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">Instant Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">How Global Career ID Works</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, fair process that puts verified truth at the center of hiring
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => <div key={item.step} className="relative glass-card rounded-2xl p-8 text-center animate-fade-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-6xl font-display font-bold text-muted/50">
                  {item.step}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mt-8 mb-6">
                  <item.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Built on Trust, Not Claims
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to make verification fair, fast, and fraud-proof
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => <div key={feature.title} className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-shadow duration-300 animate-fade-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            Ready to Build Trust?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Join thousands of professionals and employers who've made the switch to verified hiring—now with AI-powered assistance.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
              <Link to="/register">
                <UserCheck className="w-5 h-5" />
                I'm a Job Seeker
              </Link>
            </Button>
            <Button size="lg" variant="cta-secondary" asChild>
              <Link to="/register?type=employer">
                <Building2 className="w-5 h-5" />
                I'm an Employer
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CEO & Founder Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12">
              Meet the Founder
            </h2>
            <div className="glass-card rounded-2xl p-8 md:p-12">
              <div className="flex flex-col items-center">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-primary/20 shadow-elevated mb-6">
                  <img 
                    src={ceoPhoto} 
                    alt="Mr. Derrick Reuben Owino - CEO & Founder" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  Mr. Derrick Reuben Owino
                </h3>
                <p className="text-lg text-primary font-semibold mt-2">
                  CEO & Founder
                </p>
                <p className="mt-6 text-muted-foreground max-w-2xl">
                  Passionate about transforming the way employment verification works globally. 
                  Building a future where trust and transparency are at the heart of every hiring decision.
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <a 
                    href="https://www.linkedin.com/in/derrick-reuben-b02263101" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    Connect on LinkedIn
                  </a>
                  <a 
                    href="mailto:derrickreuben96@gmail.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <AIChatWidget />
    </div>;
}
