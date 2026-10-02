import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted">That page does not exist, or the project is no longer listed.</p>
      <Link href="/projects" className="text-accent underline">
        Browse projects
      </Link>
    </div>
  );
}
