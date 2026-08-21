import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminLeaderboardPage from './pages/admin/AdminLeaderboardPage';
import AdminJuriesPage from './pages/admin/AdminJuriesPage';
import AdminVenuesPage from './pages/admin/AdminVenuesPage';
import AdminScorePage from './pages/admin/AdminScorePage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';

// Jury imports
import JuryLayout from './components/JuryLayout';
import JuryDashboardPage from './pages/jury/JuryDashboardPage';
import JuryEvaluationPage from './pages/jury/JuryEvaluationPage';

// Jury pages (placeholders until migrated)

// Admin sub-pages (placeholders until migrated)
// All admin pages migrated!

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Single login for ALL users — role-based redirect inside */}
        <Route path="/login" element={<Login />} />

        {/* Admin section — all wrapped in AdminLayout (sidebar + topbar) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="teams" element={<AdminTeamsPage />} />
          <Route path="leaderboard" element={<AdminLeaderboardPage />} />
          <Route path="juries" element={<AdminJuriesPage />} />
          <Route path="venues" element={<AdminVenuesPage />} />
          <Route path="score" element={<AdminScorePage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Jury section — wrapped in JuryLayout */}
        <Route path="/jury" element={<JuryLayout />}>
          <Route path="dashboard" element={<JuryDashboardPage />} />
          <Route path="evaluate/:teamId" element={<JuryEvaluationPage />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
