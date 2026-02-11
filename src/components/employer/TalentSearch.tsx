import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, MapPin, Loader2, X, Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Profile {
  profile_id: string;
  first_name: string;
  last_name: string;
  skills: string[];
  location: string | null;
  visibility: string;
  experience_level: string | null;
  availability: string | null;
}

interface Filters {
  location: string;
  experienceLevel: string;
  availability: string;
}

export function TalentSearch() {
  const [searchSkills, setSearchSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    location: '',
    experienceLevel: 'all',
    availability: 'all',
  });

  const addSkill = () => {
    if (!newSkill.trim() || searchSkills.includes(newSkill.trim().toLowerCase())) return;
    setSearchSkills([...searchSkills, newSkill.trim().toLowerCase()]);
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    setSearchSkills(searchSkills.filter(s => s !== skill));
  };

  const clearFilters = () => {
    setFilters({ location: '', experienceLevel: 'all', availability: 'all' });
  };

  const handleSearch = async () => {
    if (searchSkills.length === 0) {
      toast.error('Add at least one skill to search');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // Use secure RPC function to search public profiles (excludes PII like email/phone)
    const { data, error } = await supabase
      .rpc('search_public_profiles', {
        experience_filter: filters.experienceLevel,
        availability_filter: filters.availability,
      });

    if (error) {
      console.error('Profile search failed');
      toast.error('Failed to search profiles');
      setIsSearching(false);
      return;
    }

    // Filter profiles by skills and location (client-side for flexibility)
    let matchedProfiles = (data || []).filter(profile => {
      const profileSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
      return searchSkills.some(skill => 
        profileSkills.some((ps: string) => ps.includes(skill) || skill.includes(ps))
      );
    });

    // Apply location filter
    if (filters.location.trim()) {
      const locationSearch = filters.location.toLowerCase();
      matchedProfiles = matchedProfiles.filter(profile => 
        profile.location?.toLowerCase().includes(locationSearch)
      );
    }

    setResults(matchedProfiles);
    setIsSearching(false);
  };

  const copyProfileId = (profileId: string) => {
    navigator.clipboard.writeText(profileId);
    toast.success('Profile ID copied to clipboard');
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-xl font-display font-semibold text-foreground mb-2">
        Find Talent
      </h2>
      <p className="text-muted-foreground mb-6">
        Search for job seekers by their skills
      </p>

      {/* Skill Input */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill to search (e.g., React, Python)..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
          />
          <Button onClick={addSkill} size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {searchSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchSkills.map(skill => (
              <Badge 
                key={skill} 
                variant="secondary"
                className="flex items-center gap-1 pr-1 capitalize"
              >
                {skill}
                <button 
                  onClick={() => removeSkill(skill)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Advanced Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Advanced Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 p-4 bg-muted/50 rounded-xl">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="e.g., Nairobi, Remote..."
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience Level</label>
                <Select
                  value={filters.experienceLevel}
                  onValueChange={(value) => setFilters({ ...filters, experienceLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Level</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead / Principal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Availability</label>
                <Select
                  value={filters.availability}
                  onValueChange={(value) => setFilters({ ...filters, availability: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Status</SelectItem>
                    <SelectItem value="actively_looking">Actively Looking</SelectItem>
                    <SelectItem value="open_to_offers">Open to Offers</SelectItem>
                    <SelectItem value="not_looking">Not Looking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <Button onClick={handleSearch} disabled={searchSkills.length === 0 || isSearching}>
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search Talent
        </Button>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-4">
            {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
          </h3>
          
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map(profile => (
                <div 
                  key={profile.profile_id}
                  className="p-4 border border-border rounded-xl hover:shadow-card transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {profile.first_name} {profile.last_name}
                        </p>
                        {profile.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {profile.location}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(profile.skills || []).slice(0, 5).map((skill: string) => (
                            <Badge 
                              key={skill} 
                              variant="outline" 
                              className={`text-xs ${
                                searchSkills.some(s => skill.toLowerCase().includes(s))
                                  ? 'border-primary text-primary'
                                  : ''
                              }`}
                            >
                              {skill}
                            </Badge>
                          ))}
                          {(profile.skills || []).length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profile.experience_level && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {profile.experience_level.replace('_', ' ')} level
                            </Badge>
                          )}
                          {profile.availability && profile.availability !== 'not_looking' && (
                            <Badge 
                              variant={profile.availability === 'actively_looking' ? 'default' : 'outline'}
                              className="text-xs capitalize"
                            >
                              {profile.availability.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyProfileId(profile.profile_id)}
                    >
                      Copy ID
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No profiles found with those skills.</p>
              <p className="text-sm">Try different or broader skill terms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
