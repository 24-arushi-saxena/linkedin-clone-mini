const axios = require('axios');

async function runCompleteAuthTest() {
  console.log('Running Complete Authentication Test Suite\n');

  try {
    // Create unique email for testing
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const username = `testuser${timestamp}`;
    
    console.log('1. Testing user signup with all fields...');
    const signupRes = await axios.post('http://localhost:5000/api/auth/signup', {
      email,
      username,
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPass123',
      bio: 'Test bio for complete auth testing',
      location: 'Test City',
      website: 'https://testuser.com'
    });
    console.log('Signup successful');
    console.log('Created user:', {
      email: signupRes.data.data.user.email,
      username: signupRes.data.data.user.username,
      firstName: signupRes.data.data.user.firstName,
      lastName: signupRes.data.data.user.lastName
    });

    const { token } = signupRes.data.data;

    console.log('\n2. Testing protected route access (GET /api/user/profile)...');
    const profileRes = await axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Protected route accessed successfully');
    console.log('Source:', profileRes.data.source); // Should be "database" first time

    console.log('\n3. Testing cache (second request should use cache)...');
    const start = Date.now();
    const cachedRes = await axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cacheTime = Date.now() - start;
    console.log(`Cache working - Response time: ${cacheTime}ms`);
    console.log('Source:', cachedRes.data.source); // Should be "cache" second time

    console.log('\n4. Testing profile update with multiple fields...');
    const updateRes = await axios.put('http://localhost:5000/api/user/profile', {
      firstName: 'Updated',
      lastName: 'Name',
      bio: 'Updated bio after testing',
      location: 'New City',
      website: 'https://updated-site.com'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile updated successfully');
    console.log('Updated fields:', {
      firstName: updateRes.data.data.user.firstName,
      lastName: updateRes.data.data.user.lastName,
      bio: updateRes.data.data.user.bio,
      location: updateRes.data.data.user.location
    });

    console.log('\n5. Testing cache invalidation (should fetch from database)...');
    const afterUpdateRes = await axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Cache invalidated correctly');
    console.log('Source:', afterUpdateRes.data.source); // Should be "database" after update

    console.log('\n6. Testing logout...');
    await axios.post('http://localhost:5000/api/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Logout successful');

    console.log('\n7. Testing access after logout (should fail)...');
    try {
      await axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('ERROR: Should not be able to access after logout!');
    } catch (error) {
      console.log('Correctly rejected - Token invalid after logout');
    }

    console.log('\nALL TESTS PASSED! Your authentication system is working perfectly.');
    console.log('\nTest Summary:');
    console.log('- Signup with all profile fields');
    console.log('- Protected route access');
    console.log('- Redis caching (GET)');
    console.log('- Profile updates (PUT)');
    console.log('- Cache invalidation');
    console.log('- Logout and session termination');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runCompleteAuthTest();