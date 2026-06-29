import { AppRoute } from "../app/routes";

export interface PageProps {
  navigate: (route: AppRoute) => void;
}
