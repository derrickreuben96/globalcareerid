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

const BATCH_SIZE = 50;
const REQUIRED_HEADERS = ['full name', 'email', 'role title', 'start date'];

export function BulkUpload({ employerId, onComplete }: BulkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'Full Name,Email,Role Title,Start Date,End Date,Department\nJane Doe,jane@example.com,Software Engineer,15-01-2024,,Engineering\nJohn Smith,john@example.com,Product Manager,01-02-2024,31-12-2024,Product';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateCSVStructure = (lines: string[]): { valid: boolean; error?: string } => {
    if (lines.length < 2) {
      return { valid: false, error: 'CSV must have a header row and at least one data row' };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    for (const required of REQUIRED_HEADERS) {
      if (!headers.some(h => h.includes(required))) {
        return { valid: false, error: `Missing required column: "${required}". Expected columns: Full Name, Email, Role Title, Start Date, End Date, Department` };
      }
    }

    return { valid: true };
  };

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split('\n');
    
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
    }).filter((row) => row.fullName || row.email || row.roleTitle);
  };

  const validateRows = (rows: ParsedRow[]): ParsedRow[] => {
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return rows.map((row) => {
      if (!row.fullName.trim()) {
        return { ...row, status: 'invalid' as const, error: 'Missing full name' };
      }
      if (!emailRegex.test(row.email)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid email' };
      }
      if (!row.roleTitle.trim()) {
        return { ...row, status: 'invalid' as const, error: 'Missing role title' };
      }
      if (!dateRegex.test(row.startDate)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid start date (DD-MM-YYYY)' };
      }
      if (row.endDate && !dateRegex.test(row.endDate)) {
        return { ...row, status: 'invalid' as const, error: 'Invalid end date (DD-MM-YYYY)' };
      }
      return { ...row, status: 'valid' as const };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const content = await file.text();
    const lines = content.trim().split('\n');

    // Validate CSV structure first
    const structureCheck = validateCSVStructure(lines);
    if (!structureCheck.valid) {
      toast.error(structureCheck.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const rows = parseCSV(content);
    
    if (rows.length === 0) {
      toast.error('No data rows found in CSV');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validated = validateRows(rows);
    setParsedRows(validated);
    setResults(null);
    setUploadProgress('');
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
    const allResults: UploadResult[] = [];
    let hasError = false;

    try {
      // Process in batches of BATCH_SIZE
      const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const batch = validRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        setUploadProgress(`Processing batch ${i + 1} of ${totalBatches} (${allResults.length}/${validRows.length} rows done)...`);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error('Session expired. Please sign in again.');
          setIsUploading(false);
          return;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/bulk-upload-employees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            employerId,
            rows: batch.map((r) => {
              // Convert DD-MM-YYYY to YYYY-MM-DD for database
              const convertDate = (d: string) => {
                const [day, month, year] = d.split('-');
                return `${year}-${month}-${day}`;
              };
              return {
                fullName: r.fullName,
                email: r.email,
                roleTitle: r.roleTitle,
                startDate: convertDate(r.startDate),
                endDate: r.endDate ? convertDate(r.endDate) : undefined,
                department: r.department || undefined,
              };
            }),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMsg = `Batch ${i + 1} failed (HTTP ${response.status})`;
          try {
            const parsed = JSON.parse(errorBody);
            errorMsg = parsed.error || errorMsg;
          } catch {}
          
          toast.error(errorMsg);
          hasError = true;
          break;
        }

        const data = await response.json();
        
        if (data.results) {
          allResults.push(...data.results);
        }

        // Check if batch had critical errors that should stop processing
        const batchErrors = data.results?.filter((r: UploadResult) => r.status === 'error') || [];
        if (batchErrors.length === batch.length) {
          toast.error('All rows in batch failed. Stopping upload.');
          hasError = true;
          break;
        }
      }

      setResults(allResults);
      
      const created = allResults.filter((r) => r.status === 'created').length;
      const attached = allResults.filter((r) => r.status === 'attached').length;
      const errors = allResults.filter((r) => r.status === 'error').length;

      if (hasError) {
        toast.error(`Upload stopped. ${created} created, ${attached} attached, ${errors} errors.`);
      } else {
        toast.success(`Done! ${created} new profiles created, ${attached} attached to existing, ${errors} errors.`);
      }
      
      onComplete();
    } catch (err) {
      console.error('Bulk upload error:', err);
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Network error'));
      if (allResults.length > 0) {
        setResults(allResults);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
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

      <Dialog open={isOpen} onOpenChange={(open) => { if (!isUploading) setIsOpen(open); }}>
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

              {isUploading && uploadProgress && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-sm text-primary">{uploadProgress}</p>
                </div>
              )}

              <div className="p-3 bg-muted/30 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> Employees with existing Career IDs (matched by email) will have the new role attached. 
                  New employees will get a Career ID created automatically. Rows are processed in batches of {BATCH_SIZE}.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 py-2">
                <Badge className="bg-verified/10 text-verified">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {results.filter(r => r.status === 'created').length} created
                </Badge>
                <Badge variant="secondary">
                  <Link2 className="w-3 h-3 mr-1" />
                  {results.filter(r => r.status === 'attached').length} attached
                </Badge>
                {results.filter(r => r.status === 'error').length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    {results.filter(r => r.status === 'error').length} errors
                  </Badge>
                )}
              </div>
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
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { if (!isUploading) { setIsOpen(false); setResults(null); } }} disabled={isUploading}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            {!results && (
              <Button
                onClick={handleUpload}
                disabled={isUploading || validCount === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {validCount} Records
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
