const axios = require('axios');

async function getLocationFromIpApi(ip) {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    if (response.data?.city && response.data?.region) {
      return {
        city: response.data.city,
        state: response.data.region
      };
    }
  } catch (error) {
    console.error('ipapi.co error:', error.message);
    return null;
  }
}

async function getLocationFromNavigator() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
          );

          if (response.data?.address) {
            resolve({
              city: response.data.address.city || response.data.address.town || response.data.address.village || 'Unknown',
              state: response.data.address.state || 'Unknown'
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Geocoding error:', error.message);
          resolve(null);
        }
      },
      () => resolve(null),
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

    // Fallback to geolocation
    const geoLocation = await getLocationFromNavigator();
    if (geoLocation) {
      return geoLocation;
    }

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