import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HiringCostCalculator } from '@/components/employers/HiringCostCalculator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ShieldCheck, Users, Zap } from 'lucide-react';
import { employerFaqs } from '@/content/geoContent';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
} from '@/lib/structuredData';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Stop unverifiable employment history',
    text: 'Every record on a candidate’s Career ID was written by the employer of record — not by the candidate.',
  },
  {
    icon: Zap,
    title: 'Verify in one lookup',
    text: 'No reference emails, no waiting on former employers. Enter the Career ID and read the verified timeline.',
  },
  {
    icon: Users,
    title: 'Onboard your existing team in bulk',
    text: 'Upload your employee list once. We create or attach Career IDs, skip duplicates, and email each employee.',
  },
];

export default function RequestDemo() {
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    work_email: '',
    phone: '',
    country: '',
    company_size: '',
    monthly_hires: '',
    current_method: '',
    message: '',
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.company_name.trim() || !form.contact_name.trim()) {
      toast.error('Please add your company and your name');
      return;
    }
    if (!EMAIL_RE.test(form.work_email.trim())) {
      toast.error('Please enter a valid work email address');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('employer_leads').insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      work_email: form.work_email.trim(),
      phone: form.phone.trim() || null,
      country: form.country.trim() || null,
      company_size: form.company_size || null,
      monthly_hires: form.monthly_hires ? Number(form.monthly_hires) : null,
      current_method: form.current_method || null,
      message: form.message.trim() || null,
      source: 'demo_page',
      status: 'new',
    });
    setSaving(false);

    if (error) {
      console.error('Employer lead submission failed', error.message);
      toast.error('We could not send that. Please try again or email us from the contact page.');
      return;
    }
    setSubmitted(true);
    toast.success('Request received — we will be in touch');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Request an Employer Demo | Global Career ID"
        description="Book a walkthrough of verified hiring for your organization: verify candidate employment instantly, onboard your existing employees, and post jobs that receive Career IDs instead of CVs."
        path="/for-employers/demo"
        jsonLd={[
          organizationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'For employers', path: '/for-employers' },
            { name: 'Request a demo', path: '/for-employers/demo' },
          ]),
          faqJsonLd(employerFaqs),
        ]}
      />
      <Header />

      <main className="pt-24">
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
                See verified hiring on your own roles
              </h1>
              <p className="text-xl text-muted-foreground">
                Tell us how you hire today and we will walk your team through verifying candidates,
                recording your own employees, and posting roles that receive Career IDs instead of
                CVs.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto items-start">
              <div className="space-y-6">
                {benefits.map((b) => (
                  <div key={b.title} className="flex gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-foreground mb-1">{b.title}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
                    </div>
                  </div>
                ))}
                <HiringCostCalculator />
              </div>

              <div className="glass-card rounded-2xl p-6 lg:sticky lg:top-24">
                {submitted ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-4" />
                    <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                      Request received
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Our team will reach out to {form.work_email} to arrange your walkthrough. You
                      can start exploring the platform in the meantime.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Button asChild>
                        <Link to="/register">Create an organization account</Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/for-employers">Employer features</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-display font-semibold text-foreground">
                      Request a demo
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company name *</Label>
                        <Input
                          id="company_name"
                          value={form.company_name}
                          onChange={(e) => set('company_name', e.target.value)}
                          maxLength={200}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Your name *</Label>
                        <Input
                          id="contact_name"
                          value={form.contact_name}
                          onChange={(e) => set('contact_name', e.target.value)}
                          maxLength={200}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_email">Work email *</Label>
                      <Input
                        id="work_email"
                        type="email"
                        value={form.work_email}
                        onChange={(e) => set('work_email', e.target.value)}
                        maxLength={320}
                        required
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(e) => set('phone', e.target.value)}
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={form.country}
                          onChange={(e) => set('country', e.target.value)}
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_size">Company size</Label>
                        <Select
                          value={form.company_size}
                          onValueChange={(v) => set('company_size', v)}
                        >
                          <SelectTrigger id="company_size">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1–10 employees</SelectItem>
                            <SelectItem value="11-50">11–50 employees</SelectItem>
                            <SelectItem value="51-200">51–200 employees</SelectItem>
                            <SelectItem value="201-1000">201–1,000 employees</SelectItem>
                            <SelectItem value="1000+">1,000+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly_hires">Hires per month</Label>
                        <Input
                          id="monthly_hires"
                          type="number"
                          min={0}
                          max={100000}
                          value={form.monthly_hires}
                          onChange={(e) => set('monthly_hires', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_method">How do you verify employment today?</Label>
                      <Select
                        value={form.current_method}
                        onValueChange={(v) => set('current_method', v)}
                      >
                        <SelectTrigger id="current_method">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reference_calls">Reference calls and emails</SelectItem>
                          <SelectItem value="background_check_vendor">
                            Background check vendor
                          </SelectItem>
                          <SelectItem value="reference_letters">Reference letters only</SelectItem>
                          <SelectItem value="no_verification">We do not verify today</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Anything specific you want to see?</Label>
                      <Textarea
                        id="message"
                        rows={3}
                        maxLength={4000}
                        value={form.message}
                        onChange={(e) => set('message', e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Request demo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We use these details only to contact you about Global Career ID. See our{' '}
                      <Link to="/privacy" className="text-primary hover:underline">
                        privacy policy
                      </Link>
                      .
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-4">
              Employer questions
            </h2>
            {employerFaqs.map((faq) => (
              <div key={faq.question} className="glass-card rounded-2xl p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
            <div className="text-center pt-4">
              <Button asChild variant="outline">
                <Link to="/pricing">See plans for organizations</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
