import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageVisit } from '@/hooks/usePageVisit';
import { Briefcase, Building2, MapPin, Loader2, CheckCircle, Search } from 'lucide-react';
import { breadcrumbJsonLd, organizationJsonLd, SITE_URL } from '@/lib/structuredData';

interface PublicJob {
  id: string;
  title: string;
  description: string;
  role_category: string | null;
  location: string | null;
  application_deadline: string | null;
  created_at: string;
  employer_id: string;
  company_name: string;
  country: string | null;
  logo_url: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Application received',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview invited',
  hired: 'Hired',
  rejected: 'Not selected',
};

export default function Jobs() {
  usePageVisit('/jobs');
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [applications, setApplications] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_public_open_jobs');
      setJobs((data ?? []) as PublicJob[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setApplications({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('applications')
        .select('job_id, status')
        .eq('applicant_user_id', user.id);
      const map: Record<string, string> = {};
      (data ?? []).forEach((a) => { map[a.job_id] = a.status; });
      setApplications(map);
    })();
  }, [user]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company_name, j.role_category, j.location, j.country]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [jobs, query]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Verified Jobs Hiring Now | Global Career ID"
        description="Browse open roles from verified organizations and apply with your Career ID — no CV uploads, no unverified claims. Employers see your employer-verified employment history instantly."
        path="/jobs"
        jsonLd={[
          organizationJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Jobs', path: '/jobs' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Open roles from verified organizations',
            url: `${SITE_URL}/jobs`,
            numberOfItems: jobs.length,
          },
        ]}
      />
      <Header />

      <main className="pt-24 pb-16">
        <section className="py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Verified jobs, hiring now
            </h1>
            <p className="text-lg text-muted-foreground">
              Every role here is posted by an organization we have verified. Apply with your Career
              ID and your employer-verified history goes with the application.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by role, company, or location"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search jobs"
              />
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin inline-block text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-3">
                <Briefcase className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-foreground font-medium">No open roles match that search.</p>
                <p className="text-sm text-muted-foreground">
                  New roles are added as verified organizations post them.
                </p>
              </div>
            ) : (
              visible.map((job) => {
                const status = applications[job.id];
                return (
                  <article key={job.id} className="glass-card rounded-2xl p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {job.logo_url ? (
                            <img
                              src={job.logo_url}
                              alt={`${job.company_name} logo`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-display font-semibold text-foreground">
                            {job.title}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {job.company_name}
                            {job.country ? ` · ${job.country}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {job.role_category && (
                              <Badge variant="secondary">{job.role_category}</Badge>
                            )}
                            {job.location && (
                              <Badge variant="outline" className="gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                              </Badge>
                            )}
                            {job.application_deadline && (
                              <Badge variant="outline">
                                Closes {new Date(job.application_deadline).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {status ? (
                          <>
                            <Badge className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {STATUS_LABELS[status] ?? status}
                            </Badge>
                            <Button asChild variant="outline" size="sm">
                              <Link to="/dashboard">Track application</Link>
                            </Button>
                          </>
                        ) : (
                          <Button asChild>
                            <Link to={`/apply?job_id=${job.id}`}>Apply with Career ID</Link>
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4 line-clamp-4 whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
