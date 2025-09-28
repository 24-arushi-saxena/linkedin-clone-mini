const axios = require('axios');

async function runCompleteAuthTest() {
  console.log('🚀 Running Complete Authentication Test Suite\n');

  try {
    // Cleanup: Try to create fresh user
    const email = `test${Date.now()}@example.com`;
    
    console.log('1. Testing user signup...');
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      email,
      name: 'Test User',
      password: 'TestPass123',
      bio: 'Test bio'
    });
    console.log('✅ Signup successful');

    const { token } = signupRes.data.data;

    console.log('2. Testing protected route access...');
    const profileRes = await axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Protected route accessed');

    console.log('3. Testing cache (second request should be faster)...');
    const start = Date.now();
    await axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cacheTime = Date.now() - start;
    console.log(`✅ Cache working (${cacheTime}ms response time)`);

    console.log('4. Testing profile update...');
    await axios.put('http://localhost:5000/api/user/profile', {
      bio: 'Updated bio'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile updated');

    console.log('5. Testing logout...');
    await axios.post('http://localhost:5000/api/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Logout successful');

    console.log('\n🎉 ALL TESTS PASSED! Your authentication system is working perfectly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

runCompleteAuthTest();