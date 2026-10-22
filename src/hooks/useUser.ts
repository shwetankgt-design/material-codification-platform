"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import type { PERMISSIONS } from "@/lib/auth";

type PermissionMap = Record<keyof typeof PERMISSIONS, boolean>;

export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setPermissions(d.permissions ?? null);
      });
  }, []);

  return { user, permissions, loading: user === undefined };
}
