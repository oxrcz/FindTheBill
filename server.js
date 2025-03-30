// Helper function to get most tracked bills
function getMostTrackedBills(billsData) {
  const trackedBills = Object.keys(billsData).map(serialNumber => {
    return {
      serialNumber,
      trackedCount: billsData[serialNumber].trackedHistory.length
    };
  });

  trackedBills.sort((a, b) => b.trackedCount - a.trackedCount);
  return trackedBills;
}

// Helper function to get most tracked cities
function getMostTrackedCities(billsData) {
  const cityCount = {};

  Object.values(billsData).forEach(bill => {
    bill.trackedHistory.forEach(entry => {
      const city = entry.city;
      if (cityCount[city]) {
        cityCount[city]++;
      } else {
        cityCount[city] = 1;
      }
    });
  });

  const trackedCities = Object.keys(cityCount).map(city => {
    return {
      city,
      trackedCount: cityCount[city]
    };
  });

  trackedCities.sort((a, b) => b.trackedCount - a.trackedCount);
  return trackedCities;
}

// Endpoint to get most tracked bills
app.get('/api/most-tracked-bills', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedBills = getMostTrackedBills(billsData);
  res.json(mostTrackedBills);
});

// Endpoint to get most tracked cities
app.get('/api/most-tracked-cities', (req, res) => {
  const billsData = readBillsData();
  const mostTrackedCities = getMostTrackedCities(billsData);
  res.json(mostTrackedCities);
});
