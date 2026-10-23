import Link from "next/link";
import {
  ArrowUpRight,
  MessageCircle,
  Clock3,
  BookmarkPlus,
} from "lucide-react";
import { assess, type Opportunity } from "@/lib/domain";
export function OpportunityCard({
  item,
  preferences,
}: {
  item: Opportunity;
  preferences?: {
    languages: string[];
    technologies: string[];
    interests: string[];
  } | null;
}) {
  const result = assess(item, preferences);
  return (
    <article className="opportunity-card">
      <div className="card-top">
        <span className="repo-name">
          {item.owner} <span>/</span> {item.repo}
        </span>
        <BookmarkPlus size={18} aria-hidden="true" />
      </div>
      <Link
        className="card-title"
        href={`/oportunidad/${item.owner}/${item.repo}/${item.number}?source=${item.source}`}
      >
        {item.title}
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
      <p className="issue-excerpt">
        {item.body.slice(0, 150) ||
          "Consulta el issue para conocer su contexto."}
      </p>
      <div className="tags">
        {item.labels.slice(0, 4).map((l) => (
          <span
            className={`tag ${l === "good first issue" ? "green" : ""}`}
            key={l}
          >
            {l}
          </span>
        ))}
      </div>
      <p className="fit-hint">
        ✧{" "}
        {result.reasons[0] ??
          "Explora el contexto y comprueba si encaja con tus conocimientos."}
      </p>
      <div className="card-meta">
        <span>
          <i className={`language-dot ${item.language?.toLowerCase()}`} />
          {item.language ?? "Varios lenguajes"}
        </span>
        <span>
          <MessageCircle size={14} aria-hidden="true" />
          {item.comments}
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {new Intl.DateTimeFormat("es", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(new Date(item.updatedAt))}
        </span>
        <span>#{item.number}</span>
      </div>
    </article>
  );
}
