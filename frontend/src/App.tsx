import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@layout/MainLayout'
import AdminLayout from '@layout/AdminLayout'
import HomePage from '@pages/HomePage'
import LoginPage from '@pages/LoginPage'
import DashboardPage from '@pages/DashboardPage'
import EnhancedRegistrationsPage from '@pages/EnhancedRegistrationsPage'
import ReportsPage from '@pages/ReportsPage';
import DiagnosticsPage from '@pages/DiagnosticsPage'
import TrialsWorkflowPage from '@pages/TrialsWorkflowPage'
import TournamentOrganizersPage from '@pages/TournamentOrganizersPage'
import UpdatePaymentsPage from '@pages/UpdatePaymentsPage'
import MastersPage from '@pages/MastersPage'
import CertificatesPage from '@pages/CertificatesPage'
import SelectionStatusPage from '@pages/SelectionStatusPage'
import UserManagementPage from '@pages/UserManagementPage'
import AnalyticsPage from '@pages/AnalyticsPage'
import RazorpayTransactionsPage from '@pages/RazorpayTransactionsPage'
import SelectorManagementPage from '@pages/SelectorManagementPage'
import BulkEmailPage from '@pages/BulkEmailPage'
import ChatConversationsPage from '@pages/ChatConversationsPage'
import CouponManagementPage from '@pages/CouponManagementPage'
import WhatsAppMarketingPage from '@pages/WhatsAppMarketingPage'
import ProtectedRoute from '@components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public Home Page */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/selectors" element={<SelectorManagementPage />} />
        <Route path="/registrations" element={<EnhancedRegistrationsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/selection-status" element={<SelectionStatusPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/trials-workflow" element={<TrialsWorkflowPage />} />
        <Route path="/tournament-organizers" element={<TournamentOrganizersPage />} />
        <Route path="/update-payments" element={<UpdatePaymentsPage />} />
        <Route path="/masters" element={<MastersPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/razorpay" element={<RazorpayTransactionsPage />} />
        <Route path="/coupons" element={<CouponManagementPage />} />
        <Route path="/email" element={<BulkEmailPage />} />
        <Route path="/chat-logs" element={<ChatConversationsPage />} />
        <Route path="/whatsapp" element={<WhatsAppMarketingPage />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
