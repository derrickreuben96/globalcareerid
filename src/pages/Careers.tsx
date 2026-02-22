import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Users, 
  Heart, 
  Zap,
  Globe,
  Mail,
  ArrowRight,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ceoPhoto from '@/assets/ceo-photo.jpg';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full_time' | 'part_time' | 'contract' | 'remote';
  description: string;
  requirements: string[];
}

const jobOpenings: JobOpening[] = [
  {
    id: '1',
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    location: 'Remote / Kuwait',
    type: 'full_time',
    description: 'Join our engineering team to build the future of verified employment. You\'ll work on our core platform using React, Node.js, and PostgreSQL.',
    requirements: [
      '5+ years of full stack development experience',
      'Strong proficiency in React/TypeScript',
      'Experience with PostgreSQL and Supabase',
      'Understanding of security best practices',
      'Excellent communication skills'
    ]
  },
  {
    id: '2',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'full_time',
    description: 'Shape the user experience of Global Career ID. Create intuitive interfaces that make employment verification seamless for millions of users.',
    requirements: [
      '3+ years of product design experience',
      'Proficiency in Figma and design systems',
      'Strong portfolio showcasing UX problem-solving',
      'Experience with B2B SaaS products',
      'User research skills'
    ]
  },
  {
    id: '3',
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Kuwait City',
    type: 'full_time',
    description: 'Help our enterprise clients get the most out of Global Career ID. Build relationships and ensure successful onboarding and adoption.',
    requirements: [
      '3+ years in customer success or account management',
      'Experience with HR/recruitment technology',
      'Strong presentation and communication skills',
      'Arabic and English fluency',
      'Problem-solving mindset'
    ]
  },
  {
    id: '4',
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Remote / Kuwait',
    type: 'contract',
    description: 'Drive awareness and growth for Global Career ID across the MENA region. Execute campaigns and build our brand presence.',
    requirements: [
      '2+ years of digital marketing experience',
      'Experience with content marketing and SEO',
      'Social media management skills',
      'Analytics and data-driven mindset',
      'Creative thinking'
    ]
  }
];

const benefits = [
  { icon: Globe, title: 'Remote-First', description: 'Work from anywhere in the world' },
  { icon: Heart, title: 'Health & Wellness', description: 'Comprehensive health coverage' },
  { icon: Zap, title: 'Growth', description: 'Learning budget and career development' },
  { icon: Users, title: 'Team Culture', description: 'Collaborative and inclusive environment' },
];

export default function Careers() {
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    profileId: '',
    portfolio: '',
    coverLetter: '',
  });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationForm.name || !applicationForm.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission (in a real app, this would send to an API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Application submitted successfully! We\'ll be in touch soon.');
    setSelectedJob(null);
    setApplicationForm({
      name: '',
      email: '',
      phone: '',
      profileId: '',
      portfolio: '',
      coverLetter: '',
    });
    setIsSubmitting(false);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full_time': return <Badge className="bg-verified text-verified-foreground">Full Time</Badge>;
      case 'part_time': return <Badge variant="secondary">Part Time</Badge>;
      case 'contract': return <Badge variant="outline">Contract</Badge>;
      case 'remote': return <Badge className="bg-primary text-primary-foreground">Remote</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-4">We're Hiring</Badge>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
              Join Our Mission
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Help us build the future of employment verification. We're looking for passionate 
              people who want to make hiring more transparent and trustworthy worldwide.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Kuwait & Remote
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Growing Team
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                Global Impact
              </span>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-foreground mb-12">
              Why Join Global Career ID?
            </h2>
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="glass-card rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-foreground mb-4">
              Open Positions
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              We're looking for talented individuals to join our team. Explore our current openings below.
            </p>
            
            <div className="max-w-4xl mx-auto space-y-4">
              {jobOpenings.map((job) => (
                <div 
                  key={job.id}
                  className="glass-card rounded-xl p-6 hover:shadow-elevated transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                        {getTypeBadge(job.type)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                      </div>
                      <p className="mt-3 text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedJob(job)}>
                          View & Apply
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">{job.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            {getTypeBadge(job.type)}
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {job.department}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location}
                            </span>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">About the Role</h4>
                            <p className="text-muted-foreground">{job.description}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-foreground mb-3">Requirements</h4>
                            <ul className="space-y-2">
                              {job.requirements.map((req, index) => (
                                <li key={index} className="flex items-start gap-2 text-muted-foreground">
                                  <CheckCircle className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-t border-border pt-6">
                            <h4 className="font-semibold text-foreground mb-4">Apply for this Position</h4>
                            <form onSubmit={handleApply} className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="name">Full Name *</Label>
                                  <Input
                                    id="name"
                                    placeholder="Your full name"
                                    value={applicationForm.name}
                                    onChange={(e) => setApplicationForm({...applicationForm, name: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="email">Email *</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={applicationForm.email}
                                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                                    required
                                  />
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="phone">Phone</Label>
                                  <Input
                                    id="phone"
                                    placeholder="+1 234 567 8900"
                                    value={applicationForm.phone}
                                    onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profileId">Global Career ID *</Label>
                                  <Input
                                    id="profileId"
                                    placeholder="TW-2026-ABC12"
                                    value={applicationForm.profileId}
                                    onChange={(e) => setApplicationForm({...applicationForm, profileId: e.target.value})}
                                    required
                                  />
                                  <p className="text-xs text-muted-foreground">Your verified profile replaces the need for a traditional CV/resume</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="portfolio">Portfolio / Website (optional)</Label>
                                <Input
                                  id="portfolio"
                                  placeholder="https://yourportfolio.com"
                                  value={applicationForm.portfolio}
                                  onChange={(e) => setApplicationForm({...applicationForm, portfolio: e.target.value})}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="coverLetter">Why do you want to join us?</Label>
                                <Textarea
                                  id="coverLetter"
                                  placeholder="Tell us about yourself and why you're interested in this role..."
                                  rows={4}
                                  value={applicationForm.coverLetter}
                                  onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                                />
                              </div>

                              <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    Submit Application
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                            </form>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Don't See the Right Role?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              We're always looking for talented people. Create your verified Global Career ID profile and reach out — no resume needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <a href="/register">
                  <Users className="w-5 h-5" />
                  Create Your Profile
                </a>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <a href="mailto:careers@globalcareerid.com">
                  <Mail className="w-5 h-5" />
                  Contact Us
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
