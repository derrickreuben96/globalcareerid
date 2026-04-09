import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Target, Eye, Users, Award, Globe, ArrowRight, Linkedin, Mail } from 'lucide-react';
import ceoPhoto from '@/assets/ceo-photo.jpg';

export default function About() {
  const { t } = useTranslation();

  const teamMembers = [
    {
      name: 'Mr. Derrick Reuben Owino',
      role: 'CEO & Founder',
      image: ceoPhoto,
      bio: 'Visionary leader passionate about transforming employment verification globally.',
      linkedin: 'https://www.linkedin.com/in/derrick-reuben-b02263101',
    },
    {
      name: 'Sarah Kimani',
      role: 'Chief Technology Officer',
      image: null,
      bio: 'Expert in building secure, scalable platforms for enterprise solutions.',
      linkedin: '#',
    },
    {
      name: 'James Ochieng',
      role: 'Head of Operations',
      image: null,
      bio: 'Ensures seamless verification processes and employer partnerships.',
      linkedin: '#',
    },
    {
      name: 'Grace Wanjiku',
      role: 'Customer Success Lead',
      image: null,
      bio: 'Dedicated to helping job seekers and employers get the most from our platform.',
      linkedin: '#',
    },
  ];

  const values = [
    {
      icon: Shield,
      title: t('about.trustIntegrity'),
      description: t('about.trustIntegrityDesc'),
    },
    {
      icon: Eye,
      title: t('about.transparency'),
      description: t('about.transparencyDesc'),
    },
    {
      icon: Globe,
      title: t('about.globalReach'),
      description: t('about.globalReachDesc'),
    },
    {
      icon: Award,
      title: t('about.excellence'),
      description: t('about.excellenceDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
                {t('about.title')}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('about.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <div className="glass-card rounded-2xl p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">{t('about.ourMission')}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.missionDesc')}
                </p>
              </div>
              
              <div className="glass-card rounded-2xl p-8">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Eye className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">{t('about.ourVision')}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('about.visionDesc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground text-center mb-12">
                {t('about.ourStory')}
              </h2>
              <div className="glass-card rounded-2xl p-8 md:p-12">
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  <p className="mb-6">{t('about.storyP1')}</p>
                  <p className="mb-6">{t('about.storyP2')}</p>
                  <p>{t('about.storyP3')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground text-center mb-12">
              {t('about.ourValues')}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <div key={index} className="glass-card rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meet the Team */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                {t('about.meetTeam')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('about.meetTeamSubtitle')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {teamMembers.map((member, index) => (
                <div key={index} className="glass-card rounded-2xl p-6 text-center group hover:shadow-elevated transition-shadow">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-primary/20">
                    {member.image ? (
                      <img 
                        src={member.image} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Users className="w-10 h-10 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-display font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-primary font-medium mt-1">{member.role}</p>
                  <p className="text-sm text-muted-foreground mt-3">{member.bio}</p>
                  {member.linkedin && member.linkedin !== '#' && (
                    <a 
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                    >
                      <Linkedin className="w-4 h-4" />
                      {t('about.connect')}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CEO Spotlight */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="glass-card rounded-2xl p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20 shadow-elevated flex-shrink-0">
                    <img 
                      src={ceoPhoto} 
                      alt="Mr. Derrick Reuben Owino - CEO & Founder" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                      Mr. Derrick Reuben Owino
                    </h3>
                    <p className="text-lg text-primary font-semibold mt-1">
                      CEO & Founder
                    </p>
                    <p className="mt-4 text-muted-foreground">
                      {t('about.ceoQuote')}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                      <a 
                        href="https://www.linkedin.com/in/derrick-reuben-b02263101" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] transition-colors text-sm"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                      <a 
                        href="mailto:derrickreuben96@gmail.com"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                      >
                        <Mail className="w-4 h-4" />
                        {t('founder.contact')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              {t('cta.readyToJoin')}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
              {t('cta.whetherJobSeeker')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/register">
                  {t('hero.createProfile')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="cta-secondary" size="lg">
                <Link to="/contact">
                  {t('cta.contactUs')}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
