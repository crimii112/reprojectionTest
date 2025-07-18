import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { MapNgii } from '@/components/map';
import { ProjectionTest } from '@/components/wind/projection-test';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-x-hidden bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={
              <div className="w-screen h-screen">
                <MapNgii id="projectionTest">
                  <ProjectionTest mapId="projectionTest" />
                </MapNgii>
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
