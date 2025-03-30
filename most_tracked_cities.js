
fetch('/api/most_tracked_cities')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const citiesTableBody = document.getElementById('citiesTable').getElementsByTagName('tbody')[0];

    if (!data || data.length === 0) {
      const row = citiesTableBody.insertRow();
      const cell = row.insertCell(0);
      cell.colSpan = 2;
      cell.textContent = 'No tracked cities found';
      return;
    }

    data.forEach(city => {
        const row = citiesTableBody.insertRow();
        const cityCell = row.insertCell(0);
        const trackedCountCell = row.insertCell(1);

        cityCell.textContent = city.city;
        trackedCountCell.textContent = city.trackedCount;
    });
  })
  .catch(error => {
    const citiesTable = document.getElementById('citiesTable');
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    errorDiv.textContent = `Error loading tracked cities: ${error.message}`;
    citiesTable.parentNode.insertBefore(errorDiv, citiesTable);
  });
