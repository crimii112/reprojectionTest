import { useEffect, useState } from 'react';
import { Feature, Map as OlMap, View } from 'ol';
import { Tile as TileLayer } from 'ol/layer';
import { OSM, WMTS } from 'ol/source';
import { get as getProjection, transform, transformExtent } from 'ol/proj';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { getTopLeft } from 'ol/extent';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import MapContext from './MapContext';

/*
 * Openlayers 지도 객체 만드는 파일
   - WMTS를 이용해 ais서버로 우회해서 지도타일이미지를 불러옴 ( 폐쇄망 및 모든 port를 뚫을 수 없는 특성 때문 )
   - layer는 기본이미지, 백지도, (위성지도-국토정보플랫폼 폐쇄망 서비스가 없음), 지도없음 으로 되어있음
 */

const MapNgii = ({ children, id = 'ngii' }) => {
  const [mapObj, setMapObj] = useState({});

  proj4.defs(
    'EPSG:5179',
    '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
  );
  proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
  proj4.defs(
    'CUSTOM',
    '+proj=lcc +lat_1=30 +lat_2=60 +lat_0=38 +lon_0=126 +x_0=0 +y_0=0 +a=6370000 +b=6370000 +units=m +no_defs'
  );
  register(proj4);

  const epsg5179 = getProjection('EPSG:5179');
  epsg5179.setExtent([-200000.0, -28024123.62, 31824123.62, 4000000.0]);

  const epsg4326 = getProjection('EPSG:4326');
  // epsg4326.setExtent([120.0, 30.0, 136.0, 42.5]);
  epsg4326.setExtent([90.0, 0.0, 150.0, 55.0]);

  const customProj = getProjection('CUSTOM');
  customProj.setExtent(
    transformExtent([90.0, 0.0, 150.0, 55.0], 'EPSG:4326', customProj)
  ); // [-4963916.717923589, -4079529.7265884588, 3372424.289850015, 2329106.5257526683]

  // EPSG:5179 타일 해상도 목록 (meters per pixel)
  const resolutions = [
    2088.96, 1044.48, 522.24, 261.12, 130.56, 65.28, 32.64, 16.32, 8.16, 4.08,
    2.04, 1.02, 0.51, 0.255,
  ];
  // 위도 37도 근처에서 경도 1도 ≈ 111,319.49m
  const meterPerDegree = 111319.49;
  const resolutions4326 = resolutions.map(r => r / meterPerDegree);

  // 측정소 데이터에 맞춘 extent
  const [mapLayer, setMapLayer] = useState([
    new TileLayer({
      source: new OSM({
        projection: epsg4326,
        tilePixelRatio: 5,
      }),
    }),
    new TileLayer({
      source: new WMTS({
        url: '/ais/proxy/ngii/hybrid',
        matrixSet: 'EPSG:5179',
        format: 'image/png',
        projection: epsg5179,
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(epsg5179.getExtent()),
          resolutions: resolutions,
          matrixIds: [
            'L05',
            'L06',
            'L07',
            'L08',
            'L09',
            'L10',
            'L11',
            'L12',
            'L13',
            'L14',
            'L15',
            'L16',
            'L17',
            'L18',
          ],
        }),
        style: 'korean',
        layer: 'korean_map',
        wrapX: true,
        // attributions: [ `<img style="width:96px; height:16px;"src="${urlvalue}/img/process/ms/map/common/img_btoLogo3.png" alt="로고">` ],   // 로고는 나중에 추가해야할 수도 있어서 완전 삭제는 안함
        crossOrigin: 'anonymous',
        tilePixelRatio: 5,
      }),
      id: 'base',
      minZoom: 1,
    }),
  ]);

  useEffect(() => {
    const map = new OlMap({
      layers: mapLayer,
      view: new View({
        projection: customProj,
        center: transform([127.5, 36.5], 'EPSG:4326', customProj),
        extent: customProj.getExtent(),
        maxZoom: resolutions.length - 1,
        minZoom: 0,
        zoom: 2,
        constrainResolution: true,
        resolutions: resolutions,
      }),
      logo: false,
      target: id,
    });
    // const map = new OlMap({
    //   layers: mapLayer,
    //   view: new View({
    //     projection: 'EPSG:4326',
    //     center: [127.5, 36.5],
    //     extent: epsg4326.getExtent(),
    //     maxZoom: resolutions4326.length - 1,
    //     minZoom: 0,
    //     zoom: 2,
    //     constrainResolution: true,
    //     resolutions: resolutions4326,
    //   }),
    //   logo: false,
    //   target: id,
    // });

    console.log(map.getView().getProjection().getExtent());
    map.on('singleclick', evt => {
      console.log(evt.coordinate);
    });

    setMapObj(map);
    return () => map.setTarget(undefined);
  }, [proj4]);

  return <MapContext.Provider value={mapObj}>{children}</MapContext.Provider>;
};

export default MapNgii;
