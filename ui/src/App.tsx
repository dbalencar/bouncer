import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import Layout from './components/Layout/Layout';
import TenantList from './components/TenantList/TenantList';
import PolicyList from './components/PolicyList/PolicyList';
import PolicyTest from './components/PolicyTest/PolicyTest';
import SubjectList from './components/SubjectList/SubjectList';

function App() {
  return (
    <Router>
      <TenantProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<TenantList />} />
            <Route path="/tenants" element={<TenantList />} />
            <Route path="/tenants/:tenantId/policies" element={<PolicyList />} />
            <Route path="/tenants/:tenantId/test" element={<PolicyTest />} />
            <Route path="/subjects" element={<SubjectList />} />
          </Routes>
        </Layout>
      </TenantProvider>
    </Router>
  );
}

export default App;
