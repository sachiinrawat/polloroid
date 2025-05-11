import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, LogOut, History, BarChart } from 'lucide-react';
import '../styles/RedeemPage.scss';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

const RedeemPage = () => {
  const { isAuthenticated, user, updateUserBalance } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('main');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState(100);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/user/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/user/polls');
      setPolls(response.data);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'polls') {
      fetchPolls();
    }
  }, [activeTab]);

  const handleDeposit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('http://localhost:3001/api/transaction/deposit', {
        amount: depositAmount
      });
      
      if (user) {
        updateUserBalance(user.poloBalance + depositAmount);
      }
      
      setSuccess('Deposit successful!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Return to main tab
      setActiveTab('main');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (user && user.poloBalance < withdrawAmount) {
        setError('Insufficient balance');
        setLoading(false);
        return;
      }
      
      const response = await axios.post('http://localhost:3001/api/transaction/withdraw', {
        amount: withdrawAmount
      });
      
      if (user) {
        updateUserBalance(user.poloBalance - withdrawAmount);
      }
      
      setSuccess('Withdrawal successful!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Return to main tab
      setActiveTab('main');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderMainTab = () => (
    <div className="redeem-main">
      <div className="polo-balance">
        <div className="balance-label">Your Polo Balance</div>
        <div className="balance-amount">{user?.poloBalance || 0}</div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="action-button deposit"
          onClick={() => setActiveTab('deposit')}
        >
          <CreditCard size={24} />
          <span>Deposit</span>
        </button>
        
        <button 
          className="action-button withdraw"
          onClick={() => setActiveTab('withdraw')}
        >
          <LogOut size={24} />
          <span>Withdraw</span>
        </button>
        
        <button 
          className="action-button history"
          onClick={() => setActiveTab('transactions')}
        >
          <History size={24} />
          <span>Transaction History</span>
        </button>
        
        <button 
          className="action-button polls"
          onClick={() => setActiveTab('polls')}
        >
          <BarChart size={24} />
          <span>Poll History</span>
        </button>
      </div>
    </div>
  );

  const renderDepositTab = () => (
    <div className="transaction-form">
      <h3>Deposit Polo</h3>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="amount-input">
        <label htmlFor="depositAmount">Amount</label>
        <div className="input-group">
          <input
            type="number"
            id="depositAmount"
            min="10"
            max="1000"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            disabled={loading}
          />
          <span className="input-group-text">Polo</span>
        </div>
      </div>
      
      <div className="amount-presets">
        {[50, 100, 200, 500].map(amount => (
          <button
            key={amount}
            className={`preset-button ${depositAmount === amount ? 'active' : ''}`}
            onClick={() => setDepositAmount(amount)}
            disabled={loading}
          >
            {amount}
          </button>
        ))}
      </div>
      
      <div className="form-buttons">
        <button 
          className="cancel-button"
          onClick={() => setActiveTab('main')}
          disabled={loading}
        >
          Cancel
        </button>
        
        <button 
          className="confirm-button"
          onClick={handleDeposit}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Confirm Deposit'}
        </button>
      </div>
    </div>
  );

  const renderWithdrawTab = () => (
    <div className="transaction-form">
      <h3>Withdraw Polo</h3>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="amount-input">
        <label htmlFor="withdrawAmount">Amount</label>
        <div className="input-group">
          <input
            type="number"
            id="withdrawAmount"
            min="10"
            max={user?.poloBalance || 0}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(Number(e.target.value))}
            disabled={loading}
          />
          <span className="input-group-text">Polo</span>
        </div>
      </div>
      
      <div className="amount-presets">
        {[50, 100, 200, 500].map(amount => (
          <button
            key={amount}
            className={`preset-button ${withdrawAmount === amount ? 'active' : ''}`}
            onClick={() => setWithdrawAmount(amount)}
            disabled={loading || (user?.poloBalance || 0) < amount}
          >
            {amount}
          </button>
        ))}
      </div>
      
      <div className="available-balance">
        Available: <span>{user?.poloBalance || 0} Polo</span>
      </div>
      
      <div className="form-buttons">
        <button 
          className="cancel-button"
          onClick={() => setActiveTab('main')}
          disabled={loading}
        >
          Cancel
        </button>
        
        <button 
          className="confirm-button"
          onClick={handleWithdraw}
          disabled={loading || withdrawAmount > (user?.poloBalance || 0)}
        >
          {loading ? 'Processing...' : 'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="transactions-list">
      <h3>Transaction History</h3>
      
      <button 
        className="back-button"
        onClick={() => setActiveTab('main')}
      >
        Back
      </button>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="no-data">No transactions found</div>
      ) : (
        <div className="transactions-table">
          {transactions.map(transaction => (
            <div 
              key={transaction.id}
              className={`transaction-item ${transaction.type === 'credit' ? 'credit' : 'debit'}`}
            >
              <div className="transaction-details">
                <div className="transaction-description">{transaction.description}</div>
                <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
              </div>
              
              <div className="transaction-amount">
                {transaction.type === 'credit' ? '+' : '-'}{Math.abs(transaction.amount)} Polo
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPollsTab = () => (
    <div className="polls-history">
      <h3>Poll History</h3>
      
      <button 
        className="back-button"
        onClick={() => setActiveTab('main')}
      >
        Back
      </button>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : polls.length === 0 ? (
        <div className="no-data">No polls created yet</div>
      ) : (
        <div className="polls-grid">
          {polls.map(poll => (
            <div key={poll.id} className="poll-history-item">
              <div className="poll-description">{poll.description}</div>
              
              <div className="poll-thumbnail">
                {poll.options[0] && (
                  <img src={`http://localhost:3001${poll.options[0].imageUrl}`} alt="Poll thumbnail" />
                )}
                <div className="poll-options-count">+{poll.options.length - 1} more</div>
              </div>
              
              <div className="poll-stats">
                <div className="poll-votes">
                  <span className="label">Votes:</span>
                  <span className="value">{poll.totalVotes} / {poll.requiredVotes}</span>
                </div>
                <div className="poll-date">{formatDate(poll.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.div 
      className="redeem-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="redeem-card">
        {success && (
          <div className="alert alert-success">{success}</div>
        )}
        
        {activeTab === 'main' && renderMainTab()}
        {activeTab === 'deposit' && renderDepositTab()}
        {activeTab === 'withdraw' && renderWithdrawTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'polls' && renderPollsTab()}
      </div>
    </motion.div>
  );
};

export default RedeemPage;