import { Suspense } from "react";

import AvatarDesignWorkspaceClient from "./design-workspace";

export const dynamic = "force-dynamic";

export default function AvatarDesignPage() {
  return (
    <Suspense>
      <AvatarDesignWorkspaceClient />
    </Suspense>
  );
}

