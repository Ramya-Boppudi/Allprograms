import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import StaffLayout from './layouts/StaffLayout';
import HomePage from './pages/public/HomePage';
import TrackPage from './pages/public/TrackPage';
import FileGrievancePage from './pages/public/FileGrievancePage';
import StaffLoginPage from './pages/staff/StaffLoginPage';
import DashboardPage from './pages/staff/DashboardPage';
import RegisterGrievancePage from './pages/staff/RegisterGrievancePage';
import GrievanceDetailPage from './pages/staff/GrievanceDetailPage';
import { useAuth } from './context/AuthContext';

function StaffGate({ children }) {
  const { kind } = useAuth();
  if (kind !== 'staff') return <Navigate to="/staff/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/file" element={<FileGrievancePage />} />
      </Route>
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route
        path="/staff"
        element={(
          <StaffGate>
            <StaffLayout />
          </StaffGate>
        )}
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="register" element={<RegisterGrievancePage />} />
        <Route path="grievances/:id" element={<GrievanceDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
