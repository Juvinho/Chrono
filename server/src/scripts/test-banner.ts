
import fetch from 'node-fetch'; // Try node-fetch, or assume global fetch if Node 18+
// If node-fetch fails, I'll remove the import and rely on global fetch

const API_URL = 'http://localhost:3001/api';

async function run() {
  const username = `test_banner_${Date.now()}`;
  const password = 'password123';
  const email = `${username}@example.com`;

  console.log(`Creating user: ${username}`);

  // 1. Register
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      captchaVerified: true
    })
  });

  if (!regRes.ok) {
    console.error('Register failed:', await regRes.text());
    return;
  }

  const regData = await regRes.json() as any;
  const token = regData.token;
  console.log('Registered. Token obtained.');

  // 2. Update Banner (root property)
  const newBanner = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='; // Red dot

  console.log('Updating banner (root property)...');
  const updateRes = await fetch(`${API_URL}/users/${username}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      coverImage: newBanner
    })
  });

  if (!updateRes.ok) {
    console.error('Update failed:', await updateRes.text());
    return;
  }

  const updateData = await updateRes.json() as any;
  console.log('Update response coverImage length:', updateData.coverImage?.length);
  
  if (updateData.coverImage === newBanner) {
      console.log('✅ Banner updated successfully (returned in response)');
  } else {
      console.log('❌ Banner mismatch in response');
  }

  // 3. Verify via GET
  const getRes = await fetch(`${API_URL}/users/${username}`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  const getData = await getRes.json() as any;
  
  if (getData.coverImage === newBanner) {
      console.log('✅ Banner persisted successfully (verified via GET)');
  } else {
      console.log('❌ Banner mismatch in GET');
  }

  // 4. Update via profileSettings
  console.log('Updating banner via profileSettings...');
  const newBanner2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='; // Same red dot
  
  const updateRes2 = await fetch(`${API_URL}/users/${username}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      profileSettings: {
          coverImage: newBanner2,
          theme: 'dark'
      },
      coverImage: newBanner2 // App.tsx sends both usually
    })
  });
  
  const updateData2 = await updateRes2.json() as any;
  console.log('Update 2 response profileSettings.coverImage length:', updateData2.profileSettings?.coverImage?.length);

  if (updateData2.profileSettings?.coverImage === newBanner2) {
      console.log('✅ Banner updated in profileSettings');
  } else {
      console.log('❌ Banner mismatch in profileSettings');
  }
}

run().catch(console.error);
