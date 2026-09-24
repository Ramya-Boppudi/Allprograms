import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import StaffLayout from './layouts/StaffLayout';
import HomePage from './pages/public/HomePage';
import TrackPage from './pages/public/TrackPage';
import FileGrievancePage from './pages/public/FileGrievancePage';
import PayPage from './pages/public/PayPage';
import StaffLoginPage from './pages/staff/StaffLoginPage';
import DashboardPage from './pages/staff/DashboardPage';
import GrievancesPage from './pages/staff/GrievancesPage';
import RegisterGrievancePage from './pages/staff/RegisterGrievancePage';
import GrievanceDetailPage from './pages/staff/GrievanceDetailPage';
import { useAuth } from './context/AuthContext';
import { canRegisterGrievance } from './config/roles';

function StaffGate({ children }) {
  const { kind } = useAuth();
  if (kind !== 'staff') return <Navigate to="/staff/login" replace />;
  return children;
}

function RegisterGate({ children }) {
  const { user } = useAuth();
  if (!canRegisterGrievance(user?.role_code)) return <Navigate to="/staff/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/pay/:orderRef" element={<PayPage />} />
        <Route path="/file" element={<Navigate to="/" replace />} />
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
        <Route path="grievances" element={<GrievancesPage />} />
        <Route path="register" element={<RegisterGate><RegisterGrievancePage /></RegisterGate>} />
        <Route path="grievances/:id" element={<GrievanceDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
