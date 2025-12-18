"use client";

import React from "react";

import { TRPCProvider } from "@/trpc/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
