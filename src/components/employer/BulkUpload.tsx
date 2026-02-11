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
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface ParsedRow {
  profileId: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  startDate: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
  userId?: string;
}

interface BulkUploadProps {
  employerId: string;
  onComplete: () => void;
}

export function BulkUpload({ employerId, onComplete }: BulkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'Profile ID,Job Title,Department,Employment Type,Start Date\nTW-2024-XXXXX,Software Engineer,Engineering,full_time,2024-01-15\nTW-2024-YYYYY,Product Manager,Product,full_time,2024-02-01';
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

    // Skip header row
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        profileId: values[0]?.toUpperCase() || '',
        jobTitle: values[1] || '',
        department: values[2] || '',
        employmentType: values[3] || 'full_time',
        startDate: values[4] || '',
        status: 'pending' as const,
      };
    }).filter((row) => row.profileId && row.jobTitle);
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

    setParsedRows(rows);
    setIsOpen(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateRows = async () => {
    setIsValidating(true);
    
    const validatedRows = await Promise.all(
      parsedRows.map(async (row) => {
        // Validate profile ID exists
        const { data: profileData, error } = await supabase.rpc('get_public_profile_by_id', {
          profile_id_param: row.profileId,
        });

        const profile = profileData?.[0];

        if (error || !profile) {
          return { ...row, status: 'invalid' as const, error: 'Profile ID not found' };
        }

        // Validate employment type
        const validTypes = ['full_time', 'part_time', 'contract', 'internship'];
        if (!validTypes.includes(row.employmentType)) {
          return { ...row, status: 'invalid' as const, error: 'Invalid employment type' };
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.startDate)) {
          return { ...row, status: 'invalid' as const, error: 'Invalid date format (use YYYY-MM-DD)' };
        }

        return { ...row, status: 'valid' as const, userId: profile.user_id };
      })
    );

    setParsedRows(validatedRows);
    setIsValidating(false);
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'valid' && r.userId);
    
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setIsUploading(true);

    const records = validRows.map((row) => ({
      user_id: row.userId!,
      employer_id: employerId,
      job_title: row.jobTitle,
      department: row.department || null,
      employment_type: row.employmentType,
      start_date: row.startDate,
      status: 'pending',
    }));

    const { error } = await supabase.from('employment_records').insert(records);

    if (error) {
      toast.error('Failed to upload records');
      console.error('Bulk upload failed');
    } else {
      toast.success(`Successfully created ${validRows.length} employment records`);
      setIsOpen(false);
      setParsedRows([]);
      onComplete();
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
              Bulk Upload Preview
            </DialogTitle>
          </DialogHeader>

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
                  <TableHead>Profile ID</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {row.status === 'pending' && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {row.status === 'valid' && (
                        <Badge className="bg-verified/10 text-verified">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Valid
                        </Badge>
                      )}
                      {row.status === 'invalid' && (
                        <div className="flex items-center gap-1">
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Invalid
                          </Badge>
                          {row.error && (
                            <span className="text-xs text-destructive">{row.error}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.profileId}</TableCell>
                    <TableCell>{row.jobTitle}</TableCell>
                    <TableCell>{row.department || '-'}</TableCell>
                    <TableCell>{row.employmentType.replace('_', '-')}</TableCell>
                    <TableCell>{row.startDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invalidCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <p className="text-sm text-warning">
                {invalidCount} row(s) have errors and will be skipped during upload.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {parsedRows.some((r) => r.status === 'pending') ? (
              <Button onClick={validateRows} disabled={isValidating}>
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Validate All
              </Button>
            ) : (
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
