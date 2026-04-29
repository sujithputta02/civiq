'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

/**
 * Optimized image component with lazy loading and WebP support
 * Uses Next.js Image component for automatic optimization
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height = 600,
  priority = false,
  className = '',
  sizes,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        quality={75}
        onLoadingComplete={() => setIsLoading(false)}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </div>
  );
}
