
const citiesTableBody = document.getElementById('citiesTable').getElementsByTagName('tbody')[0];

fetch('/api/most_tracked_cities')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (!data || data.length === 0) {
      const row = citiesTableBody.insertRow();
      const cell = row.insertCell(0);
      cell.colSpan = 2;
      cell.textContent = 'No tracked cities found';
      return;
    }

    data.forEach((city, index) => {
      const row = citiesTableBody.insertRow();
      const cityCell = row.insertCell(0);
      const trackedCountCell = row.insertCell(1);

      cityCell.textContent = `${city.city}, ${city.state}`;
      trackedCountCell.textContent = city.tracked_count;
      
      // Alternate row colors
      row.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
    });
  })
  .catch(error => {
    // Clear table body
    citiesTableBody.innerHTML = '';
    
    // Add error row
    const row = citiesTableBody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 2;
    cell.style.color = '#721c24';
    cell.style.backgroundColor = '#f8d7da';
    cell.style.padding = '15px';
    cell.style.textAlign = 'center';
    cell.textContent = `Error loading tracked cities: ${error.message}`;
  });
