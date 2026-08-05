import { CATEGORY_META } from "./constants.js?v=20260805-2";
import { calculateDistanceKm, formatCost, formatDistance } from "./domain.js?v=20260805-2";

export class MapView {
  #map;
  #markers;
  #routeLayer = null;
  #selectionLayer = null;
  #routeSelection = [];
  #config;
  #onRouteSelection;

  constructor(elementId, config, onRouteSelection) {
    if (!window.L) throw new Error("Leaflet chưa tải được.");
    this.#config = config;
    this.#onRouteSelection = onRouteSelection;
    this.#map = L.map(elementId, { zoomControl: false }).setView(config.mapCenter, config.mapZoom);
    L.control.zoom({ position: "bottomright" }).addTo(this.#map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
    this.#markers = L.layerGroup().addTo(this.#map);
  }

  renderLocations(locations, voteSummary, handlers) {
    this.#markers.clearLayers();
    const bounds = [];
    for (const location of locations) {
      if (location.latitude === null || location.latitude === "" || location.latitude === undefined
        || location.longitude === null || location.longitude === "" || location.longitude === undefined) continue;
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      const meta = CATEGORY_META[location.primaryCategory] || CATEGORY_META.sightseeing;
      const icon = L.divIcon({
        className: "map-marker-wrap",
        html: `<span class="map-marker" style="--marker-color:${meta.color}" aria-hidden="true"><span>${meta.icon}</span></span>`,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42],
      });
      const marker = L.marker([latitude, longitude], { icon, title: location.name });
      marker.bindPopup(createPopup(location, voteSummary[location.id] || 0, handlers, () => this.selectForRoute(location)), {
        maxWidth: 310,
        minWidth: 250,
      });
      marker.addTo(this.#markers);
      bounds.push([latitude, longitude]);
    }
    if (bounds.length > 1) this.#map.fitBounds(bounds, { padding: [42, 42], maxZoom: 14 });
    else if (bounds.length === 1) this.#map.setView(bounds[0], 15);
  }

  selectForRoute(location) {
    const existingIndex = this.#routeSelection.findIndex((item) => item.id === location.id);
    if (existingIndex >= 0) this.#routeSelection.splice(existingIndex, 1);
    else {
      if (this.#routeSelection.length === 2) this.#routeSelection.shift();
      this.#routeSelection.push(location);
    }
    this.#drawSelectionLine();
    this.#onRouteSelection([...this.#routeSelection]);
  }

  clearRoute() {
    this.#routeSelection = [];
    if (this.#routeLayer) this.#map.removeLayer(this.#routeLayer);
    if (this.#selectionLayer) this.#map.removeLayer(this.#selectionLayer);
    this.#routeLayer = null;
    this.#selectionLayer = null;
    this.#onRouteSelection([]);
  }

  async drawRoadRoute() {
    if (this.#routeSelection.length !== 2) throw new Error("Hãy chọn đúng hai địa điểm.");
    const [from, to] = this.#routeSelection;
    const endpoint = `${this.#config.osrmBaseUrl}/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Dịch vụ định tuyến không phản hồi.");
    const result = await response.json();
    const route = result?.routes?.[0];
    if (result?.code !== "Ok" || !route?.geometry?.coordinates) throw new Error("Không tìm thấy tuyến đường phù hợp.");

    if (this.#routeLayer) this.#map.removeLayer(this.#routeLayer);
    const latLngs = route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
    this.#routeLayer = L.polyline(latLngs, { color: "#0f766e", weight: 5, opacity: 0.9 }).addTo(this.#map);
    this.#map.fitBounds(this.#routeLayer.getBounds(), { padding: [36, 36] });
    return { distanceKm: route.distance / 1000, durationMinutes: Math.round(route.duration / 60) };
  }

  getDirectDistance() {
    if (this.#routeSelection.length !== 2) return null;
    return calculateDistanceKm(this.#routeSelection[0], this.#routeSelection[1]);
  }

  invalidateSize() {
    this.#map.invalidateSize();
  }

  #drawSelectionLine() {
    if (this.#selectionLayer) this.#map.removeLayer(this.#selectionLayer);
    if (this.#routeLayer) this.#map.removeLayer(this.#routeLayer);
    this.#routeLayer = null;
    if (this.#routeSelection.length === 2) {
      const points = this.#routeSelection.map((item) => [item.latitude, item.longitude]);
      this.#selectionLayer = L.polyline(points, { color: "#64748b", dashArray: "7 8", weight: 3 }).addTo(this.#map);
    } else {
      this.#selectionLayer = null;
    }
  }
}

function createPopup(location, votes, handlers, onRouteSelect) {
  const root = element("article", "map-popup");
  const heading = element("h3", "map-popup__title", location.name);
  const categories = element("div", "tag-row");
  for (const category of location.categories || []) {
    const meta = CATEGORY_META[category];
    if (meta) categories.append(element("span", "tag", `${meta.icon} ${meta.label}`));
  }
  root.append(heading, categories);
  root.append(detailRow("Giá", formatCost(location.estimatedCost)));
  root.append(detailRow("Mở cửa", location.openingHours || "Chưa cập nhật"));
  root.append(detailRow("Địa chỉ", location.address || "Chưa cập nhật"));
  root.append(detailRow("Bình chọn", `${votes}/4 người`));
  if (location.note) root.append(element("p", "map-popup__note", location.note));

  const actions = element("div", "map-popup__actions");
  actions.append(actionButton("Chọn đo đường", "secondary", onRouteSelect));
  actions.append(actionButton("Lịch của tôi", "primary", () => handlers.onPlan(location)));
  const mapsLink = element("a", "button button--ghost", "Google Maps");
  mapsLink.href = location.googleMapsUrl;
  mapsLink.target = "_blank";
  mapsLink.rel = "noopener noreferrer";
  actions.append(mapsLink);
  root.append(actions);
  return root;
}

function detailRow(label, value) {
  const row = element("div", "map-popup__detail");
  row.append(element("span", "map-popup__label", label), element("span", "", value));
  return row;
}

function actionButton(label, variant, handler) {
  const button = element("button", `button button--${variant}`, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function element(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function describeRouteSelection(selection) {
  if (selection.length === 0) return "Chọn 2 marker để đo khoảng cách.";
  if (selection.length === 1) return `Đã chọn ${selection[0].name}. Chọn thêm 1 điểm.`;
  const distance = calculateDistanceKm(selection[0], selection[1]);
  return `${selection[0].name} → ${selection[1].name}: ${formatDistance(distance)} đường chim bay.`;
}
