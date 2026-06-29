import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { BodyPage } from "../pages/BodyPage";
import { InterestProjectPage } from "../pages/InterestProjectPage";
import { InterestsPage } from "../pages/InterestsPage";
import { LearningPage } from "../pages/LearningPage";
import { LearningProjectPage } from "../pages/LearningProjectPage";
import { RecordDetailPage } from "../pages/RecordDetailPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TodayPage } from "../pages/TodayPage";
import { localDataRepository } from "../data/localRepository";
import { AppRoute, pathForHashRoute, routeFromLocation } from "./routes";

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeFromLocation(window.location));

  useEffect(() => {
    const handleLocationChange = () => setRoute(routeFromLocation(window.location));
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const pathRoute = routeFromLocation(window.location);
    if (window.location.hash) return;
    window.history.replaceState({}, "", pathForHashRoute(pathRoute));
  }, []);

  useEffect(() => {
    void localDataRepository.initialize();
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute === route) return;
    window.history.pushState({}, "", pathForHashRoute(nextRoute));
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const page = useMemo(() => {
    switch (route) {
      case "/today":
        return <TodayPage dataAccess={localDataRepository} navigate={navigate} />;
      case "/body":
        return <BodyPage dataAccess={localDataRepository} navigate={navigate} />;
      case "/learning":
        return <LearningPage navigate={navigate} />;
      case "/learning/project":
        return <LearningProjectPage navigate={navigate} />;
      case "/interests":
        return <InterestsPage navigate={navigate} />;
      case "/interests/project":
        return <InterestProjectPage navigate={navigate} />;
      case "/record":
        return <RecordDetailPage navigate={navigate} />;
      case "/settings":
        return <SettingsPage dataAccess={localDataRepository} navigate={navigate} />;
      default:
        return <TodayPage dataAccess={localDataRepository} navigate={navigate} />;
    }
  }, [route]);

  return (
    <AppShell currentRoute={route} navigate={navigate}>
      {page}
    </AppShell>
  );
}
