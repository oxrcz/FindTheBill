
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
    const valueCell = row.insertCell(1);
    const trackedCountCell = row.insertCell(2);

    const link = document.createElement('a');
    link.href = `/bill/${bill.serial_number}`;
    link.textContent = bill.serial_number;
    serialCell.appendChild(link);

    valueCell.textContent = bill.billValue ? `$${bill.billValue}` : 'N/A';
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
      return;
    }
    
    const resolvedData = await Promise.all(
      billsData.map(async (bill) => {
        try {
          const response = await fetch(`/api/bill/${bill.serial_number}`);
          if (!response.ok) throw new Error('Failed to fetch bill data');
          const data = await response.json();
          return {
            ...bill,
            billValue: data.billValue
          };
        } catch (err) {
          console.error(`Error fetching bill ${bill.serial_number}:`, err);
          return { ...bill, billValue: null };
        }
      })
    );
    
    const filtered = resolvedData.filter(bill => {
      try {
        return bill.billValue === parseInt(selectedValue);
      } catch (err) {
        console.error(`Error filtering bill ${bill.serial_number}:`, err);
        return false;
      }
    });
    renderTable(filtered);
  } catch (error) {
    console.error('Error filtering data:', error);
    billsTableBody.innerHTML = '<tr><td colspan="2">Error loading bills data</td></tr>';
  }
});

// Fetch the data immediately
fetch('/api/most_tracked_bills')
  .then(async response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Get bill values from valid bills
    const billsWithValues = await Promise.all(
      data.map(async bill => {
        try {
          const response = await fetch(`/api/valid-bill/${bill.serial_number}`);
          if (!response.ok) throw new Error('Failed to fetch bill data');
          const validBill = await response.json();
          return { ...bill, billValue: validBill.bill_value };
        } catch (error) {
          console.error(`Error fetching bill ${bill.serial_number}:`, error);
          return { ...bill, billValue: null };
        }
      })
    );
    return billsWithValues;
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
