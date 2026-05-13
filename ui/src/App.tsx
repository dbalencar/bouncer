import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { SubjectProvider } from './context/SubjectContext';
import Layout from './components/Layout/Layout';
import Home from './components/Home/Home';
import TenantList from './components/TenantList/TenantList';
import PolicyList from './components/PolicyList/PolicyList';
import PolicyTest from './components/PolicyTest/PolicyTest';
import SubjectList from './components/SubjectList/SubjectList';
import PermissionList from './components/PermissionList/PermissionList';
import RoleList from './components/RoleList/RoleList';
import ResourceGroupList from './components/ResourceGroupList/ResourceGroupList';
import ResourceList from './components/ResourceList/ResourceList';
import GrantList from './components/GrantList/GrantList';
import Me from './components/Me/Me';
import Admin from './components/Admin/Admin';
import Access from './components/Access/Access';
import AccessManager from './components/AccessManager/AccessManager';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TenantProvider>
        <SubjectProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tenants" element={<TenantList />} />
              <Route path="/tenants/:tenantId/policies" element={<PolicyList />} />
              <Route path="/tenants/:tenantId/permissions" element={<PermissionList />} />
              <Route path="/tenants/:tenantId/roles" element={<RoleList />} />
              <Route path="/tenants/:tenantId/resource-groups" element={<ResourceGroupList />} />
              <Route path="/tenants/:tenantId/resources" element={<ResourceList />} />
              <Route path="/tenants/:tenantId/grants" element={<GrantList />} />
              <Route path="/tenants/:tenantId/test" element={<PolicyTest />} />
              <Route path="/subjects" element={<SubjectList />} />
              <Route path="/me" element={<Me />} />
              <Route path="/requests" element={<Access />} />
              <Route path="/access" element={<AccessManager />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
        </SubjectProvider>
      </TenantProvider>
    </Router>
  );
}

export default App;
