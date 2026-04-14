import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminControlPanel } from "@/components/admin/admin-control-panel";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <main className="min-h-screen bg-[color:var(--background)] px-4 py-10 text-[color:var(--ink)] md:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Admin</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">Access denied</h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            This area is restricted to operator accounts.
          </p>
          <Link href="/galleries" className="mt-6 inline-block text-sm underline underline-offset-4">
            Return to workspace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-8 text-[color:var(--ink)] md:px-8 md:py-10">
      <div className="mx-auto mb-6 w-full max-w-5xl border-b border-[rgba(34,52,79,0.08)] pb-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Operator panel</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">Admin Control Panel</h1>
        <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">
          Internal tools for operations, diagnostics, and controlled maintenance.
        </p>
      </div>
      <AdminControlPanel />
    </main>
  );
}
