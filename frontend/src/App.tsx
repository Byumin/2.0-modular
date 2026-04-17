import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { ClientManagement } from "@/pages/ClientManagement"
import { ClientDetail } from "@/pages/ClientDetail"
import { ClientResult } from "@/pages/ClientResult"
import { TestManagement } from "@/pages/TestManagement"
import { TestDetail } from "@/pages/TestDetail"
import { AssessmentPage } from "@/pages/assessment/AssessmentPage"
import { ReportPage, AdminReportPage } from "@/pages/report/ReportPage"
import { ArtifactViewer } from "@/pages/ArtifactViewer"
import { LegacyRedirect } from "@/pages/LegacyRedirect"
import { Settings } from "@/pages/Settings"
import { IdentityReviews } from "@/pages/IdentityReviews"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<Login />} />
        <Route path="/assessment/custom/:accessToken" element={<AssessmentPage />} />
        <Route path="/report/:submissionId" element={<ReportPage mode="token" />} />
        <Route path="/admin/report/:submissionId" element={<AdminReportPage />} />
        <Route element={<AppLayout />}>
          <Route path="/admin/workspace" element={<Dashboard />} />
          <Route path="/admin/clients" element={<ClientManagement />} />
          <Route path="/admin/client-detail" element={<LegacyRedirect type="client-detail" />} />
          <Route path="/admin/client-result" element={<LegacyRedirect type="client-result" />} />
          <Route path="/admin/clients/:id" element={<ClientDetail />} />
          <Route path="/admin/clients/:id/result" element={<ClientResult />} />
          <Route path="/admin/create" element={<TestManagement />} />
          <Route path="/admin/test-detail" element={<LegacyRedirect type="test-detail" />} />
          <Route path="/admin/create/:id" element={<TestDetail />} />
          <Route path="/admin/artifact-viewer" element={<ArtifactViewer />} />
          <Route path="/admin/identity-reviews" element={<IdentityReviews />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
