import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  UserCheck, 
  Building2, 
  Shield, 
  FileText, 
  AlertCircle, 
  Settings,
  Search,
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';

const helpCategories = [
  {
    icon: UserCheck,
    title: 'Getting Started',
    description: 'Learn how to create your Global Career ID profile and get verified',
    articles: [
      'How to create a Global Career ID account',
      'Setting up your professional profile',
      'Understanding your Profile ID',
      'Sharing your profile with employers'
    ]
  },
  {
    icon: Building2,
    title: 'For Employers',
    description: 'Managing employees and adding employment records',
    articles: [
      'Registering as an employer',
      'Employer verification process',
      'Adding new employees',
      'Ending employment records'
    ]
  },
  {
    icon: Shield,
    title: 'Verification',
    description: 'Understanding the verification process',
    articles: [
      'How verification works',
      'What employers can see',
      'Verification badges explained',
      'Maintaining verified status'
    ]
  },
  {
    icon: FileText,
    title: 'Profile Management',
    description: 'Updating and managing your professional profile',
    articles: [
      'Editing your profile information',
      'Adding skills and qualifications',
      'Privacy and visibility settings',
      'Downloading your work history'
    ]
  },
  {
    icon: AlertCircle,
    title: 'Disputes',
    description: 'How to handle incorrect employment records',
    articles: [
      'When to raise a dispute',
      'How to submit a dispute',
      'Dispute review process',
      'What happens after resolution'
    ]
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Managing your account and preferences',
    articles: [
      'Changing your password',
      'Updating contact information',
      'Notification preferences',
      'Deactivating your account'
    ]
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">Help Center</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Find answers to your questions and learn how to make the most of Global Career ID.
            </p>
            
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                className="pl-12 h-14 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
            <Link to="/faq">
              <Card className="glass-card hover:shadow-elevated transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground">FAQs</h3>
                  <p className="text-sm text-muted-foreground">Common questions answered</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/contact">
              <Card className="glass-card hover:shadow-elevated transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground">Contact Support</h3>
                  <p className="text-sm text-muted-foreground">Get help from our team</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/disputes">
              <Card className="glass-card hover:shadow-elevated transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground">Raise a Dispute</h3>
                  <p className="text-sm text-muted-foreground">Report incorrect records</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Help Categories */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
              Browse by Category
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpCategories.map((category) => (
                <Card key={category.title} className="glass-card hover:shadow-elevated transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article}>
                          <button className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 w-full text-left">
                            <ArrowRight className="w-3 h-3" />
                            {article}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Still Need Help */}
          <div className="mt-16 text-center">
            <Card className="glass-card max-w-2xl mx-auto">
              <CardContent className="py-8">
                <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                  Still need help?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Our support team is ready to assist you with any questions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link to="/contact">Contact Support</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/faq">View FAQs</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}