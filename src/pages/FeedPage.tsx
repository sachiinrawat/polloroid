import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/FeedPage.scss';

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
  username: string;
  profileImage: string;
  options: PollOption[];
}

const FeedPage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/polls');
        // Filter out expired polls
        const currentTime = new Date().toISOString();
        const activePolls = response.data.filter(poll => {
          // Include polls that don't have an expiration date or haven't expired yet
          return !poll.expiresAt || new Date(poll.expiresAt) > new Date();
        });
        setPolls(activePolls);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (votedPolls[pollId]) {
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/votes', { pollId, optionId });
      
      // Update local state
      setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
      
      // Update poll option counts
      setPolls(prevPolls => 
        prevPolls.map(poll => {
          if (poll.id === pollId) {
            return {
              ...poll,
              options: poll.options.map(option => {
                if (option.id === optionId) {
                  return { ...option, voteCount: option.voteCount + 1 };
                }
                return option;
              })
            };
          }
          return poll;
        })
      );
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getGridClassName = (optionsLength: number) => {
    switch (optionsLength) {
      case 2:
        return 'grid-2';
      case 3:
        return 'grid-3';
      case 4:
        return 'grid-4';
      case 5:
      case 6:
        return 'grid-6';
      case 7:
      case 8:
        return 'grid-8';
      default:
        return 'grid-4';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="feed-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {polls.length === 0 ? (
        <div className="no-polls">
          <h3>No polls available</h3>
          <p>Be the first to create a poll!</p>
        </div>
      ) : (
        polls.map(poll => (
          <motion.div 
            key={poll.id}
            className="poll-card"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5 }}
          >
            <div className="poll-header">
              <div className="user-info">
                <div className="profile-image">
                  {poll.profileImage ? (
                    <img src={`http://localhost:3001${poll.profileImage}`} alt={poll.username} />
                  ) : (
                    <div className="default-profile">{poll.username.charAt(0)}</div>
                  )}
                </div>
                <div className="username">{poll.username}</div>
              </div>
              <div className="poll-time">{formatDate(poll.createdAt)}</div>
            </div>
            
            <div className="poll-description">{poll.description}</div>
            
            <div className={`poll-options ${getGridClassName(poll.options.length)}`}>
              {poll.options.map(option => {
                const isVoted = votedPolls[poll.id] === option.id;
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
                const votePercentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
                
                return (
                  <motion.div 
                    key={option.id}
                    className={`poll-option ${isVoted ? 'voted' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVote(poll.id, option.id)}
                  >
                    <div className="image-container">
                      <img src={`http://localhost:3001${option.imageUrl}`} alt="Poll option" />
                      
                      {votedPolls[poll.id] && (
                        <div className="vote-overlay">
                          <span className="vote-percentage">{votePercentage}%</span>
                          <div className="vote-progress" style={{ width: `${votePercentage}%` }}></div>
                        </div>
                      )}
                      
                      {isVoted && (
                        <div className="voted-badge">
                          <span>✓</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="poll-footer">
              <div className="votes-count">
                {poll.options.reduce((sum, option) => sum + option.voteCount, 0)} / {poll.requiredVotes} votes
              </div>
              {votedPolls[poll.id] ? (
                <div className="voted-message">You voted on this poll</div>
              ) : (
                <div className="vote-prompt">Tap an image to vote</div>
              )}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

export default FeedPage;