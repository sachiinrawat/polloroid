import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { ImagePlus, X, CheckCircle, AlertCircle } from 'lucide-react';
import '../styles/UploadPage.scss';

const UploadPage = () => {
  const { isAuthenticated, user, updateUserBalance } = useAuth();
  const navigate = useNavigate();
  
  const [description, setDescription] = useState('');
  const [pollCount, setPollCount] = useState(2);
  const [votesNeeded, setVotesNeeded] = useState(10);
  const [duration, setDuration] = useState(24); // Default duration: 24 hours
  const [images, setImages] = useState<(File | null)[]>(Array(8).fill(null));
  const [previews, setPreviews] = useState<string[]>(Array(8).fill(''));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Initialize arrays with the selected poll count
    setImages(prev => {
      const newImages = [...prev];
      for (let i = 0; i < 8; i++) {
        if (i >= pollCount) {
          newImages[i] = null;
        }
      }
      return newImages;
    });
    
    setPreviews(prev => {
      const newPreviews = [...prev];
      for (let i = 0; i < 8; i++) {
        if (i >= pollCount) {
          newPreviews[i] = '';
        }
      }
      return newPreviews;
    });
  }, [pollCount]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (maximum 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size too large (max 5MB)');
        return;
      }
      
      // Update images array
      const newImages = [...images];
      newImages[index] = file;
      setImages(newImages);
      
      // Create and set preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPreviews = [...previews];
        newPreviews[index] = event.target?.result as string;
        setPreviews(newPreviews);
      };
      reader.readAsDataURL(file);
      
      setError('');
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previews];
    
    newImages[index] = null;
    newPreviews[index] = '';
    
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }
    
    if (description.split(' ').length > 10) {
      setError('Description should not exceed 10 words');
      return;
    }
    
    // Check if enough images are uploaded
    const filledImages = images.filter((img, index) => img !== null && index < pollCount);
    if (filledImages.length < pollCount) {
      setError(`Please upload all ${pollCount} images`);
      return;
    }
    
    if (!acceptedTerms) {
      setError('Please accept the terms');
      return;
    }
    
    if (user && user.poloBalance < votesNeeded) {
      setError(`Insufficient Polo balance. You need ${votesNeeded} Polo`);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('requiredVotes', votesNeeded.toString());
      formData.append('duration', duration.toString());
      
      // Add images to form data
      for (let i = 0; i < pollCount; i++) {
        if (images[i]) {
          formData.append('images', images[i]);
        }
      }
      
      const response = await axios.post('http://localhost:3001/api/polls', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update user balance
      if (user) {
        updateUserBalance(user.poloBalance - votesNeeded);
      }
      
      // Reset form
      setDescription('');
      setPollCount(2);
      setVotesNeeded(10);
      setImages(Array(8).fill(null));
      setPreviews(Array(8).fill(''));
      setAcceptedTerms(false);
      
      setSuccess('Poll created successfully!');
      
      // Redirect to feed after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating poll:', error);
      setError(error.response?.data?.error || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="upload-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="upload-card">
        <h2>Create a New Poll</h2>
        
        {error && (
          <div className="alert alert-danger d-flex align-items-center">
            <AlertCircle size={18} className="me-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success d-flex align-items-center">
            <CheckCircle size={18} className="me-2" />
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Poll Description (max 10 words)</label>
            <input
              type="text"
              className="form-control"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Which outfit looks better?"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="pollCount" className="form-label">Number of Options</label>
              <select
                className="form-select"
                id="pollCount"
                value={pollCount}
                onChange={(e) => setPollCount(Number(e.target.value))}
                disabled={isSubmitting}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            
            <div className="col-md-4">
              <label htmlFor="votesNeeded" className="form-label">Votes Needed</label>
              <select
                className="form-select"
                id="votesNeeded"
                value={votesNeeded}
                onChange={(e) => setVotesNeeded(Number(e.target.value))}
                disabled={isSubmitting}
              >
                {[10, 20, 30, 40, 50].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label htmlFor="duration" className="form-label">Poll Duration (hours)</label>
              <select
                className="form-select"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">2 days</option>
                <option value="72">3 days</option>
                <option value="168">1 week</option>
              </select>
            </div>
          </div>
          
          <div className="current-balance mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <span>Your current balance:</span>
              <span className="polo-amount">{user?.poloBalance || 0} Polo</span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <span>Cost for this poll:</span>
              <span className="polo-cost">{votesNeeded} Polo</span>
            </div>
          </div>
          
          <div className="image-upload-container mb-4">
            <div className={`image-grid grid-${Math.min(4, pollCount)}`}>
              {Array.from({ length: pollCount }).map((_, index) => (
                <div key={index} className="image-upload-box">
                  {previews[index] ? (
                    <div className="image-preview">
                      <img src={previews[index]} alt={`Preview ${index}`} />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => removeImage(index)}
                        disabled={isSubmitting}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-label" htmlFor={`image-${index}`}>
                      <div className="upload-placeholder">
                        <ImagePlus size={24} />
                        <span>Upload</span>
                      </div>
                      <input
                        type="file"
                        id={`image-${index}`}
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, index)}
                        disabled={isSubmitting}
                        hidden
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-check mb-4">
            <input
              type="checkbox"
              className="form-check-input"
              id="acceptTerms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={isSubmitting}
            />
            <label className="form-check-label" htmlFor="acceptTerms">
              I understand that {votesNeeded} Polo will be deducted from my account
            </label>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary btn-lg w-100"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating Poll...
              </>
            ) : (
              'Create Poll'
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default UploadPage;