import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISkillSuggestionsProps {
  currentSkills: string[];
  onAddSkill: (skill: string) => void;
}

export function AISkillSuggestions({ currentSkills, onAddSkill }: AISkillSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');

  const getSuggestions = async (title: string) => {
    if (!title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await supabase.functions.invoke('suggest-skills', {
        body: { jobTitle: title, currentSkills },
      });

      if (response.error) {
        throw response.error;
      }

      const skills = response.data?.skills || [];
      setSuggestions(skills.filter((s: string) => !currentSkills.includes(s)));
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get skill suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSkill = (skill: string) => {
    onAddSkill(skill);
    setSuggestions(prev => prev.filter(s => s !== skill));
  };

  return (
    <div className="border border-dashed border-primary/30 rounded-xl p-4 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">AI Skill Suggestions</span>
      </div>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Enter a job title (e.g., Software Engineer)"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && getSuggestions(jobTitle)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button 
          size="sm" 
          onClick={() => getSuggestions(jobTitle)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Suggest
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map(skill => (
            <Badge 
              key={skill} 
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1 pr-1"
              onClick={() => handleAddSkill(skill)}
            >
              {skill}
              <Plus className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Enter your job title to get AI-powered skill suggestions
        </p>
      )}
    </div>
  );
}
