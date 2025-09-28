const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testProtectedRoutes() {
  try {
    console.log('🧪 Testing Protected Routes...\n');

    // Step 1: Login to get token
    console.log('1. Logging in to get token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'john.doe@example.com',
      password: 'SecurePass123'
    });
    const { token } = loginResponse.data.data;
    console.log('✅ Login successful, token received');

    // Step 2: Access protected route with token
    console.log('\n2. Accessing protected profile route...');
    const profileResponse = await axios.get(`${API_BASE}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile fetched:', profileResponse.data.data.user.name);

    // Step 3: Try accessing without token
    console.log('\n3. Trying to access without token...');
    try {
      await axios.get(`${API_BASE}/user/profile`);
    } catch (error) {
      console.log('✅ Access denied without token:', error.response.data.message);
    }

    // Step 4: Update profile
    console.log('\n4. Updating profile...');
    const updateResponse = await axios.put(`${API_BASE}/user/profile`, {
      name: 'John Updated',
      bio: 'Updated bio'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile updated:', updateResponse.data.message);

    console.log('\n🎉 All protected route tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProtectedRoutes();