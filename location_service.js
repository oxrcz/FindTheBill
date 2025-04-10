
const axios = require('axios');

async function getLocationFromIpApi(ip) {
  try {
    console.log('Attempting to get location from ipapi.co...');
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    if (response.data?.city && response.data?.region) {
      console.log('Successfully got location from ipapi.co');
      return {
        city: response.data.city,
        state: response.data.region
      };
    }
    console.log('ipapi.co response missing city or state data');
    return null;
  } catch (error) {
    console.error('ipapi.co error:', error.message);
    return null;
  }
}

async function getLocationFromNavigator() {
  return new Promise((resolve) => {
    console.log('Attempting to get location from browser geolocation...');
    if (!navigator.geolocation) {
      console.log('Browser geolocation not available');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          console.log('Got coordinates from browser, attempting reverse geocoding...');
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );

          if (response.data?.address) {
            console.log('Successfully got location from reverse geocoding');
            resolve({
              city: response.data.address.city || response.data.address.town || response.data.address.village || 'Unknown',
              state: response.data.address.state || 'Unknown'
            });
          } else {
            console.log('Reverse geocoding response missing address data');
            resolve(null);
          }
        } catch (error) {
          console.error('Geocoding error:', error.message);
          resolve(null);
        }
      },
      () => {
        console.log('Browser geolocation permission denied or error');
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
}

async function getLocation(ip) {
  try {
    // Try ipapi.co first
    const ipLocation = await getLocationFromIpApi(ip);
    if (ipLocation) {
      return ipLocation;
    }
    console.log('IP location failed, trying browser geolocation...');

    // Fallback to geolocation
    const geoLocation = await getLocationFromNavigator();
    if (geoLocation) {
      return geoLocation;
    }
    console.log('All location methods failed, using default location');

    // Default fallback
    return {
      city: "New York",
      state: "New York"
    };
  } catch (error) {
    console.error('Location detection error:', error);
    return {
      city: "New York",
      state: "New York"
    };
  }
}

module.exports = { getLocation };
