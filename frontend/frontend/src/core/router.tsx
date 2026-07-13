import { Navigate, createBrowserRouter } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import DashboardView from "@/features/dashboard/DashboardView";
import CitizenRequestForm from "@/features/requests/CitizenRequestForm";
import KnowledgeGraphView from "@/features/graph/KnowledgeGraphView";
import GisMapView from "@/features/gis/GisMapView";
import PrioritySuggestionsView from "@/features/suggestions/PrioritySuggestionsView";
import AgentWorkflowView from "@/features/agents/AgentWorkflowView";
import BudgetPlannerView from "@/features/budget/BudgetPlannerView";
import ProjectsTrackerView from "@/features/projects/ProjectsTrackerView";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "",
        element: <DashboardView />,
      },
      {
        path: "requests",
        element: <CitizenRequestForm />,
      },
      {
        path: "graph",
        element: <KnowledgeGraphView />,
      },
      {
        path: "gis",
        element: <GisMapView />,
      },
      {
        path: "map",
        element: <Navigate to="/gis" replace />,
      },
      {
        path: "recommendations",
        element: <PrioritySuggestionsView />,
      },
      {
        path: "budget",
        element: <BudgetPlannerView />,
      },
      {
        path: "projects",
        element: <ProjectsTrackerView />,
      },
      {
        path: "workflow",
        element: <AgentWorkflowView />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
