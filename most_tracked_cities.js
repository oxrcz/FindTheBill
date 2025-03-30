fetch('/api/most-tracked-cities')
  .then(response => response.json())
  .then(data => {
    const citiesTableBody = document.getElementById('citiesTable').getElementsByTagName('tbody')[0];

    data.forEach(city => {
        const row = citiesTableBody.insertRow();
        const cityCell = row.insertCell(0);
        const trackedCountCell = row.insertCell(1);

        cityCell.textContent = city.city;
        trackedCountCell.textContent = city.trackedCount;
    });
  })
  .catch(error => {
    const errorContainer = document.createElement('div');
    errorContainer.style.color = 'red';
    errorContainer.style.fontWeight = 'bold';
    errorContainer.textContent = `Error fetching most tracked cities: ${error.message}`;
    
    document.body.appendChild(errorContainer); // Add error message to the body of the page
  });
