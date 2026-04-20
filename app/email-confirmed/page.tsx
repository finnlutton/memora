export default function EmailConfirmedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-3xl text-center">
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
          Your email has been verified!
        </h1>
        <p className="mt-5 text-sm leading-7 text-[color:var(--ink-soft)] md:text-base">
          You can now log in with your email and password.
        </p>
        <a
          href="/auth?mode=signin"
          className="mt-6 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
        >
          Go to log in →
        </a>
      </section>
    </main>
  );
}
