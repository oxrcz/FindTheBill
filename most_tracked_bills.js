
// Keep track of the current data
let billsData = [];

// Render the table with a loading message initially
const billsTableBody = document.getElementById('billsTable').getElementsByTagName('tbody')[0];
const loadingMessage = document.getElementById('loadingMessage');
const denominationFilter = document.getElementById('denominationFilter');

// Function to render the table
function renderTable(data) {
  billsTableBody.innerHTML = '';

  if (!data || data.length === 0) {
    const row = billsTableBody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 2;
    cell.textContent = 'No tracked bills found';
    return;
  }

  data.forEach((bill, index) => {
    const row = billsTableBody.insertRow();
    const serialCell = row.insertCell(0);
    const trackedCountCell = row.insertCell(1);

    const link = document.createElement('a');
    link.href = `/bill/${bill.serial_number}`;
    link.textContent = bill.serial_number;
    serialCell.appendChild(link);

    trackedCountCell.textContent = bill.tracked_count;
    row.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
  });
}

// Add event listener for denomination filter
denominationFilter.addEventListener('change', async () => {
  const selectedValue = denominationFilter.value;
  
  try {
    if (selectedValue === 'all') {
      renderTable(billsData);
    } else {
      const filteredData = billsData.filter(bill => {
        // Fetch the bill value from the server
        return fetch(`/api/bill/${bill.serial_number}`)
          .then(response => response.json())
          .then(data => data.billValue === parseInt(selectedValue));
      });
      
      // Wait for all promises to resolve
      const resolvedData = await Promise.all(
        billsData.map(async (bill) => {
          const response = await fetch(`/api/bill/${bill.serial_number}`);
          const data = await response.json();
          return {
            ...bill,
            billValue: data.billValue
          };
        })
      );
      
      const filtered = resolvedData.filter(bill => bill.billValue === parseInt(selectedValue));
      renderTable(filtered);
    }
  } catch (error) {
    console.error('Error filtering data:', error);
  }
});

// Fetch the data immediately
fetch('/api/most_tracked_bills')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    loadingMessage.remove();
    billsData = data; // Store the data
    renderTable(data);
  })
  .catch(error => {
    loadingMessage.remove();
    billsTableBody.innerHTML = '';
    const row = billsTableBody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 2;
    cell.style.color = '#721c24';
    cell.style.backgroundColor = '#f8d7da';
    cell.style.padding = '15px';
    cell.style.textAlign = 'center';
    cell.textContent = `Error loading tracked bills: ${error.message}`;
  });
