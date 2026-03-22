import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DatabaseProvider } from './context/DatabaseContext';
import { AppProvider } from './context/AppContext';

// Import layouts and pages
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Tier1 from './pages/Tier1';
import Tier2 from './pages/Tier2';
import Tier3 from './pages/Tier3';
import Tier4 from './pages/Tier4';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DatabaseProvider>
        <AppProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes enclosed in Layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/tier1" element={<Tier1 />} />
                <Route path="/tier2" element={<Tier2 />} />
                <Route path="/tier3" element={<Tier3 />} />
                <Route path="/tier4" element={<Tier4 />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AuthProvider>
        </AppProvider>
      </DatabaseProvider>
    </Router>
  );
}

export default App;
