import SignOutButton from "./SignOutButton";
import UnauthorizedRedirect from "./UnauthorizedRedirect";

type NotAuthorizedProps = {
  email?: string | null;
};

export default function NotAuthorized({ email }: NotAuthorizedProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <UnauthorizedRedirect />
        <h1 className="text-2xl font-semibold text-zinc-900">
          Not authorized
        </h1>
        <p className="text-sm text-zinc-600">
          {email
            ? `Signed in as ${email}, but your account doesn't have access to this tool.`
            : "Your account doesn't have access to this tool."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SignOutButton className="w-full sm:w-auto rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800" />
          <a
            href="/login?message=not-authorized"
            className="w-full sm:w-auto rounded-lg border border-zinc-200 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
          >
            Go to login
          </a>
        </div>
      </div>
    </div>
  );
}
