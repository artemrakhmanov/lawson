// Scaffold placeholder home page (Spec 00). Spec 04 (Halo) owns `/` and
// replaces this. It exists to (a) de-brand the create-next-app boilerplate and
// (b) demonstrate the conventions live: the roster service loaded server-side,
// and the dumb-component / interactor split (the Example feature). Monochrome.

import { Example } from "@/features/example/example";
import { getRoster } from "@/services/signatures";

export default function Home() {
  const roster = getRoster();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Lawson</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Scaffold ready. Halo (Spec 04) replaces this page.
        </p>
      </div>

      <Example />

      <p className="text-xs text-muted-foreground">
        {roster.length} lawyers loaded from the firm roster
      </p>
    </main>
  );
}
