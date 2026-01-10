import { Link } from '@tanstack/react-router';
import { ReactNode } from 'react';

import { LogoIofinnet } from '@/assets/logo-iofinnet';

export const LayoutLogin = (props: {
  children?: ReactNode;
  footer?: ReactNode;
}) => {
  return (
    <div
      className="flex min-h-dvh flex-1 bg-white font-inter"
      data-testid="layout-login"
    >
      {/* Left side - Form */}
      <div className="flex w-full flex-1 flex-col p-8 lg:w-1/2 lg:p-12">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <LogoIofinnet variant="full" className="h-5 w-auto" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{props.children}</div>
        </div>

        {props.footer}
      </div>

      {/* Right side - Geometric Pattern */}
      <div className="relative hidden w-1/2 overflow-hidden bg-brand-600 lg:block">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0">
          {/* Grid lines */}
          <svg
            className="absolute inset-0 size-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Diagonal lines */}
          <div className="absolute top-20 -left-20 h-[200%] w-px rotate-45 bg-white/20" />
          <div className="absolute top-20 -left-10 h-[200%] w-px rotate-45 bg-white/10" />
          <div className="absolute top-20 left-1/4 h-[200%] w-px rotate-45 bg-white/15" />
          <div className="absolute top-20 left-1/2 h-[200%] w-px rotate-45 bg-white/20" />
          <div className="absolute top-20 left-3/4 h-[200%] w-px rotate-45 bg-white/10" />

          {/* Geometric shapes */}
          <div className="absolute top-32 right-20 size-32 border border-white/20" />
          <div className="absolute top-44 right-32 size-20 border border-white/30" />
          <div className="absolute bottom-40 left-20 size-40 border border-white/15" />
          <div className="absolute bottom-20 left-32 size-24 border border-white/25" />

          {/* Corner accent */}
          <div className="absolute top-0 right-0 border-t-[100px] border-r-[100px] border-t-white/10 border-r-transparent" />
          <div className="absolute bottom-0 left-0 border-b-[80px] border-l-[80px] border-b-white/10 border-l-transparent" />

          {/* Circles */}
          <div className="absolute top-1/3 right-40 size-16 rounded-full border border-white/20" />
          <div className="absolute bottom-1/3 left-40 size-24 rounded-full border border-white/15" />
        </div>

        {/* Brand text */}
        <div className="absolute right-12 bottom-12 left-12">
          <p className="text-sm font-medium text-white/60">
            Secure digital asset management
          </p>
          <p className="mt-1 text-xs text-white/40">
            Enterprise-grade custody and treasury solutions
          </p>
        </div>
      </div>
    </div>
  );
};
