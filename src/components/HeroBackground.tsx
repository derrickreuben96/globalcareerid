import { useState, useEffect } from 'react';
import heroVideo from '@/assets/hero-office-video.mp4';
import heroImage1 from '@/assets/hero-diverse-team-1.jpg';
import heroImage2 from '@/assets/hero-diverse-team-2.jpg';
import heroImage3 from '@/assets/hero-diverse-team-3.jpg';

const officeImages = [heroImage1, heroImage2, heroImage3];

export function HeroBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

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
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoLoaded ? 'opacity-30' : 'opacity-0'
        }`}
      >
        <source src={heroVideo} type="video/mp4" />
      </video>

      {/* Current Image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-0' : 'opacity-40'
        }`}
        style={{ backgroundImage: `url(${officeImages[currentIndex]})` }}
      />
      
      {/* Next Image (preloaded) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
          isTransitioning ? 'opacity-40' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${officeImages[nextIndex]})` }}
      />
      
      {/* Overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/85 to-background/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
    </div>
  );
}
