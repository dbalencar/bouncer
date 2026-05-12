import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { SubjectProvider } from './context/SubjectContext';
import Layout from './components/Layout/Layout';
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

function App() {
  return (
    <Router>
      <TenantProvider>
        <SubjectProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<TenantList />} />
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
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
        </SubjectProvider>
      </TenantProvider>
    </Router>
  );
}

export default App;
