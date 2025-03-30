# FindTheBill.net

FindTheBill.net is a web application that tracks the movement of currency bills based on their serial numbers. Users can enter bill serial numbers to see where they've been, view the most tracked bills, and check the cities where bills have been most frequently found.

## Features
- Track bills using their serial numbers
- View bill tracking history (cities and states)
- See the most tracked bills
- Discover the most tracked cities
- Prevents excessive tracking using a 1-day cooldown per bill

## Project Structure
```
/findthebill
  ├── bills_data.json             # Stores bill tracking data
  ├── index.html                  # Homepage for entering bill serial numbers
  ├── server.js                   # Backend server handling requests
  ├── package.json                # Project dependencies and scripts
  ├── most_tracked_bills.html     # Displays most tracked bills
  ├── most_tracked_cities.html    # Displays most tracked cities
  ├── most_tracked_bills.js       # Frontend logic for most tracked bills page
  ├── most_tracked_cities.js      # Frontend logic for most tracked cities page
```

## Installation
Follow these steps to run the project locally:

1. **Clone the repository:**
    ```bash
    git clone https://github.com/oxrcz/FindTheBill.git
    cd FindTheBill
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Start the server:**
    ```bash
    node server.js
    ```

4. **Access the application:**
    Open your browser and navigate to `http://localhost:3000`

## API Endpoints
- `POST /track` - Track a bill by its serial number
- `GET /api/most-tracked-bills` - Get the most tracked bills
- `GET /api/most-tracked-cities` - Get the most tracked cities

## Contributing
Feel free to submit issues and pull requests for improvements!

## License
This project is licensed under the MIT License.

---

**Note:** Ensure `bills_data.json` exists and is writable to store tracking data. If not, create an empty JSON file:
```json
{}
```

