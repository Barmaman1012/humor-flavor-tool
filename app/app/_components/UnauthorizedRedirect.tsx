"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UnauthorizedRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/login?message=not-authorized");
    }, 1500);

    return () => clearTimeout(timeout);
  }, [router]);

  return null;
}
