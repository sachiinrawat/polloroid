import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, PlusSquare, Wallet, User } from 'lucide-react';
import '../styles/Navbar.scss';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('/');

  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location]);

  const handleNavigation = (path: string) => {
    // For upload and redeem, redirect to login if not authenticated
    if ((path === '/upload' || path === '/redeem') && !isAuthenticated) {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <h1>Polloroid</h1>
        </Link>
      </div>
      
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === '/' ? 'active' : ''}`} 
          onClick={() => handleNavigation('/')}
        >
          <Home size={24} />
          <span>Feed</span>
        </button>
        
        <button 
          className={`nav-tab ${activeTab === '/upload' ? 'active' : ''}`} 
          onClick={() => handleNavigation('/upload')}
        >
          <PlusSquare size={24} />
          <span>Upload</span>
        </button>
        
        <button 
          className={`nav-tab ${activeTab === '/redeem' ? 'active' : ''}`} 
          onClick={() => handleNavigation('/redeem')}
        >
          <Wallet size={24} />
          <span>Redeem</span>
        </button>
        
        <button 
          className={`nav-tab ${activeTab === '/profile' || activeTab === '/login' || activeTab === '/register' ? 'active' : ''}`} 
          onClick={() => handleNavigation(isAuthenticated ? '/profile' : '/login')}
        >
          <User size={24} />
          <span>{isAuthenticated ? 'Profile' : 'Login'}</span>
        </button>
      </div>
      
      {isAuthenticated && (
        <div className="polo-indicator">
          <div className="polo-badge">{user?.poloBalance || 0}</div>
          <span>Polo</span>
        </div>
      )}
    </nav>
  );
};

export default Navbar;