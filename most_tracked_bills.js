fetch('/api/most-tracked-bills')
  .then(response => response.json())
  .then(data => {
    const billsTableBody = document.getElementById('billsTable').getElementsByTagName('tbody')[0];

    data.forEach(bill => {
        const row = billsTableBody.insertRow();
        const serialCell = row.insertCell(0);
        const trackedCountCell = row.insertCell(1);

        serialCell.textContent = bill.serialNumber;
        trackedCountCell.textContent = bill.trackedCount;
    });
  })
  .catch(error => {
    const errorContainer = document.createElement('div');
    errorContainer.style.color = 'red';
    errorContainer.style.fontWeight = 'bold';
    errorContainer.textContent = `Error fetching most tracked bills: ${error.message}`;
    
    document.body.appendChild(errorContainer); // Add error message to the body of the page
  });
