import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, ArrowRight, ArrowLeft, User, Target, Lightbulb, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  firstName: string;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: User },
  { id: 'experience', title: 'Experience', icon: Target },
  { id: 'skills', title: 'Skills', icon: Sparkles },
  { id: 'profile', title: 'Profile', icon: FileText },
];

export function AIOnboardingWizard({ isOpen, onClose, userId, firstName }: AIOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [interests, setInterests] = useState('');
  const [bio, setBio] = useState('');
  
  // AI suggestions
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [profileTips, setProfileTips] = useState<{ tip: string; explanation: string }[]>([]);
  const [suggestedBio, setSuggestedBio] = useState('');

  const callAI = async (step: string, data: Record<string, unknown>) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ step, data }),
        }
      );

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('AI call failed:', error);
      return null;
    }
  };

  // Load welcome message on open
  useEffect(() => {
    if (isOpen && currentStep === 0 && !welcomeMessage) {
      setIsLoading(true);
      callAI('welcome', { firstName }).then((result) => {
        if (result) setWelcomeMessage(result);
        setIsLoading(false);
      });
    }
  }, [isOpen, currentStep, firstName, welcomeMessage]);

  const handleNext = async () => {
    if (currentStep === 1) {
      // After experience step, get skill recommendations
      setIsLoading(true);
      const result = await callAI('skill_recommendations', {
        jobTitle,
        experienceLevel,
        interests,
      });
      if (result) {
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            setSuggestedSkills(parsed);
          }
        } catch {
          // If not JSON, try to extract skills from text
          const skills = result.split(',').map((s: string) => s.trim()).filter(Boolean);
          setSuggestedSkills(skills.slice(0, 8));
        }
      }
      setIsLoading(false);
    }

    if (currentStep === 2) {
      // After skills step, get profile tips and bio suggestion
      setIsLoading(true);
      const [tipsResult, bioResult] = await Promise.all([
        callAI('profile_tips', { experienceLevel, industry }),
        callAI('bio_suggestion', { firstName, experienceLevel, jobTitle }),
      ]);

      if (tipsResult) {
        try {
          const parsed = JSON.parse(tipsResult);
          if (Array.isArray(parsed)) {
            setProfileTips(parsed);
          }
        } catch {
          setProfileTips([]);
        }
      }

      if (bioResult) {
        setSuggestedBio(bioResult.replace(/"/g, ''));
      }
      setIsLoading(false);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          experience_level: experienceLevel,
          bio: bio || suggestedBio || null,
          skills: selectedSkills,
        })
        .eq('user_id', userId);

      toast.success('Profile setup complete!');
      onClose();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI-Powered Profile Setup
          </DialogTitle>
          <DialogDescription>
            Let our AI help you create a standout Global Career ID profile
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{STEPS[currentStep].title}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                    index < currentStep
                      ? "bg-accent text-accent-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">AI is thinking...</p>
            </div>
          ) : (
            <>
              {/* Welcome Step */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <p className="text-lg text-foreground">
                      {welcomeMessage || `Welcome to Global Career ID, ${firstName}! Let's set up your verified professional profile.`}
                    </p>
                  </div>
                  <p className="text-center text-muted-foreground">
                    This quick wizard will help you create a profile that stands out to employers.
                  </p>
                </div>
              )}

              {/* Experience Step */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Experience Level</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                        <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                        <SelectItem value="senior">Senior (6-10 years)</SelectItem>
                        <SelectItem value="lead">Lead / Manager (10+ years)</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Current or Desired Job Title</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g., Software Engineer, Marketing Manager"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g., Technology, Healthcare, Finance"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Career Interests (optional)</Label>
                    <Textarea
                      className="mt-1"
                      placeholder="What are you passionate about professionally?"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Skills Step */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>AI-suggested skills based on your profile</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedSkills.includes(skill) && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => toggleSkill(skill)}
                      >
                        {selectedSkills.includes(skill) && <Check className="w-3 h-3 mr-1" />}
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {suggestedSkills.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Enter your job title in the previous step to get personalized skill suggestions.
                    </p>
                  )}
                  <div className="pt-4 border-t border-border">
                    <Label>Add custom skills</Label>
                    <Input
                      className="mt-1"
                      placeholder="Type a skill and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const value = input.value.trim();
                          if (value && !selectedSkills.includes(value)) {
                            setSelectedSkills([...selectedSkills, value]);
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  {selectedSkills.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Selected ({selectedSkills.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedSkills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Step */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {profileTips.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-warning" />
                        Profile Tips
                      </Label>
                      <div className="space-y-2">
                        {profileTips.map((item, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium text-sm text-foreground">{item.tip}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center gap-2">
                      Professional Bio
                      {suggestedBio && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Suggested
                        </Badge>
                      )}
                    </Label>
                    <Textarea
                      className="mt-1"
                      placeholder="Write a short professional bio..."
                      value={bio || suggestedBio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                    />
                    {suggestedBio && !bio && (
                      <p className="text-xs text-muted-foreground mt-1">
                        This is an AI-generated suggestion. Feel free to edit it!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isLoading}>
              <Check className="w-4 h-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
