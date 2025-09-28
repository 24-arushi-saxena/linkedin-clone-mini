const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/auth';

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication APIs...\n');

    // Test 1: Signup
    console.log('1. Testing Signup...');
    const signupResponse = await axios.post(`${API_BASE}/signup`, {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'SecurePass123',
      bio: 'Software developer'
    });
    console.log('✅ Signup successful:', signupResponse.data.message);
    const { token, user } = signupResponse.data.data;

    // Test 2: Login
    console.log('\n2. Testing Login...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      email: 'john.doe@example.com',
      password: 'SecurePass123'
    });
    console.log('✅ Login successful:', loginResponse.data.message);

    // Test 3: Invalid login
    console.log('\n3. Testing Invalid Login...');
    try {
      await axios.post(`${API_BASE}/login`, {
        email: 'john.doe@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid login rejected:', error.response.data.message);
    }

    // Test 4: Logout
    console.log('\n4. Testing Logout...');
    const logoutResponse = await axios.post(`${API_BASE}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout successful:', logoutResponse.data.message);

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests
testAuth();