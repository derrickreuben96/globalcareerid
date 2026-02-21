import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Globe, 
  Phone, 
  MapPin, 
  Mail, 
  Briefcase,
  Edit2,
  Save,
  X,
  Upload,
  Loader2,
  Camera,
  Hash,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface Employer {
  id: string;
  employer_id: string;
  company_name: string;
  industry: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_verified: boolean;
  verification_status: string;
}

interface CompanyProfileEditorProps {
  employer: Employer;
  userEmail: string;
  userId: string;
  onUpdate: (updatedEmployer: Employer) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-verified" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export function CompanyProfileEditor({ employer, userEmail, userId, onUpdate }: CompanyProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    website: employer.website || '',
    phone: employer.phone || '',
    address: employer.address || '',
    industry: employer.industry || '',
    country: employer.country || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('employers')
        .update({
          website: formData.website.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          industry: formData.industry.trim() || null,
          country: formData.country.trim() || null,
        })
        .eq('id', employer.id);

      if (error) throw error;

      onUpdate({
        ...employer,
        website: formData.website.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        industry: formData.industry.trim() || null,
        country: formData.country.trim() || null,
      });

      toast.success('Company profile updated');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      website: employer.website || '',
      phone: employer.phone || '',
      address: employer.address || '',
      industry: employer.industry || '',
      country: employer.country || '',
    });
    setIsEditing(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/logo.${fileExt}`;

      // Delete old logo if exists
      if (employer.logo_url) {
        const oldPath = employer.logo_url.split('/company-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('company-logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update employer record
      const { error: updateError } = await supabase
        .from('employers')
        .update({ logo_url: publicUrl })
        .eq('id', employer.id);

      if (updateError) throw updateError;

      onUpdate({ ...employer, logo_url: publicUrl });
      toast.success('Company logo updated');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-semibold text-foreground">
          Company Profile
        </h2>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Company Logo */}
        <div className="flex items-center gap-6 pb-6 border-b border-border">
          <div className="relative">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
              {employer.logo_url ? (
                <img 
                  src={employer.logo_url} 
                  alt={`${employer.company_name} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-10 h-10 text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUploadingLogo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{employer.company_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                {employer.employer_id}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Click the camera icon to upload a logo</p>
            <p className="text-xs text-muted-foreground mt-1">Max 2MB, JPG or PNG recommended</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Employer ID - Read only with copy */}
          <div className="flex items-start gap-3">
            <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Employer ID</Label>
              <div className="flex items-center gap-2">
                <p className="font-mono font-medium text-primary">{employer.employer_id}</p>
                <CopyButton text={employer.employer_id} />
              </div>
            </div>
          </div>

          {/* Company Name - Read only */}
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Company Name</Label>
              <p className="font-medium text-foreground">{employer.company_name}</p>
            </div>
          </div>

          {/* Email - Read only */}
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium text-foreground">{userEmail || 'Not provided'}</p>
            </div>
          </div>

          {/* Website - Editable */}
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Website</Label>
              {isEditing ? (
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-foreground">
                  {employer.website ? (
                    <a href={employer.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {employer.website}
                    </a>
                  ) : 'Not provided'}
                </p>
              )}
            </div>
          </div>

          {/* Phone - Editable */}
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-foreground">{employer.phone || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Address - Editable */}
          <div className="flex items-start gap-3 md:col-span-2">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Address</Label>
              {isEditing ? (
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Business Ave, Suite 100, City, State 12345"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-foreground">{employer.address || 'Not provided'}</p>
              )}
            </div>
          </div>

          {/* Industry - Editable */}
          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Industry</Label>
              {isEditing ? (
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g. Technology, Healthcare, Finance"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-foreground">{employer.industry || 'Not specified'}</p>
              )}
            </div>
          </div>

          {/* Country - Editable */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <Label className="text-muted-foreground text-sm">Country</Label>
              {isEditing ? (
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. United States, United Kingdom"
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-foreground">{employer.country || 'Not specified'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
