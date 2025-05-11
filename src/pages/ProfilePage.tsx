import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, MapPin, Calendar, Upload, LogOut, Clock, History } from 'lucide-react';
import '../styles/ProfilePage.scss';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  poloBalance: number;
  location?: string;
  age?: number;
  profileImage?: string;
  createdAt: string;
}

interface PollOption {
  id: string;
  imageUrl: string;
  voteCount: number;
}

interface Poll {
  id: string;
  description: string;
  requiredVotes: number;
  createdAt: string;
  expiresAt: string;
  options: PollOption[];
  totalVotes?: number;
}

const ProfilePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pollHistory, setPollHistory] = useState<Poll[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'history'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchProfile();
    fetchPollHistory();
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/user/profile');
      setProfile(response.data);
      
      // Set form values
      setUsername(response.data.username);
      setEmail(response.data.email);
      setAge(response.data.age || '');
      setLocation(response.data.location || '');
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchPollHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get('http://localhost:3001/api/polls/history');
      setPollHistory(response.data);
    } catch (error) {
      console.error('Error fetching poll history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (maximum 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size too large (max 5MB)');
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setError('');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      
      if (username !== profile?.username) formData.append('username', username);
      if (email !== profile?.email) formData.append('email', email);
      if (age !== profile?.age && age !== '') formData.append('age', age.toString());
      if (location !== profile?.location) formData.append('location', location);
      if (profileImage) formData.append('profileImage', profileImage);
      
      const response = await axios.put('http://localhost:3001/api/user/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="profile-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} />
          <span>Profile</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>Poll History</span>
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="profile-card">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
        
        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="profile-edit-form">
            <h2>Edit Profile</h2>
            
            <div className="profile-image-upload">
              <div className="current-image">
                {previewImage ? (
                  <img src={previewImage} alt="Profile preview" />
                ) : profile?.profileImage ? (
                  <img src={`http://localhost:3001${profile.profileImage}`} alt={profile.username} />
                ) : (
                  <div className="default-avatar">{username.charAt(0).toUpperCase()}</div>
                )}
              </div>
              
              <label className="image-upload-button">
                <Upload size={18} />
                <span>Change photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfileImageChange} 
                  hidden 
                />
              </label>
            </div>
            
            <div className="form-group">
              <label htmlFor="username">
                <User size={18} />
                <span>Username</span>
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={18} />
                <span>Email</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="age">
                <Calendar size={18} />
                <span>Age</span>
              </label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                min="13"
                max="120"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="location">
                <MapPin size={18} />
                <span>Location</span>
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            
            <div className="form-buttons">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              
              <button type="submit" className="save-button">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="profile-header">
              <div className="profile-image">
                {profile?.profileImage ? (
                  <img src={`http://localhost:3001${profile.profileImage}`} alt={profile.username} />
                ) : (
                  <div className="default-avatar">{profile?.username.charAt(0).toUpperCase()}</div>
                )}
              </div>
              
              <div className="profile-name">
                <h2>{profile?.username}</h2>
                <div className="polo-balance">
                  <span className="balance-label">Balance:</span>
                  <span className="balance-amount">{profile?.poloBalance} Polo</span>
                </div>
              </div>
            </div>
            
            <div className="profile-details">
              <div className="detail-item">
                <Mail size={18} />
                <span>{profile?.email}</span>
              </div>
              
              {profile?.age && (
                <div className="detail-item">
                  <Calendar size={18} />
                  <span>{profile.age} years old</span>
                </div>
              )}
              
              {profile?.location && (
                <div className="detail-item">
                  <MapPin size={18} />
                  <span>{profile.location}</span>
                </div>
              )}
              
              <div className="detail-item">
                <User size={18} />
                <span>Member since {formatDate(profile?.createdAt || '')}</span>
              </div>
            </div>
            
            <div className="profile-actions">
              <button 
                className="edit-profile-button"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
              
              <button 
                className="logout-button"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div className="poll-history-card">
          <h2>Poll History</h2>
          <p className="history-description">These are your expired polls that are no longer shown in the feed.</p>
          
          {loadingHistory ? (
            <div className="history-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : pollHistory.length === 0 ? (
            <div className="no-history">
              <p>You don't have any expired polls yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {pollHistory.map(poll => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
                return (
                  <div key={poll.id} className="history-item">
                    <div className="history-item-header">
                      <h3>{poll.description}</h3>
                      <div className="history-item-meta">
                        <div className="history-date">
                          <Calendar size={14} />
                          <span>Created: {formatDate(poll.createdAt)}</span>
                        </div>
                        <div className="history-date">
                          <Clock size={14} />
                          <span>Expired: {formatDate(poll.expiresAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="history-item-stats">
                      <div className="stat">
                        <strong>{totalVotes}</strong>
                        <span>Total Votes</span>
                      </div>
                      <div className="stat">
                        <strong>{poll.requiredVotes}</strong>
                        <span>Required Votes</span>
                      </div>
                      <div className="stat">
                        <strong>{poll.options.length}</strong>
                        <span>Options</span>
                      </div>
                    </div>
                    
                    <div className="history-item-options">
                      {poll.options.map(option => {
                        const votePercentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
                        return (
                          <div key={option.id} className="history-option">
                            <div className="option-image">
                              <img src={`http://localhost:3001${option.imageUrl}`} alt="Poll option" />
                            </div>
                            <div className="option-stats">
                              <div className="vote-bar">
                                <div 
                                  className="vote-progress" 
                                  style={{ width: `${votePercentage}%` }}
                                ></div>
                              </div>
                              <div className="vote-count">{option.voteCount} votes ({votePercentage}%)</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ProfilePage;