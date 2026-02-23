import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getUserRole, type UserRole } from './lib/auth-helpers';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Leads } from './pages/Leads';
import { Contacts } from './pages/Contacts';
import { Clients } from './pages/Clients';
import { Billing } from './pages/Billing';
import { Expenses } from './pages/Expenses';
import { Login } from './pages/Login';
import { Setter } from './pages/Setter';
import { SetterLinkedin } from './pages/SetterLinkedin';
import { Loader2 } from 'lucide-react';

const Settings = () => <div>Paramètres (Construction)</div>;

function ProtectedRoute({
  children,
  session,
  loading,
  role,
  allowedRoles,
}: {
  children: React.ReactNode;
  session: any;
  loading: boolean;
  role: UserRole;
  allowedRoles?: UserRole[];
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role !== null && !allowedRoles.includes(role)) {
    if (role === 'setter_linkedin') {
      return <Navigate to="/setter-linkedin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        getUserRole().then(r => {
          setRole(r);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        (async () => {
          const r = await getUserRole();
          setRole(r);
          setLoading(false);
        })();
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const adminOrSetter: UserRole[] = ['admin', 'setter'];
  const allRoles: UserRole[] = ['admin', 'setter', 'setter_linkedin'];

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to={role === 'setter_linkedin' ? '/setter-linkedin' : '/'} replace /> : <Login />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={allRoles}>
              <MainLayout role={role}>
                <Routes>
                  <Route path="/" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/leads" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Leads />
                    </ProtectedRoute>
                  } />
                  <Route path="/contacts" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Contacts />
                    </ProtectedRoute>
                  } />
                  <Route path="/clients" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Clients />
                    </ProtectedRoute>
                  } />
                  <Route path="/billing" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Billing />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Expenses />
                    </ProtectedRoute>
                  } />
                  <Route path="/setter" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={adminOrSetter}>
                      <Setter />
                    </ProtectedRoute>
                  } />
                  <Route path="/setter-linkedin" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={['admin', 'setter_linkedin']}>
                      <SetterLinkedin />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute session={session} loading={loading} role={role} allowedRoles={['admin']}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={
                    <Navigate to={role === 'setter_linkedin' ? '/setter-linkedin' : '/'} replace />
                  } />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
