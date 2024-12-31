import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Create an axios instance with base URL and headers
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', 
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/login/')) {
      originalRequest._retry = true;

      try {
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        
        if (!username || !password) {
          throw new Error('No stored credentials');
        }

        const response = await api.post('/api/login/', {
          username: username,
          password: password
        });

        if (response.data && response.data.tokens) {
          localStorage.setItem('access_token', response.data.tokens.access);
          localStorage.setItem('refresh_token', response.data.tokens.refresh);
          api.defaults.headers['Authorization'] = `Bearer ${response.data.tokens.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.clear();  // Clear all stored data
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

const App = () => {
  const [entries, setEntries] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  // Form data for registration and login
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });


 // Form data for new entries
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: ''
  });

  // Check if user is logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch entries when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchEntries();
    }
  }, [isLoggedIn]);


  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/wilt/register/', formData);
      if (response.status === 201) {
        setError('Registration successful! Please login.');
        setIsRegistering(false);
        setFormData({ username: '', password: '', email: '' });
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      console.error('Registration error:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      console.log("Login attempt with data:", {
        username: formData.username,
        password: formData.password
      });
    
      const response = await api.post('/api/login/', {
        username: formData.username,
        password: formData.password
      });

      console.log("Login response:", response);
      
      if (response.data && response.data.tokens && response.data.tokens.access) {
        console.log("Login successful, storing tokens...");
        // Store tokens
        localStorage.setItem('access_token', response.data.tokens.access);
        localStorage.setItem('refresh_token', response.data.tokens.refresh);
        
        // Store credentials for token refresh
        localStorage.setItem('username', formData.username);
        localStorage.setItem('password', formData.password);

        console.log("Setting authorization header...");
        // Set the default Authorization header
        api.defaults.headers['Authorization'] = `Bearer ${response.data.tokens.access}`;

        setIsLoggedIn(true);
        setError('');
        
        console.log("Fetching entries...");
        // Fetch entries after successful login
        try {
          await fetchEntries();
        } catch (fetchError) {
          console.error('Error fetching entries:', fetchError);
          if (fetchError.response?.status === 401) {
            handleLogout();
          }
        }
      } else {
        console.error('Invalid response structure:', response.data);
        setError('Login failed - Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data);
      setError(error.response?.data?.error || 'Invalid credentials');
    }
  };



  const handleLogout = () => {
    // Clear all storage
    localStorage.clear();
    
    // Reset headers
    api.defaults.headers['Authorization'] = '';
    
    // Reset state
    setIsLoggedIn(false);
    setEntries([]);
    setError('');
    
    // Reset form to default values
    setFormData({
      username: 'Ancy',
      password: 'ancy123',
      email: ''
    });
  };

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Fetching entries with token:', token);
      
      if (!token) {
        console.log('No token found');
        setIsLoggedIn(false);
        return;
      }

      // Ensure the Authorization header is set
      api.defaults.headers['Authorization'] = `Bearer ${token}`;

      const response = await api.get('/api/entries/');
      console.log("Entries fetched:", response.data);
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
      if (error.response?.status === 401) {
        console.log('Unauthorized - logging out');
        setIsLoggedIn(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
      }
      throw error; // Propagate the error
    }
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/entries/', {
        title: newEntry.title,
        content: newEntry.content
      });
      
      if (response.status === 201) {
        setNewEntry({ title: '', content: '' });
        fetchEntries();
      }
    } catch (error) {
      console.error('Error creating entry:', error.response?.data);
    }
  };

  const handleEntryChange = (e) => {
    setNewEntry({
      ...newEntry,
      [e.target.name]: e.target.value
    });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };



  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">WILT</h1>
          <h2 className="login-subtitle">
            {isRegistering ? 'Register' : 'Login'}
          </h2>
          
          {error && (
            <p className={`error-message ${error.includes('successful') ? 'success' : 'error'}`}>
              {error}
            </p>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            {isRegistering && (
              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <button type="submit" className="submit-button">
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>

          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setFormData({ username: '', password: '', email: '' });
            }}
            className="toggle-button"
          >
            {isRegistering ? 'Back to Login' : 'Create Account'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="entries-container">
      <div className="header">
        <h1>WILT</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <h2>What I Learned Today</h2>
      
       {/* Add Entry Form */}
       <form onSubmit={handleEntrySubmit} className="entry-form">
        <div className="form-group">
          <input
            type="text"
            name="title"
            placeholder="Enter title"
            value={newEntry.title}
            onChange={handleEntryChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <textarea
            name="content"
            placeholder="What did you learn today?"
            value={newEntry.content}
            onChange={handleEntryChange}
            className="form-input"
            rows="4"
            required
          />
        </div>
        <button type="submit" className="submit-button">
          Add Entry
        </button>
      </form>
      {/* Display Entries */}
      <div className="entries-list">
        {entries.length === 0 ? (
          <p>No entries yet</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="entry-item">
              <p>{entry.content}</p>
              <small>{new Date(entry.created_at).toLocaleString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
