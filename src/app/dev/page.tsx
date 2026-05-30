// /dev — mounts the throwaway harness tester, kept out of the main app surface
// (page.tsx / Halo). Deletable with features/harness-tester/ once Halo lands.

import { Tester } from "@/features/harness-tester/tester";

export default function DevPage() {
  return <Tester />;
}
