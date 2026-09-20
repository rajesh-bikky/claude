import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/browse";
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl text-ink">Thoughtline</h1>
          <p className="mt-3 text-body text-[15px]">
            Enter your 4-digit code to continue.
          </p>
        </div>

        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <input
            type="text"
            name="code"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoFocus
            required
            placeholder="••••"
            className="h-14 rounded-md border border-hairline-strong bg-surface-card px-4 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-2 focus:border-ink"
          />
          {hasError && (
            <p className="text-center text-sm text-error">
              That code didn&apos;t match. Try again.
            </p>
          )}
          <button
            type="submit"
            className="h-10 rounded-pill bg-primary px-5 text-[15px] font-medium text-on-primary transition active:bg-primary-active"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
