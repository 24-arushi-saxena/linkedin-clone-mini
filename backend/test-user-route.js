const axios = require('axios');

// First, signup to get a token
axios.post('http://localhost:5000/api/auth/signup', {
  email: `test${Date.now()}@test.com`,
  name: 'Test User',
  password: 'Test123456'
}).then(response => {
  const token = response.data.data.token;
  console.log('Token:', token);
  
  // Now test the profile route
  return axios.get('http://localhost:5000/api/user/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
}).then(response => {
  console.log('Profile response:', response.data);
}).catch(error => {
  console.error('Error:', error.response?.data || error.message);
});