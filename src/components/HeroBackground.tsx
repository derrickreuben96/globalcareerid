import { useState, useEffect } from 'react';

const officeImages = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1920&q=80',
];

export function HeroBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setNextIndex((nextIndex + 1) % officeImages.length);
        setIsTransitioning(false);
      }, 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, [nextIndex]);

  return (
    <div className="absolute inset-0 z-0">
      {/* Current Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${officeImages[currentIndex]})` }}
      />
      
      {/* Next Image (preloaded) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${officeImages[nextIndex]})` }}
      />
      
      {/* Overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-background/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
    </div>
  );
}
