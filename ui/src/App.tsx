import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { SubjectProvider } from './context/SubjectContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import AuthCallback from './components/AuthCallback/AuthCallback';
import Home from './components/Home/Home';
import PolicyList from './components/PolicyList/PolicyList';
import PolicyTest from './components/PolicyTest/PolicyTest';
import SubjectList from './components/SubjectList/SubjectList';
import PermissionList from './components/PermissionList/PermissionList';
import RoleList from './components/RoleList/RoleList';
import ResourceGroupList from './components/ResourceGroupList/ResourceGroupList';
import ResourceList from './components/ResourceList/ResourceList';
import GrantList from './components/GrantList/GrantList';
import GrantRequestApproval from './components/GrantRequestApproval/GrantRequestApproval';
import AuditLogList from './components/AuditLogList/AuditLogList';
import Me from './components/Me/Me';
import Access from './components/Access/Access';
import AccessManager from './components/AccessManager/AccessManager';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TenantProvider>
        <SubjectProvider>
          <AuthProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/callback" element={<AuthCallback />} />
                <Route path="/tenants/:tenantId/policies" element={<PolicyList />} />
                <Route path="/tenants/:tenantId/permissions" element={<PermissionList />} />
                <Route path="/tenants/:tenantId/roles" element={<RoleList />} />
                <Route path="/tenants/:tenantId/resource-groups" element={<ResourceGroupList />} />
                <Route path="/tenants/:tenantId/resources" element={<ResourceList />} />
                <Route path="/tenants/:tenantId/grants" element={<GrantList />} />
                <Route path="/tenants/:tenantId/grant-requests" element={<GrantRequestApproval />} />
                <Route path="/tenants/:tenantId/audit-log" element={<AuditLogList />} />
                <Route path="/tenants/:tenantId/test" element={<PolicyTest />} />
                <Route path="/subjects" element={<SubjectList />} />
                <Route path="/me" element={<Me />} />
                <Route path="/requests" element={<Access />} />
                <Route path="/access" element={<AccessManager />} />
              </Routes>
            </Layout>
          </AuthProvider>
        </SubjectProvider>
      </TenantProvider>
    </Router>
  );
}

export default App;
