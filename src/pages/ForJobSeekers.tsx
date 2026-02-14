import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  FileCheck, 
  AlertCircle, 
  TrendingUp,
  UserCheck,
  QrCode,
  Lock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const benefits = [
  {
    icon: Shield,
    title: 'Own a Verified Professional Identity',
    description: 'Your Global Career ID is your official professional passport. Every employment record is verified by actual employers, giving you an authentic identity that stands out.',
  },
  {
    icon: FileCheck,
    title: 'Apply Safely and Confidently',
    description: 'No more sending CVs that can be questioned. Share your Profile ID and let recruiters see your verified work history instantly. Your claims are backed by proof.',
  },
  {
    icon: AlertCircle,
    title: 'Protect Your Record with Dispute Management',
    description: 'If an employer adds incorrect information, you can raise a dispute. Our fair review process ensures your record remains accurate and trustworthy.',
  },
  {
    icon: TrendingUp,
    title: 'Build a Trusted Career Reputation',
    description: 'Every verified role adds to your professional credibility. Over time, your Global Career ID becomes a powerful testament to your career journey.',
  },
  {
    icon: UserCheck,
    title: 'Maintain Your Own Global Career ID',
    description: 'Showcase your leadership, achievements, and career history in one place. Your Global Career ID grows with you, becoming more valuable with each verified role.',
  }
];

const features = [
  {
    icon: QrCode,
    title: 'Instant Sharing',
    description: 'Share your profile via ID, QR code, or direct link'
  },
  {
    icon: Lock,
    title: 'Privacy Control',
    description: 'You decide who can see your verified history'
  },
  {
    icon: CheckCircle,
    title: 'Free Forever',
    description: 'Global Career ID is completely free for job seekers'
  }
];

export default function ForJobSeekers() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">For Job Seekers & Employees</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            Your Career, <span className="text-primary">Verified</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Own your professional identity. Build trust with every verified role. 
            Apply confidently knowing your work history speaks for itself.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                Get Your Global Career ID
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/how-it-works">Learn How It Works</Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 mb-20">
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
            Why Global Career ID for Job Seekers?
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={benefit.title} 
                className="glass-card overflow-hidden animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-[120px_1fr] gap-0">
                    <div className="bg-primary/5 p-6 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                        <benefit.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="p-6 md:p-8">
                      <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Row */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
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
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="glass-card rounded-3xl p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Start Building Your Verified Career Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of professionals who trust Global Career ID to showcase their authentic work history.
            </p>
            <Button size="lg" asChild>
              <Link to="/register">
                <UserCheck className="w-5 h-5 mr-2" />
                Create Your Free Profile
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}