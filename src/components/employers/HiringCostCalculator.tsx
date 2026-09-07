import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';

/**
 * Estimates the cost of manual reference checking using the employer's OWN
 * numbers. Every assumption is an editable input — nothing is invented or
 * presented as an industry statistic.
 */
export function HiringCostCalculator() {
  const [hiresPerMonth, setHiresPerMonth] = useState('10');
  const [refsPerHire, setRefsPerHire] = useState('2');
  const [minutesPerRef, setMinutesPerRef] = useState('45');
  const [hourlyCost, setHourlyCost] = useState('25');

  const result = useMemo(() => {
    const hires = Math.max(0, Number(hiresPerMonth) || 0);
    const refs = Math.max(0, Number(refsPerHire) || 0);
    const minutes = Math.max(0, Number(minutesPerRef) || 0);
    const rate = Math.max(0, Number(hourlyCost) || 0);

    const monthlyHours = (hires * refs * minutes) / 60;
    return {
      monthlyHours,
      monthlyCost: monthlyHours * rate,
      annualHours: monthlyHours * 12,
      annualCost: monthlyHours * rate * 12,
    };
  }, [hiresPerMonth, refsPerHire, minutesPerRef, hourlyCost]);

  const fmtHours = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-display font-semibold text-foreground">
          What manual reference checking costs you
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your own numbers. Nothing is sent anywhere — this calculates in your browser.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="calc-hires">Hires per month</Label>
          <Input
            id="calc-hires"
            type="number"
            min={0}
            value={hiresPerMonth}
            onChange={(e) => setHiresPerMonth(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-refs">Reference checks per hire</Label>
          <Input
            id="calc-refs"
            type="number"
            min={0}
            value={refsPerHire}
            onChange={(e) => setRefsPerHire(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-minutes">Minutes spent per check</Label>
          <Input
            id="calc-minutes"
            type="number"
            min={0}
            value={minutesPerRef}
            onChange={(e) => setMinutesPerRef(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-rate">Cost per recruiter hour</Label>
          <Input
            id="calc-rate"
            type="number"
            min={0}
            value={hourlyCost}
            onChange={(e) => setHourlyCost(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Per month
          </p>
          <p className="text-2xl font-display font-bold text-foreground">
            {fmtHours(result.monthlyHours)} hours
          </p>
          <p className="text-sm text-muted-foreground">≈ {fmtMoney(result.monthlyCost)} in time</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Per year
          </p>
          <p className="text-2xl font-display font-bold text-foreground">
            {fmtHours(result.annualHours)} hours
          </p>
          <p className="text-sm text-muted-foreground">≈ {fmtMoney(result.annualCost)} in time</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        With Global Career ID this work happens once, when the employer records the role — a
        recruiter then verifies a Career ID in a single lookup.
      </p>
    </div>
  );
}
