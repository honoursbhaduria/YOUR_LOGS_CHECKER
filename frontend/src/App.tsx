import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail';
import InvestigationOverview from './pages/InvestigationOverview';
import EventExplorer from './pages/EventExplorer';
import AttackStory from './pages/AttackStory';
import ReportGeneration from './pages/ReportGeneration';
import EvidenceView from './pages/EvidenceView';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    !!localStorage.getItem('access_token')
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Register />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout onLogout={() => setIsAuthenticated(false)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cases" element={<CaseList />} />
          <Route path="cases/:caseId" element={<CaseDetail />} />
          <Route path="cases/:caseId/overview" element={<InvestigationOverview />} />
          <Route path="cases/:caseId/events" element={<EventExplorer />} />
          <Route path="cases/:caseId/story" element={<AttackStory />} />
          <Route path="cases/:caseId/report" element={<ReportGeneration />} />
          <Route path="cases/:caseId/evidence" element={<EvidenceView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
