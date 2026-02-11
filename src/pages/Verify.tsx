import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmploymentTimeline } from '@/components/EmploymentTimeline';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Shield, User, Calendar, CheckCircle, Eye, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  skills: string[];
}

interface EmploymentRecord {
  id: string;
  user_id: string;
  job_title: string;
  department: string | null;
  employment_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  employer: {
    id: string;
    company_name: string;
    is_verified: boolean;
  };
}

export default function Verify() {
  const { profileId: urlProfileId } = useParams();
  const [searchId, setSearchId] = useState(urlProfileId || '');
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (urlProfileId) {
      handleSearch(urlProfileId);
    }
  }, [urlProfileId]);

  const handleSearch = async (id?: string) => {
    const searchValue = (id || searchId).toUpperCase();
    setIsLoading(true);
    setHasSearched(true);

    // Search for profile by profile_id using secure RPC function (excludes PII)
    const { data: profileResults } = await supabase
      .rpc('get_public_profile_by_id', { profile_id_param: searchValue });
    
    const profileData = profileResults && profileResults.length > 0 ? profileResults[0] : null;

    if (profileData) {
      setFoundProfile(profileData);

      // Fetch employment records using the new RPC function that bypasses visibility check
      const { data: recordsData } = await supabase
        .rpc('get_employment_by_profile_id', { profile_id_param: searchValue });

      // Transform the RPC result to match our interface
      const transformedRecords = (recordsData || []).map((r: any) => ({
        id: r.id,
        user_id: profileData.user_id,
        job_title: r.job_title,
        department: r.department,
        employment_type: r.employment_type,
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
        employer: {
          id: r.employer_id,
          company_name: r.employer_name,
          is_verified: r.employer_verified,
        },
      }));

      setRecords(transformedRecords);
    } else {
      setFoundProfile(null);
      setRecords([]);
    }

    setIsLoading(false);
  };

  // Transform records for the timeline component
  const timelineRecords = records.map(r => ({
    id: r.id,
    userId: r.user_id,
    employerId: r.employer?.id || '',
    jobTitle: r.job_title,
    department: r.department || undefined,
    employmentType: r.employment_type as 'full_time' | 'part_time' | 'contract' | 'internship',
    startDate: r.start_date,
    endDate: r.end_date || undefined,
    status: r.status as 'active' | 'ended' | 'disputed' | 'pending',
    employerName: r.employer?.company_name || 'Unknown Company',
    employerVerified: r.employer?.is_verified || false,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Search Header */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Verify a Profile
              </h1>
              <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
                Enter a Profile ID to instantly access verified employment history. 
                No more chasing references.
              </p>
            </div>

            {/* Search Box */}
            <div className="glass-card rounded-2xl p-6 mb-8">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Enter Profile ID (e.g., TW-2024-78432)"
                    className="pl-12 h-14 text-lg font-mono"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button size="lg" className="h-14 px-8" onClick={() => handleSearch()} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Results */}
            {hasSearched && !isLoading && (
              <>
                {foundProfile ? (
                  <div className="animate-fade-in">
                    {/* Profile Header */}
                    <div className="glass-card rounded-2xl p-8 mb-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-2xl font-display font-bold text-foreground">
                                {foundProfile.first_name} {foundProfile.last_name}
                              </h2>
                              {records.length > 0 && <VerifiedBadge variant="inline" />}
                            </div>
                            <p className="text-muted-foreground font-mono">
                              {foundProfile.profile_id}
                            </p>
                          </div>
                        </div>
                        {records.length > 0 && <VerifiedBadge variant="large" label="Verified Profile" />}
                      </div>

                      {/* Skills */}
                      {foundProfile.skills && foundProfile.skills.length > 0 && (
                        <div className="mb-6">
                          <p className="text-sm text-muted-foreground mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {foundProfile.skills.map(skill => (
                              <Badge key={skill} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <CheckCircle className="w-5 h-5 text-verified" />
                            <span className="text-2xl font-display font-bold text-foreground">
                              {records.length}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Verified Records</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="text-2xl font-display font-bold text-foreground">
                              {records.length > 0 ? new Date(records[records.length - 1].start_date).getFullYear() : '-'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Career Since</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Eye className="w-5 h-5 text-primary" />
                            <span className="text-2xl font-display font-bold text-foreground">
                              Read-only
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Access Level</p>
                        </div>
                      </div>
                    </div>

                    {/* Employment History */}
                    <div className="glass-card rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-display font-semibold text-foreground">
                            Employment History
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            All records verified by employers
                          </p>
                        </div>
                      </div>
                      
                      {records.length > 0 ? (
                        <EmploymentTimeline records={timelineRecords} />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No employment records available yet.
                        </p>
                      )}
                    </div>

                    {/* Trust Notice */}
                    <div className="mt-6 p-4 bg-verified/5 border border-verified/20 rounded-xl flex items-start gap-3">
                      <Shield className="w-5 h-5 text-verified mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Verified Employment Data</p>
                        <p className="text-sm text-muted-foreground">
                          All records shown above were added directly by verified employers. 
                          This profile owner cannot modify employment history.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      Profile Not Found
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We couldn't find a profile with ID "{searchId}". 
                      Please check the ID and try again, or ask the candidate for the correct Profile ID.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Demo Hint */}
            {!hasSearched && (
              <div className="text-center text-sm text-muted-foreground">
                <p>Enter a Profile ID to verify employment history</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
