import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { attachCareerEmployers } from '@/lib/careerEmployerIdentity';

describe('career company identity', () => {
  beforeEach(() => rpc.mockReset());
  it('retains Trolley for ended records and Global Career ID for current records', async () => {
    rpc.mockResolvedValue({ data: [
      { id: 'trolley', company_name: 'TROLLEY GENERAL LIMITED' },
      { id: 'gcid', company_name: 'GLOBAL CAREER ID' },
    ], error: null });
    const records = await attachCareerEmployers([
      { employer_id: 'trolley', status: 'ended' },
      { employer_id: 'gcid', status: 'active' },
    ]);
    expect(records.map(r => r.employer.company_name)).toEqual(['TROLLEY GENERAL LIMITED', 'GLOBAL CAREER ID']);
    expect(rpc).toHaveBeenCalledWith('get_career_employer_identity', { employer_ids: ['trolley', 'gcid'] });
  });
  it('does not create unknown-company snapshots when company access fails', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(attachCareerEmployers([{ employer_id: 'trolley' }])).rejects.toThrow('Company details could not be loaded');
  });
  it('preserves separate roles at the same company', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'trolley', company_name: 'TROLLEY GENERAL LIMITED' }], error: null });
    const records = await attachCareerEmployers([{ id: 'first', employer_id: 'trolley' }, { id: 'second', employer_id: 'trolley' }]);
    expect(records.map(r => r.id)).toEqual(['first', 'second']);
    expect(rpc.mock.calls[0][1].employer_ids).toEqual(['trolley']);
  });
});