import { supabase } from '@/integrations/supabase/client';

/** Resolve only career-related company branding; never query private employer rows. */
export async function attachCareerEmployers<T extends { employer_id: string }>(records: T[]) {
  if (!records.length) return [];
  const { data, error } = await supabase.rpc('get_career_employer_identity', {
    employer_ids: [...new Set(records.map(record => record.employer_id))],
  });
  if (error) throw error;
  const employers = new Map((data || []).map(employer => [employer.id, employer]));
  return records.map(record => {
    const employer = employers.get(record.employer_id);
    if (!employer?.company_name.trim()) {
      throw new Error('Company details could not be loaded. Please retry.');
    }
    return { ...record, employer };
  });
}