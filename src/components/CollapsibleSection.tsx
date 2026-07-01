import { ReactNode, useId, useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  summary: string;
  defaultExpanded: boolean;
  children: ReactNode;
  description?: string;
}

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded,
  children,
  description,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <section className="section collapsible-section">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="collapsible-header"
        type="button"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="collapsible-heading">
          <span className="collapsible-title">{title}</span>
          <span className="collapsible-summary">{summary}</span>
          {description ? <span className="collapsible-description">{description}</span> : null}
        </span>
        <span aria-hidden="true" className="collapsible-arrow">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>
      {expanded ? (
        <div className="collapsible-content" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
