import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { ProjectCard } from "@/components/project-card";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const instructor = await getRepo().getInstructor(slug);
  return instructor ? { title: instructor.name, description: instructor.bio } : { title: "Instructor not found" };
}

export default async function InstructorPage({ params }: Props) {
  const { slug } = await params;
  const instructor = await getRepo().getInstructor(slug);
  if (!instructor) notFound();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/instructors" className="hover:underline">
          Instructors
        </Link>
      </nav>
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">{instructor.name}</h1>
        <p className="text-muted">
          {instructor.title}, {instructor.organization.name}
        </p>
        <p className="max-w-prose pt-2 leading-relaxed">{instructor.bio}</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructor.projects.map((card) => (
            <ProjectCard key={card.slug} card={card} layout="grid" />
          ))}
        </div>
      </section>
    </div>
  );
}
