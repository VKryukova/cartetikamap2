const map = new maplibregl.Map({
  container: "map",
  style:
    "https://raw.githubusercontent.com/gtitov/basemaps/refs/heads/master/positron-nolabels.json",
  center: [90, 57],
  zoom: 2,
});

function updateZoomForMobile() {
  if (window.innerWidth <= 450) {
    map.setZoom(0.9);
    map.setCenter([95, 65]);
  } else {
    map.setZoom(2);
    map.setCenter([90, 57]);
  }
}

window.addEventListener("load", updateZoomForMobile);
window.addEventListener("resize", updateZoomForMobile);

function updateSelectedList() {
  const features = map.queryRenderedFeatures({
    layers: ["clusters"],
  });

  document.getElementById("list-selected").innerHTML =
    "<h2>Сейчас на карте</h2>";

  features.map((f) => {
    if (f.properties.cluster) {
      const clusterId = f.properties.cluster_id;
      const pointCount = f.properties.point_count;
      map
        .getSource("cities")
        .getClusterLeaves(clusterId, pointCount, 0)
        .then((clusterFeatures) => {
          clusterFeatures.map(
            (feature) =>
              (document.getElementById(
                "list-selected"
              ).innerHTML += `<div class="list-item">
                         <h4><a href='#' onclick="map.flyTo({center: [${feature.geometry.coordinates}], zoom: 10})">${feature.properties["Город"]}</a></h4>
                        </div><hr>`)
          );
        });
    } else {
      document.getElementById(
        "list-selected"
      ).innerHTML += `<div class="list-item">
                     <h4><a href='#' onclick="map.flyTo({center: [${f.geometry.coordinates}], zoom: 10})">${f.properties["Город"]}</a></h4>
                    </div><hr>`;
    }
  });
}

map.on("load", () => {
  map.addSource("russia-boundary", {
    type: "geojson",
    data: "./data/russia.geojson",
  });

  map.addLayer({
    id: "russia-fill",
    source: "russia-boundary",
    type: "fill",
    paint: {
      "fill-color": "#dae0b8",
      "fill-opacity": 0.3,
    },
    beforeId: "clusters",
  });

  fetch(
    "https://docs.google.com/spreadsheets/d/1OcPpq0sigqPR0f4P5WAcHBdISJjzJ6kGBa0ZLRjZK-g/export?format=csv"
  )
    .then((response) => response.text())
    .then((csv) => {
      const rows = Papa.parse(csv, { header: true });
      const geojsonFeatures = rows.data.map((row) => {
        return {
          type: "Feature",
          properties: row,
          geometry: {
            type: "Point",
            coordinates: [row.lon, row.lat],
          },
        };
      });
      const geojson = {
        type: "FeatureCollection",
        features: geojsonFeatures,
      };

      map.addSource("cities", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 20,
      });

      map.addLayer({
        id: "clusters",
        source: "cities",
        type: "circle",
        paint: {
          "circle-color": [
            "case",
            ["has", "point_count"],
            [
              "step",
              ["get", "point_count"],

              "#74a892",
              2,
              "#f08441",
              5,
              "#f0daa5",
            ],
            "#74a892",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#FFFFFF",
          "circle-radius": ["step", ["get", "point_count"], 12, 3, 20, 6, 30],
        },
      });

      map.addLayer({
        id: "clusters-labels",
        type: "symbol",
        source: "cities",
        layout: {
          "text-field": ["get", "point_count"],
          "text-size": 10,
        },
      });

      map.addLayer({
        id: "unclustered-labels",
        type: "symbol",
        source: "cities",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "Город"],
          "text-size": 12,
          "text-offset": [0, 0.75],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 1,
        },
      });

      geojson.features.map((f) => {
        document.getElementById(
          "list-all"
        ).innerHTML += `<div class="list-item">
                        <h4><a href='#' onclick="map.flyTo({center: [${f.geometry.coordinates}], zoom: 10})">${f.properties["Город"]}</a></h4>
                        </div><hr>`;
      });

      // first update
      map.once("idle", updateSelectedList);

      // update when moving
      map.on("moveend", () => {
        map.once("idle", updateSelectedList);
      });

      // clusters
      map.on("click", "clusters", function (e) {
        map.flyTo({ center: e.lngLat, zoom: 8 });
      });

      map.on("mouseenter", "clusters", function () {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "clusters", function () {
        map.getCanvas().style.cursor = "";
      });
    });
});
