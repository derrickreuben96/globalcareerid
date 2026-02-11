import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 23, 2026</p>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using WorkID, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, including job seekers, employers, and recruiters.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                WorkID is a centralized employment verification platform that allows:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
                <li>Job seekers to maintain a verified professional profile</li>
                <li>Employers to add and verify employment records</li>
                <li>Recruiters to verify candidate work history instantly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. User Accounts</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Job Seekers</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Must provide accurate personal information</li>
                    <li>Cannot add or modify their own employment records</li>
                    <li>May dispute inaccurate records through proper channels</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Employers</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Must complete verification process</li>
                    <li>Responsible for accuracy of employment records added</li>
                    <li>Must update records when employees leave</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">4. Prohibited Activities</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Providing false or misleading information</li>
                <li>Attempting to manipulate employment records</li>
                <li>Using the platform for fraudulent purposes</li>
                <li>Accessing others' accounts without authorization</li>
                <li>Violating any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">5. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users may raise disputes regarding employment records through our platform. Our admin team will review disputes fairly and make decisions based on available evidence. All parties involved will be notified of dispute outcomes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                WorkID provides employment verification services but does not guarantee employment outcomes. We are not liable for decisions made by employers or recruiters based on profile information. Users are responsible for the accuracy of information they provide.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">7. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms. Users may also choose to deactivate their accounts, subject to legal data retention requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">8. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms from time to time. Users will be notified of significant changes via email or platform notification. Continued use of WorkID after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">9. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, contact us at:
              </p>
              <p className="text-foreground font-medium mt-2">
                Email: legal@workid.com<br />
                Address: WorkID HQ, Business District, Nairobi, Kenya
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
