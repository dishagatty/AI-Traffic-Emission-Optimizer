# FlowCast Mangaluru

FlowCast is a traffic-analysis and decision-support application for selected Mangaluru road corridors. It combines historical traffic scenarios, live traffic services, congestion predictions, and saved SUMO simulation results in user and administrator dashboards.

## Features

- **Traffic map and road details:** Explore monitored roads in the user and admin dashboards. Scenario markers are based on the project's existing traffic data; selecting a marker can request current speed, travel-time, confidence, and closure information from TomTom.
- **Route planner:** Select starting and destination points on the map or monitored-road markers. The application resolves map points to place names and coordinates, then displays route geometry, distance, and estimated travel time for **Drive**, **Walking**, or **Cycling**.
  - Driving routes request traffic-aware estimates and can include traffic delay and no-traffic travel time.
  - Walking and cycling routes do not show driving traffic-delay metrics. Route availability depends on the provider's coverage and API access.
- **AI congestion analysis:** Run the trained XGBoost model, inspect predicted congestion and class probabilities, and review TreeSHAP feature contributions.
- **What-if and intervention analysis:** Compare model predictions for changed scenario inputs and view saved SUMO intervention comparisons.
- **Emissions and reports:** Review saved simulation emission metrics and download a text analysis report or a CSV of SUMO comparison data. The text report can be printed or saved as PDF from a document editor; it is not a generated PDF.
- **Authentication and dashboards:** Sign-in and role-based user/admin views are backed by the FastAPI service.
- **Project information:** The landing page includes an animated traffic-network illustration and About/Contact sections.

## Data and estimates

The map brings together two different sources that should not be confused:

- **Scenario and road-detail values** come from the project's processed Mangaluru traffic data.
- **Live traffic and routing results** are requested from TomTom when the relevant feature is used. Live results require a configured API key and applicable provider access.
- **Predictions** are outputs of the bundled trained model for the submitted scenario inputs.
- **SUMO comparisons and emissions** are saved simulation outputs, not live road measurements or live pollutant readings.

Travel times and road conditions can change. Walking and cycling results are provider route estimates and do not include live driving-traffic delay.

## Project layout

```text
backend/       FastAPI API, authentication, database, and TomTom services
frontend/      React + Vite web application
data/          Raw and processed traffic datasets and simulation comparisons
ml/model/      Trained congestion model and supporting model files
scripts/       Prediction and recommendation helpers
sumo/          SUMO scenarios and saved simulation outputs
```

## Requirements

- Python with the backend dependencies installed (`fastapi`, `uvicorn`, `pandas`, `requests`, `python-dotenv`, `pydantic`, `SQLAlchemy`, `PyMySQL`, `PyJWT`, `pwdlib`, `email-validator`, `joblib`, and `xgboost`).
- Node.js and npm.
- A configured MySQL database and the project's required user table.
- A TomTom API key for live traffic, reverse geocoding, and route planning.

The repository does not currently include a backend dependency lock or requirements file. Install dependencies in your chosen Python environment before starting the API.

## Configuration

Create `backend/.env` with the values for your own environment; do not commit credentials:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=traffic_optimizer
DB_USER=traffic_app
DB_PASSWORD=replace-with-your-database-password
JWT_SECRET=replace-with-a-long-random-secret
TOMTOM_API_KEY=replace-with-your-tomtom-api-key
```

The backend reads `TOMTOM_API_KEY` for TomTom services. The frontend defaults to `http://127.0.0.1:8000`; to use another API address, set `VITE_API_BASE_URL` in `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Keep local environment files and secrets out of source control. Configure the database and initialize the required schema before using registration and sign-in.

## Run locally

Start the API from the repository root:

```powershell
python -m uvicorn backend.main:app --reload
```

In another terminal, install frontend packages and start the web application:

```powershell
Set-Location frontend
npm install
npm run dev
```

Vite prints the local frontend URL. The API's interactive documentation is available at `http://127.0.0.1:8000/docs`.

## Validate

From `frontend/`:

```powershell
npm run build
npm run lint
```

Route planning uses the authenticated `POST /route` endpoint with `origin`, `destination`, and an optional `travel_mode` (`car`, `pedestrian`, or `bicycle`; defaults to `car`). Place-name lookup uses the authenticated `GET /reverse-geocode` endpoint.
