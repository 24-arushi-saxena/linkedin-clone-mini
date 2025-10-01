const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/auth';

async function testAuth() {
  try {
    console.log('Testing Authentication APIs...\n');

    // Test 1: Signup with new fields
    console.log('1. Testing Signup...');
    const signupResponse = await axios.post(`${API_BASE}/signup`, {
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePass123',
      bio: 'Software developer',
      location: 'San Francisco',
      website: 'https://johndoe.com'
    });
    console.log('Signup successful:', signupResponse.data.message);
    const { token, user } = signupResponse.data.data;
    console.log('User created:', {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName
    });

    // Test 2: Login
    console.log('\n2. Testing Login...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: 'john.doe@example.com',
      password: 'SecurePass123'
    });
    console.log('Login successful:', loginResponse.data.message);
    console.log('Token received:', loginResponse.data.data.token.substring(0, 20) + '...');

    // Test 3: Invalid login
    console.log('\n3. Testing Invalid Login...');
    try {
      await axios.post(`${API_BASE}/login`, {
        email: 'john.doe@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('Invalid login rejected:', error.response.data.message);
    }

    // Test 4: Duplicate email signup
    console.log('\n4. Testing Duplicate Email...');
    try {
      await axios.post(`${API_BASE}/signup`, {
        email: 'john.doe@example.com',
        username: 'johndoe2',
        password: 'SecurePass123'
      });
    } catch (error) {
      console.log('Duplicate email rejected:', error.response.data.message);
    }

    // Test 5: Logout
    console.log('\n5. Testing Logout...');
    const logoutResponse = await axios.post(`${API_BASE}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Logout successful:', logoutResponse.data.message);

    console.log('\nAll authentication tests passed!');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testAuth();