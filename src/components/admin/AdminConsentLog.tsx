import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

interface ConsentLogRow {
  id: string;
  user_id: string | null;
  consent_type: string;
  granted: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email: string | null;
}

const PAGE_SIZE = 200;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function AdminConsentLog() {
  const [rows, setRows] = useState<ConsentLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [consentType, setConsentType] = useState<string>("all");
  const [granted, setGranted] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_consent_logs_admin", {
      search_term: search.trim() || null,
      consent_type_filter: consentType === "all" ? null : consentType,
      granted_filter: granted === "all" ? null : granted === "true",
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate + "T23:59:59").toISOString() : null,
      result_limit: PAGE_SIZE,
      result_offset: 0,
    });

    if (error) {
      toast.error("Failed to load consent logs", { description: error.message });
      setRows([]);
    } else {
      setRows((data as ConsentLogRow[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consentTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.consent_type));
    return Array.from(set);
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    const headers = [
      "id",
      "created_at",
      "consent_type",
      "granted",
      "user_id",
      "user_email",
      "ip_address",
      "user_agent",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.created_at,
          r.consent_type,
          r.granted,
          r.user_id ?? "",
          r.user_email ?? "",
          r.ip_address ?? "",
          r.user_agent ?? "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consent-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} record(s)`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-display">Consent Log</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            GDPR consent records including IP address and user agent. Showing up to {PAGE_SIZE} most recent matches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={isLoading || rows.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search IP, email, user agent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchRows();
              }}
              className="pl-9"
            />
          </div>
          <Select value={consentType} onValueChange={setConsentType}>
            <SelectTrigger>
              <SelectValue placeholder="Consent type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {consentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={granted} onValueChange={setGranted}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="true">Granted</SelectItem>
              <SelectItem value="false">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={fetchRows} disabled={isLoading}>
            Apply filters
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setConsentType("all");
              setGranted("all");
              setStartDate("");
              setEndDate("");
              setTimeout(fetchRows, 0);
            }}
          >
            Reset
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No consent records match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>User agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">{r.consent_type}</TableCell>
                      <TableCell>
                        <Badge variant={r.granted ? "default" : "secondary"}>
                          {r.granted ? "Granted" : "Withdrawn"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.user_email ?? (
                          <span className="text-muted-foreground italic">anonymous</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.ip_address ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={r.user_agent ?? ""}>
                        {r.user_agent ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} record(s). Refine filters to narrow results before exporting.
        </p>
      </CardContent>
    </Card>
  );
}
