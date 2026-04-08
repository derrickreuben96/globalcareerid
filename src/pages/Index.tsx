import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AIChatWidget } from '@/components/AIChatWidget';
import { Shield, UserCheck, Building2, Search, QrCode, Lock, CheckCircle, ArrowRight, Users, FileCheck, Clock, Mail, Quote, Star } from 'lucide-react';
import { HeroBackground } from '@/components/HeroBackground';
import { useTranslation } from 'react-i18next';
import testimonialAmina from '@/assets/testimonial-amina.jpg';
import testimonialDavid from '@/assets/testimonial-david.jpg';
import testimonialPatricia from '@/assets/testimonial-patricia.jpg';
import testimonialMichael from '@/assets/testimonial-michael.jpg';
import testimonialLinda from '@/assets/testimonial-linda.jpg';
import testimonialSamuel from '@/assets/testimonial-samuel.jpg';

const testimonials = [
  {
    name: 'Amina Hassan',
    image: testimonialAmina,
    role: 'HR Director',
    company: 'TechBridge Solutions',
    type: 'employer' as const,
    quote: 'Global Career ID has cut our background check time by 80%. We now verify candidates in minutes instead of weeks. It\'s transformed our hiring process completely.',
    rating: 5,
  },
  {
    name: 'David Mwangi',
    image: testimonialDavid,
    role: 'Software Engineer',
    company: '',
    type: 'jobseeker' as const,
    quote: 'I no longer worry about proving my work history. My verified profile speaks for itself—recruiters trust it instantly and I get callbacks faster than ever.',
    rating: 5,
  },
  {
    name: 'Patricia Oduor',
    image: testimonialPatricia,
    role: 'Talent Acquisition Lead',
    company: 'Savannah Consulting Group',
    type: 'employer' as const,
    quote: 'We\'ve eliminated resume fraud from our pipeline entirely. The employer-verified records give us confidence that every candidate is who they say they are.',
    rating: 5,
  },
  {
    name: 'Michael Otieno',
    image: testimonialMichael,
    role: 'Project Manager',
    company: '',
    type: 'jobseeker' as const,
    quote: 'Sharing my Profile ID is so much easier than sending CVs. Employers can see my entire verified career history with one click. This is the future of hiring.',
    rating: 5,
  },
  {
    name: 'Linda Wambui',
    image: testimonialLinda,
    role: 'CEO',
    company: 'NexGen Staffing',
    type: 'employer' as const,
    quote: 'As a staffing agency, trust is everything. Global Career ID gives our clients the assurance they need, and our placement success rate has never been higher.',
    rating: 5,
  },
  {
    name: 'Samuel Kipchoge',
    image: testimonialSamuel,
    role: 'Accountant',
    company: '',
    type: 'jobseeker' as const,
    quote: 'After years of carrying reference letters, I finally have a digital, verified record of my career. The privacy controls let me decide exactly who sees my data.',
    rating: 5,
  },
];
import ceoPhoto from '@/assets/ceo-photo.jpg';

export default function Index() {
  const { t } = useTranslation();

  const features = [{
    icon: Shield,
    title: t('features.employerVerifiedRecords'),
    description: t('features.employerVerifiedRecordsDesc')
  }, {
    icon: QrCode,
    title: t('features.instantProfileSharing'),
    description: t('features.instantProfileSharingDesc')
  }, {
    icon: Lock,
    title: t('features.youControlAccess'),
    description: t('features.youControlAccessDesc')
  }, {
    icon: FileCheck,
    title: t('features.aiPoweredAssistance'),
    description: t('features.aiPoweredAssistanceDesc')
  }];

  const stats = [{
    value: '100%',
    label: t('hero.verifiedRecords')
  }, {
    value: '0',
    label: t('hero.cvFraudRisk')
  }, {
    value: '<2min',
    label: t('hero.verificationTime')
  }];

  const howItWorks = [{
    step: '01',
    title: t('howItWorksSection.step1Title'),
    description: t('howItWorksSection.step1Desc'),
    icon: UserCheck
  }, {
    step: '02',
    title: t('howItWorksSection.step2Title'),
    description: t('howItWorksSection.step2Desc'),
    icon: Building2
  }, {
    step: '03',
    title: t('howItWorksSection.step3Title'),
    description: t('howItWorksSection.step3Desc'),
    icon: Search
  }];

  return <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Image Background */}
      <section className="relative pt-32 pb-24 overflow-hidden min-h-[90vh] flex items-center">
        <HeroBackground />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <VerifiedBadge variant="large" label={t('hero.trustedPlatform')} />
            
            <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-display font-bold text-foreground leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-secondary-foreground">
                Global Career ID
              </span>
            </h1>
            
            <p className="mt-6 text-2xl md:text-3xl lg:text-4xl font-display font-semibold text-foreground/90">
              {t('hero.tagline')}
            </p>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  {t('hero.createProfile')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm" asChild>
                <Link to="/verify">
                  <Search className="w-5 h-5" />
                  {t('hero.verifyProfile')}
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
              <span className="text-sm font-medium">{t('trust.employerVerified')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">{t('trust.privacyFirst')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">{t('trust.consentDriven')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-verified" />
              <span className="text-sm font-medium">{t('trust.instantAccess')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">{t('howItWorksSection.title')}</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorksSection.subtitle')}
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
              {t('features.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
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

      {/* Testimonials */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {t('testimonials.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-elevated transition-shadow duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Quote className="w-5 h-5 text-primary/40" />
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      testimonial.type === 'employer' 
                        ? 'bg-accent/10 text-accent' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {testimonial.type === 'employer' ? t('testimonials.employer') : t('testimonials.jobSeeker')}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
                  <img src={testimonial.image} alt={testimonial.name} className="w-11 h-11 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}{testimonial.company ? `, ${testimonial.company}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-24 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            {t('cta.readyToBuildTrust')}
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
            {t('cta.joinThousands')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
              <Link to="/register">
                <UserCheck className="w-5 h-5" />
                {t('cta.imJobSeeker')}
              </Link>
            </Button>
            <Button size="lg" variant="cta-secondary" asChild>
              <Link to="/register?type=employer">
                <Building2 className="w-5 h-5" />
                {t('cta.imEmployer')}
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
              {t('founder.meetTheFounder')}
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
                  {t('founder.ceoFounder')}
                </p>
                <p className="mt-6 text-muted-foreground max-w-2xl">
                  {t('founder.founderBio')}
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
                    {t('founder.connectLinkedIn')}
                  </a>
                  <a 
                    href="mailto:derrickreuben96@gmail.com"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    {t('founder.contact')}
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
