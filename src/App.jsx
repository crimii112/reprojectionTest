import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { MapNgii } from '@/components/map';
import { ProjectionTest } from '@/components/wind/projection-test';
import { EarthTest } from '@/components/wind/earth-test';
import { ProjectionTestLcc } from '@/components/wind/projection-test-lcc';
import { ProjectionTestUtm } from '@/components/wind/projection-test-utm';
import { ProjectionTestUtmOlWind } from '@/components/wind/projection-test-utm-ol-wind';
import { EarthMap } from '@/components/wind/earth-map';
import { OlEarth } from '@/components/wind/ol-earth';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-x-hidden bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="earthTest">
                  <EarthTest mapId="earthTest" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/lcc"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="projectionTestLcc">
                  <ProjectionTestLcc mapId="projectionTestLcc" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/utm"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="projectionTestUtm">
                  <ProjectionTestUtm mapId="projectionTestUtm" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/utm/olwind"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="projectionTestUtmOlWind">
                  <ProjectionTestUtmOlWind mapId="projectionTestUtmOlWind" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/projection-test"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="projectionTest">
                  <ProjectionTest mapId="projectionTest" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/ol-earth"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="olEarth">
                  <OlEarth mapId="olEarth" />
                </MapNgii>
              </div>
            }
          />
          <Route
            path="/earth"
            element={
              <div className="w-screen h-screen">
                <EarthMap />
              </div>
            }
          />
        </Routes>
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </BrowserRouter>
  );
}

export default App;
