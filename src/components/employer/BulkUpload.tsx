import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Download,
  AlertTriangle,
  UserPlus,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';

interface ParsedRow {
  fullName: string;
  email: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
  department: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

interface UploadResult {
  email: string;
  fullName: string;
  roleTitle: string;
  status: 'created' | 'attached' | 'error';
  message: string;
  profileId?: string;
}

interface BulkUploadProps {
  employerId: string;
  onComplete: () => void;
}

export function BulkUpload({ employerId, onComplete }: BulkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'Full Name,Email,Role Title,Start Date,End Date,Department\nJane Doe,jane@example.com,Software Engineer,2024-01-15,,Engineering\nJohn Smith,john@example.com,Product Manager,2024-02-01,2024-12-31,Product';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        fullName: values[0] || '',
        email: values[1] || '',
        roleTitle: values[2] || '',
        startDate: values[3] || '',
        endDate: values[4] || '',
        department: values[5] || '',
        status: 'pending' as const,
      };
    }).filter((row) => row.fullName && row.email && row.roleTitle);
  };

  const validateRows = (rows: ParsedRow[]): ParsedRow[] => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return rows.map((row) => {
      if (!emailRegex.test(row.email)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid email' };
      }
      if (!dateRegex.test(row.startDate)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid start date (YYYY-MM-DD)' };
      }
      if (row.endDate && !dateRegex.test(row.endDate)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid end date (YYYY-MM-DD)' };
      }
      return { ...row, status: 'valid' as const };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const rows = parseCSV(content);
    
    if (rows.length === 0) {
      toast.error('No valid rows found in CSV');
      return;
    }

    const validated = validateRows(rows);
    setParsedRows(validated);
    setResults(null);
    setIsOpen(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'valid');
    
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setIsUploading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-upload-employees', {
        body: {
          employerId,
          rows: validRows.map((r) => ({
            fullName: r.fullName,
            email: r.email,
            roleTitle: r.roleTitle,
            startDate: r.startDate,
            endDate: r.endDate || undefined,
            department: r.department || undefined,
          })),
        },
      });

      if (error) {
        toast.error('Bulk upload failed: ' + error.message);
      } else {
        setResults(data.results);
        const { created, attached, errors } = data.summary;
        toast.success(`Done! ${created} new profiles created, ${attached} attached to existing, ${errors} errors.`);
        onComplete();
      }
    } catch (err) {
      toast.error('Bulk upload failed');
      console.error('Bulk upload error:', err);
    }

    setIsUploading(false);
  };

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4" />
          Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          Bulk Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {results ? 'Upload Results' : 'Bulk Upload Preview'}
            </DialogTitle>
          </DialogHeader>

          {!results ? (
            <>
              <div className="flex items-center gap-4 py-2">
                <Badge variant="secondary">{parsedRows.length} rows</Badge>
                {validCount > 0 && (
                  <Badge className="bg-verified/10 text-verified">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {validCount} valid
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role Title</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {row.status === 'valid' ? (
                            <Badge className="bg-verified/10 text-verified">
                              <CheckCircle className="w-3 h-3 mr-1" />Valid
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />Invalid
                              </Badge>
                              {row.error && <span className="text-xs text-destructive">{row.error}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell className="text-sm">{row.email}</TableCell>
                        <TableCell>{row.roleTitle}</TableCell>
                        <TableCell>{row.startDate}</TableCell>
                        <TableCell>{row.endDate || '-'}</TableCell>
                        <TableCell>{row.department || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {invalidCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <p className="text-sm text-warning">
                    {invalidCount} row(s) have errors and will be skipped.
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted/30 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> Employees with existing Career IDs (matched by email) will have the new role attached. 
                  New employees will get a Career ID created automatically.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Result</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {r.status === 'created' && (
                          <Badge className="bg-verified/10 text-verified">
                            <UserPlus className="w-3 h-3 mr-1" />New
                          </Badge>
                        )}
                        {r.status === 'attached' && (
                          <Badge variant="secondary">
                            <Link2 className="w-3 h-3 mr-1" />Attached
                          </Badge>
                        )}
                        {r.status === 'error' && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell>{r.roleTitle}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsOpen(false); setResults(null); }}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            {!results && (
              <Button
                onClick={handleUpload}
                disabled={isUploading || validCount === 0}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload {validCount} Records
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
