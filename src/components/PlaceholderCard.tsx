import { AppRoute } from "../app/routes";

interface PlaceholderCardProps {
  title: string;
  body: string;
  actionLabel?: string;
  to?: AppRoute;
  navigate?: (route: AppRoute) => void;
}

export function PlaceholderCard({ title, body, actionLabel, to, navigate }: PlaceholderCardProps) {
  return (
    <article className="placeholder-card">
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {actionLabel && to && navigate ? (
        <button className="text-button" type="button" onClick={() => navigate(to)}>
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
