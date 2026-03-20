import { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Camera, Loader2, Trash2, ZoomIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProfileImageUploadProps {
  userId: string;
  currentImageUrl: string | null;
  firstName: string;
  lastName: string;
  onImageUpdated: () => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function centerAspectCrop(mediaWidth: number, mediaHeight: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ProfileImageUpload({ userId, currentImageUrl, firstName, lastName, onImageUpdated }: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState([1]);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setShowCropDialog(true);
      setZoom([1]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centerAspectCrop(naturalWidth, naturalHeight));
    imgRef.current = e.currentTarget;
  }, []);

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current;
      if (!image || !crop) return reject('No image or crop');

      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelCrop = {
        x: (crop.unit === '%' ? (crop.x / 100) * image.width : crop.x) * scaleX,
        y: (crop.unit === '%' ? (crop.y / 100) * image.height : crop.y) * scaleY,
        width: (crop.unit === '%' ? (crop.width / 100) * image.width : crop.width) * scaleX,
        height: (crop.unit === '%' ? (crop.height / 100) * image.height : crop.height) * scaleY,
      };

      const outputSize = Math.min(512, pixelCrop.width);
      canvas.width = outputSize;
      canvas.height = outputSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');

      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, outputSize, outputSize
      );

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject('Failed to create blob')),
        'image/jpeg',
        0.9
      );
    });
  };

  const handleCropAndUpload = async () => {
    setIsUploading(true);
    try {
      const blob = await getCroppedBlob();
      const filePath = `${userId}/avatar.jpg`;

      await supabase.storage.from('profile-images').remove([
        `${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`
      ]);

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: urlWithCacheBust })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success('Profile image updated');
      setShowCropDialog(false);
      setImageSrc(null);
      await onImageUpdated();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsDeleting(true);
    try {
      await supabase.storage.from('profile-images').remove([
        `${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`
      ]);

      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Profile image removed');
      await onImageUpdated();
    } catch (err) {
      toast.error('Failed to remove image');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="w-20 h-20 border-2 border-border">
            {currentImageUrl ? (
              <AvatarImage src={currentImageUrl} alt={`${firstName} ${lastName}`} />
            ) : null}
            <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            {currentImageUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {currentImageUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={showCropDialog} onOpenChange={(open) => { if (!isUploading) setShowCropDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {imageSrc && (
              <div className="w-full max-h-[350px] overflow-hidden rounded-lg border border-border">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-h-[350px]"
                >
                  <img
                    src={imageSrc}
                    onLoad={onImageLoad}
                    alt="Crop preview"
                    className="max-h-[350px] w-auto mx-auto"
                    style={{ transform: `scale(${zoom[0]})`, transformOrigin: 'center' }}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex items-center gap-3 w-full px-2">
              <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider
                value={zoom}
                onValueChange={setZoom}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{zoom[0].toFixed(1)}x</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCropDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleCropAndUpload} disabled={isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
