# FindTheBill.net

FindTheBill.net is a web application that tracks the movement of currency bills based on their serial numbers. Users can enter bill serial numbers to see where they've been, view the most tracked bills, and check the cities where bills have been most frequently found.

## Features
- Track bills using their serial numbers
- View bill tracking history (cities and states)
- See the most tracked bills
- Discover the most tracked cities
- Prevents excessive tracking using a cooldown period per bill

## Project Structure
```
/findthebill
  ├── bills.db                    # SQLite database for bill tracking
  ├── database.js                 # Database configuration and setup
  ├── index.html                  # Homepage for entering bill serial numbers
  ├── server.js                   # Backend server handling requests
  ├── package.json                # Project dependencies and scripts
  ├── most_tracked_bills.html     # Displays most tracked bills
  ├── most_tracked_cities.html    # Displays most tracked cities
  └── valid_bills.json           # List of valid bill serial numbers
```

## Technical Details
- Built with Node.js and Express
- Uses SQLite for data storage
- Implements geolocation for automatic city detection
- Interactive map visualization using Leaflet
- Responsive design for both desktop and mobile devices

## Usage
1. Enter a bill's serial number that has "FindTheBill.net" written on it
2. Your location will be automatically detected
3. Track the bill to contribute to its journey
4. View the bill's history on an interactive map

For questions or support, contact: contactfindthebill@gmail.com

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
