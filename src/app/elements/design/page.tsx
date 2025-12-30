import { Suspense } from "react";

import AvatarDesignWorkspaceClient from "@/app/avatars/design/design-workspace";

export default function ElementsDesignPage() {
  return (
    <Suspense>
      <AvatarDesignWorkspaceClient />
    </Suspense>
  );
}
