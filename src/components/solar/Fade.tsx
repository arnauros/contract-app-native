"use client";

import { ReactNode } from "react";

interface FadeProps {
  children: ReactNode;
  className?: string;
}

export function FadeContainer({ children, className = "" }: FadeProps) {
  return <div className={className}>{children}</div>;
}

export function FadeDiv({ children, className = "" }: FadeProps) {
  return <div className={className}>{children}</div>;
}

export function FadeSpan({ children, className = "" }: FadeProps) {
  return <span className={className}>{children}</span>;
}
