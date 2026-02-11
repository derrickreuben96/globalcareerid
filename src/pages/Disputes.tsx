import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileText, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const disputeSteps = [
  {
    number: '1',
    title: 'Identify the Issue',
    description: 'Review your employment records and identify any inaccuracies—wrong dates, incorrect job titles, or unauthorized records.'
  },
  {
    number: '2',
    title: 'Submit a Dispute',
    description: 'Go to your dashboard, select the record in question, and click "Raise Dispute." Provide details about what\'s incorrect.'
  },
  {
    number: '3',
    title: 'Admin Review',
    description: 'Our team reviews your dispute, contacts the employer if necessary, and investigates the claim thoroughly.'
  },
  {
    number: '4',
    title: 'Resolution',
    description: 'You\'ll receive an email notification with the outcome. If successful, the record will be corrected immediately.'
  }
];

export default function Disputes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Dispute Resolution
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Found an error in your employment records? We're here to help you get it corrected 
              through our fair and transparent dispute process.
            </p>
          </div>

          {/* When to Raise a Dispute */}
          <Card className="glass-card mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                When to Raise a Dispute
              </CardTitle>
              <CardDescription>
                You should raise a dispute if you notice any of the following issues:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Incorrect dates:</strong> Start or end dates don't match your actual employment
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Wrong job title:</strong> The role title doesn't reflect your actual position
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Unauthorized record:</strong> An employer you never worked for added a record
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Missing information:</strong> Important details about your role are missing or wrong
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Process Steps */}
          <div className="mb-12">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-8 text-center">
              How the Dispute Process Works
            </h2>
            <div className="space-y-6">
              {disputeSteps.map((step, index) => (
                <div key={step.number} className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-foreground">{step.number}</span>
                    </div>
                    {index < disputeSteps.length - 1 && (
                      <div className="w-0.5 h-12 bg-border mx-auto mt-2" />
                    )}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <Card className="glass-card mb-12">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Expected Timeline</h3>
                  <p className="text-muted-foreground">
                    Most disputes are resolved within <strong>5-10 business days</strong>. 
                    Complex cases may take longer. You'll receive email updates throughout the process.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center glass-card rounded-2xl p-8">
            <h3 className="text-xl font-display font-semibold text-foreground mb-4">
              Ready to Raise a Dispute?
            </h3>
            <p className="text-muted-foreground mb-6">
              {user 
                ? "Go to your dashboard to review your records and submit a dispute."
                : "Sign in to your account to view your employment records and raise a dispute."
              }
            </p>
            <Button asChild>
              <Link to={user ? "/dashboard" : "/login"}>
                {user ? "Go to Dashboard" : "Sign In to Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
