import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-display font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 23, 2026</p>
          
          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Global Career ID ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully to understand our practices regarding your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Full name, email address, and phone number</li>
                    <li>Employment history and job titles</li>
                    <li>Skills and professional qualifications</li>
                    <li>Profile photo (optional)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Employer Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Company name and registration details</li>
                    <li>Industry and business information</li>
                    <li>Contact information for verification</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To create and manage your Global Career ID profile</li>
                <li>To verify employment records with employers</li>
                <li>To enable profile sharing with recruiters and employers</li>
                <li>To process dispute resolutions</li>
                <li>To send important notifications about your account</li>
                <li>To improve our services and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">4. Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>With Your Consent:</strong> When you share your Profile ID or QR code</li>
                <li><strong>With Verified Employers:</strong> To add or update employment records</li>
                <li><strong>Legal Requirements:</strong> When required by law or legal process</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">5. Your Rights</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data at any time</li>
                <li>Request correction of inaccurate information</li>
                <li>Control profile visibility settings</li>
                <li>Raise disputes on employment records</li>
                <li>Delete your account (subject to legal retention requirements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">6. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your data. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-foreground font-medium mt-2">
                Email: privacy@globalcareerid.com<br />
                Address: Global Career ID HQ, Business District, Nairobi, Kenya
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}