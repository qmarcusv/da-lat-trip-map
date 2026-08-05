import { ApiClient } from "./api.js";
import { APP_CONFIG } from "./config.js";
import { CATEGORY_META, DAY_LABELS, PERIOD_LABELS, USER_LABELS } from "./constants.js";
import { createDemoSession, DemoApi } from "./demo-api.js";
import { filterLocations, formatCost, validateLocation, validatePlanItem } from "./domain.js";
import { describeRouteSelection, MapView } from "./map.js";

const state = {
  api: new ApiClient(APP_CONFIG.apiUrl, APP_CONFIG.requestTimeoutMs),
  isDemo: false,
  user: null,
  locations: [],
  myPlan: [],
  sharedPlan: [],
  votes: {},
  map: null,
  filters: { search: "", category: "all" },
};

const elements = collectElements();
bindEvents();
elements.demoEntry.hidden = state.api.isConfigured;
if (!state.api.isConfigured && new URLSearchParams(window.location.search).get("demo") === "1") {
  queueMicrotask(startDemo);
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.demoButton.addEventListener("click", startDemo);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.addLocationButton.addEventListener("click", () => openLocationDialog());
  elements.locationForm.addEventListener("submit", saveLocation);
  elements.planForm.addEventListener("submit", savePlanItem);
  elements.planDeleteButton.addEventListener("click", deletePlanItem);
  elements.sharedPlanForm.addEventListener("submit", saveSharedPlanItem);
  elements.sharedPlanDeleteButton.addEventListener("click", deleteSharedPlanItem);
  elements.searchInput.addEventListener("input", () => {
    state.filters.search = elements.searchInput.value;
    renderLocations();
  });
  elements.categoryFilter.addEventListener("change", () => {
    state.filters.category = elements.categoryFilter.value;
    renderLocations();
  });
  elements.refreshButton.addEventListener("click", loadData);
  elements.routeRoadButton.addEventListener("click", calculateRoadRoute);
  elements.routeClearButton.addEventListener("click", () => state.map?.clearRoute());
  elements.backToMapButton.addEventListener("click", () => switchView("places"));
  for (const tab of elements.viewTabs) tab.addEventListener("click", () => switchView(tab.dataset.view));
  for (const button of document.querySelectorAll('dialog [value="cancel"]')) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      button.closest("dialog").close();
    });
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setBusy(elements.loginForm, true);
  elements.loginMessage.textContent = "";
  try {
    const username = elements.loginUsername.value.trim().toLocaleLowerCase("vi-VN");
    const password = elements.loginPassword.value;
    if (!username || !password) throw new Error("Nhập đầy đủ username và mật khẩu.");
    state.user = await state.api.login(username, password);
    await enterApp();
  } catch (error) {
    elements.loginMessage.textContent = error.message;
    if (error.code === "API_NOT_CONFIGURED") elements.demoEntry.hidden = false;
  } finally {
    setBusy(elements.loginForm, false);
  }
}

async function startDemo() {
  state.api = new DemoApi();
  state.isDemo = true;
  state.user = createDemoSession();
  await enterApp();
}

async function enterApp() {
  elements.loginScreen.hidden = true;
  elements.appShell.hidden = false;
  elements.userName.textContent = state.user.displayName || USER_LABELS[state.user.username] || state.user.username;
  elements.userRole.textContent = state.user.role === "admin" ? "Quản trị viên" : "Thành viên";
  elements.userAvatar.textContent = initials(elements.userName.textContent);
  elements.connectionPill.textContent = state.isDemo ? "Dữ liệu mẫu" : "Google Sheets";
  elements.connectionPill.classList.toggle("is-demo", state.isDemo);
  elements.addLocationButton.hidden = false;
  if (!state.map) state.map = new MapView("map", APP_CONFIG, updateRouteSelection);
  await loadData();
  setTimeout(() => state.map.invalidateSize(), 0);
}

async function handleLogout() {
  try {
    if (typeof state.api.logout === "function") await state.api.logout();
  } catch {
    // The local session is still cleared when the server cannot be reached.
  }
  window.location.reload();
}

async function loadData() {
  showMapStatus("Đang đồng bộ dữ liệu…");
  try {
    const [locations, myPlan, sharedPlan, votes] = await Promise.all([
      state.api.request("listLocations"),
      state.api.request("getMyPlan"),
      state.api.request("getSharedPlan"),
      state.api.request("getVoteSummary"),
    ]);
    state.locations = Array.isArray(locations) ? locations : [];
    state.myPlan = Array.isArray(myPlan) ? myPlan : [];
    state.sharedPlan = Array.isArray(sharedPlan) ? sharedPlan : [];
    state.votes = votes && typeof votes === "object" ? votes : {};
    renderAll();
    showMapStatus("Đã cập nhật", 1200);
  } catch (error) {
    toast(error.message, true);
    showMapStatus("Không thể đồng bộ", 1800);
  }
}

function renderAll() {
  renderLocations();
  renderPlans();
}

function renderLocations() {
  const locations = filterLocations(state.locations, state.filters);
  elements.resultCount.textContent = `${locations.length} địa điểm`;
  elements.locationList.replaceChildren();
  if (locations.length === 0) {
    elements.locationList.append(createElement("div", "empty-state", "Không có địa điểm phù hợp. Hãy đổi bộ lọc hoặc thêm địa điểm mới."));
  } else {
    for (const location of locations) elements.locationList.append(createLocationCard(location));
  }
  state.map?.renderLocations(locations, state.votes, { onPlan: openPlanDialog });
}

function createLocationCard(location) {
  const meta = CATEGORY_META[location.primaryCategory] || CATEGORY_META.sightseeing;
  const card = createElement("article", "location-card");
  const head = createElement("div", "location-card__head");
  const symbol = createElement("span", "location-card__symbol", meta.icon);
  symbol.style.setProperty("--marker-color", meta.color);
  const titleWrap = createElement("div");
  titleWrap.append(createElement("h3", "", location.name), createElement("p", "location-card__address", location.address));
  const cost = createElement("span", "tag", formatCost(location.estimatedCost));
  head.append(symbol, titleWrap, cost);

  const tags = createElement("div", "location-card__meta");
  for (const category of location.categories || []) {
    const categoryMeta = CATEGORY_META[category];
    if (categoryMeta) tags.append(createElement("span", "tag", `${categoryMeta.icon} ${categoryMeta.label}`));
  }
  if (location.openingHours) tags.append(createElement("span", "tag", `◷ ${location.openingHours}`));
  const hasCoordinates = location.latitude !== null && location.latitude !== "" && location.latitude !== undefined
    && location.longitude !== null && location.longitude !== "" && location.longitude !== undefined
    && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));
  if (!hasCoordinates) tags.append(createElement("span", "tag", "⌖ Chưa có tọa độ"));

  const footer = createElement("div", "location-card__footer");
  footer.append(makeButton("Lịch của tôi", "button button--primary", () => openPlanDialog(location)));
  const routeButton = makeButton("Đo đường", "button button--secondary", () => state.map.selectForRoute(location));
  routeButton.disabled = !hasCoordinates;
  routeButton.title = hasCoordinates ? "Chọn địa điểm để đo đường" : "Cần bổ sung tọa độ trước khi đo đường";
  footer.append(routeButton);
  footer.append(makeButton("Sửa", "button button--ghost", () => openLocationDialog(location)));
  if (state.user.role === "admin") {
    footer.append(makeButton("Chốt chung", "button button--secondary", () => openSharedPlanDialog(location)));
    footer.append(makeButton("Xóa", "button button--danger", () => deleteLocation(location)));
  }
  footer.append(createElement("span", "vote-count", `♥ ${state.votes[location.id] || 0}/4`));
  card.append(head, tags, footer);
  return card;
}

function openLocationDialog(location = null) {
  const scheduledItem = location ? state.sharedPlan.find((item) => item.locationId === location.id) : null;
  elements.locationForm.reset();
  elements.locationFormMessage.textContent = "";
  elements.locationDialogTitle.textContent = location ? "Sửa địa điểm" : "Thêm địa điểm";
  elements.locationId.value = location?.id || "";
  elements.locationName.value = location?.name || "";
  elements.locationCategory.value = location?.primaryCategory || location?.categories?.[0] || "";
  elements.locationDay.value = scheduledItem?.day || "27";
  elements.locationPeriod.value = scheduledItem?.period || "morning";
  elements.locationAddress.value = location?.address || "";
  elements.locationMapsUrl.value = location?.googleMapsUrl || "";
  elements.locationLatitude.value = location?.latitude ?? "";
  elements.locationLongitude.value = location?.longitude ?? "";
  elements.locationCost.value = location?.estimatedCost ?? "";
  elements.locationOpeningHours.value = location?.openingHours || "";
  elements.locationNote.value = location?.note || "";
  elements.locationDialog.showModal();
  elements.locationName.focus();
}

async function saveLocation(event) {
  event.preventDefault();
  let locationWasSaved = false;
  const result = validateLocation({
    id: elements.locationId.value,
    name: elements.locationName.value,
    category: elements.locationCategory.value,
    day: elements.locationDay.value,
    period: elements.locationPeriod.value,
    address: elements.locationAddress.value,
    googleMapsUrl: elements.locationMapsUrl.value,
    latitude: elements.locationLatitude.value,
    longitude: elements.locationLongitude.value,
    estimatedCost: elements.locationCost.value,
    openingHours: elements.locationOpeningHours.value,
    note: elements.locationNote.value,
  });
  if (!result.isValid) {
    elements.locationFormMessage.textContent = Object.values(result.errors)[0];
    return;
  }
  setBusy(elements.locationForm, true);
  try {
    const action = result.value.id ? "updateLocation" : "createLocation";
    const savedLocation = await state.api.request(action, result.value);
    elements.locationId.value = savedLocation.id;
    locationWasSaved = true;
    const existingSchedule = state.sharedPlan.find((item) => item.locationId === savedLocation.id);
    await state.api.request("upsertSharedPlanItem", {
      locationId: savedLocation.id,
      planItemId: existingSchedule?.planItemId || "",
      day: result.value.day,
      period: result.value.period,
      plannedTime: existingSchedule?.plannedTime || "",
      order: existingSchedule?.order || 0,
      note: existingSchedule?.note || "",
    });
    elements.locationDialog.close();
    const coordinatesFound = savedLocation?.latitude !== null && savedLocation?.latitude !== ""
      && savedLocation?.longitude !== null && savedLocation?.longitude !== "";
    const successMessage = result.value.id ? "Đã cập nhật địa điểm." : "Đã thêm địa điểm.";
    toast(coordinatesFound ? `${successMessage} Đã xác định tọa độ.` : `${successMessage} Chưa tự tìm được tọa độ.`);
    await loadData();
  } catch (error) {
    elements.locationFormMessage.textContent = locationWasSaved
      ? `Địa điểm đã lưu nhưng lịch chung chưa cập nhật: ${error.message}`
      : error.message;
  } finally {
    setBusy(elements.locationForm, false);
  }
}

async function deleteLocation(location) {
  if (!window.confirm(`Xóa địa điểm “${location.name}”? Dữ liệu sẽ được xóa mềm.`)) return;
  try {
    await state.api.request("deleteLocation", { id: location.id });
    toast("Đã xóa địa điểm.");
    await loadData();
  } catch (error) {
    toast(error.message, true);
  }
}

function openPlanDialog(location) {
  const item = state.myPlan.find((entry) => entry.locationId === location.id);
  elements.planForm.reset();
  elements.planFormMessage.textContent = "";
  elements.planLocationName.textContent = location.name;
  elements.planLocationId.value = location.id;
  elements.planSelectionId.value = item?.selectionId || "";
  elements.planDay.value = item?.day || "unassigned";
  elements.planPeriod.value = item?.period || "unassigned";
  elements.planTime.value = item?.plannedTime || "";
  elements.planVote.checked = Boolean(item?.vote);
  elements.planNote.value = item?.note || "";
  elements.planDeleteButton.hidden = !item;
  elements.planDialog.showModal();
}

async function savePlanItem(event) {
  event.preventDefault();
  const result = validatePlanItem({
    selectionId: elements.planSelectionId.value,
    locationId: elements.planLocationId.value,
    day: elements.planDay.value,
    period: elements.planPeriod.value,
    plannedTime: elements.planTime.value,
    vote: elements.planVote.checked,
    note: elements.planNote.value,
  });
  if (!result.isValid) {
    elements.planFormMessage.textContent = Object.values(result.errors)[0];
    return;
  }
  setBusy(elements.planForm, true);
  try {
    await state.api.request("upsertMyPlanItem", result.value);
    elements.planDialog.close();
    toast("Đã lưu lịch và bình chọn của bạn.");
    await loadData();
  } catch (error) {
    elements.planFormMessage.textContent = error.message;
  } finally {
    setBusy(elements.planForm, false);
  }
}

async function deletePlanItem() {
  try {
    await state.api.request("deleteMyPlanItem", { locationId: elements.planLocationId.value });
    elements.planDialog.close();
    toast("Đã bỏ địa điểm khỏi lịch cá nhân.");
    await loadData();
  } catch (error) {
    elements.planFormMessage.textContent = error.message;
  }
}

function openSharedPlanDialog(location, item = null) {
  elements.sharedPlanForm.reset();
  elements.sharedPlanFormMessage.textContent = "";
  elements.sharedPlanLocationName.textContent = location.name;
  elements.sharedPlanLocationId.value = location.id;
  elements.sharedPlanItemId.value = item?.planItemId || "";
  elements.sharedPlanDay.value = item?.day || "27";
  elements.sharedPlanPeriod.value = item?.period || "morning";
  elements.sharedPlanTime.value = item?.plannedTime || "";
  elements.sharedPlanOrder.value = item?.order ?? 0;
  elements.sharedPlanNote.value = item?.note || "";
  elements.sharedPlanDeleteButton.hidden = !item;
  elements.sharedPlanDialog.showModal();
}

async function saveSharedPlanItem(event) {
  event.preventDefault();
  const result = validatePlanItem({
    locationId: elements.sharedPlanLocationId.value,
    day: elements.sharedPlanDay.value,
    period: elements.sharedPlanPeriod.value,
    plannedTime: elements.sharedPlanTime.value,
    vote: false,
    note: elements.sharedPlanNote.value,
  });
  if (!result.isValid || result.value.day === "unassigned" || result.value.period === "unassigned") {
    elements.sharedPlanFormMessage.textContent = Object.values(result.errors)[0] || "Lịch chung phải có ngày và buổi.";
    return;
  }
  setBusy(elements.sharedPlanForm, true);
  try {
    await state.api.request("upsertSharedPlanItem", {
      ...result.value,
      planItemId: elements.sharedPlanItemId.value,
      order: Number(elements.sharedPlanOrder.value) || 0,
    });
    elements.sharedPlanDialog.close();
    toast("Đã cập nhật lịch chung.");
    await loadData();
  } catch (error) {
    elements.sharedPlanFormMessage.textContent = error.message;
  } finally {
    setBusy(elements.sharedPlanForm, false);
  }
}

async function deleteSharedPlanItem() {
  try {
    await state.api.request("deleteSharedPlanItem", { planItemId: elements.sharedPlanItemId.value });
    elements.sharedPlanDialog.close();
    toast("Đã xóa mục khỏi lịch chung.");
    await loadData();
  } catch (error) {
    elements.sharedPlanFormMessage.textContent = error.message;
  }
}

function renderPlans() {
  elements.myPlanCount.textContent = `${state.myPlan.length} điểm`;
  renderPlanList(elements.myPlanList, state.myPlan, true);
  renderPlanList(elements.sharedPlanList, state.sharedPlan, false);
}

function renderPlanList(container, items, isPersonal) {
  container.replaceChildren();
  if (items.length === 0) {
    container.append(createElement("div", "empty-state", isPersonal ? "Bạn chưa chọn địa điểm nào." : "Admin chưa chốt lịch chung."));
    return;
  }
  const dayOrder = { unassigned: 0, 27: 1, 28: 2, 29: 3 };
  const periodOrder = { unassigned: 0, morning: 1, noon: 2, afternoon: 3, evening: 4 };
  const sorted = [...items].sort((a, b) => (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0)
    || (periodOrder[a.period] || 0) - (periodOrder[b.period] || 0)
    || String(a.plannedTime || "").localeCompare(String(b.plannedTime || "")));
  for (const item of sorted) {
    const location = state.locations.find((entry) => entry.id === item.locationId);
    if (!location) continue;
    const row = createElement("article", "plan-item");
    row.append(createElement("span", "plan-item__time", item.plannedTime || PERIOD_LABELS[item.period]?.replace("Buổi ", "") || "—"));
    const copy = createElement("div");
    copy.append(createElement("strong", "", location.name), createElement("small", "", `${DAY_LABELS[item.day] || item.day} · ${PERIOD_LABELS[item.period] || item.period}${item.vote ? " · ♥ Đã bình chọn" : ""}`));
    row.append(copy);
    if (isPersonal) row.append(makeButton("Sửa", "button button--ghost", () => openPlanDialog(location)));
    else if (state.user.role === "admin") row.append(makeButton("Sửa", "button button--ghost", () => openSharedPlanDialog(location, item)));
    container.append(row);
  }
}

function switchView(view) {
  const isSchedule = view === "schedule";
  elements.placesPanel.hidden = isSchedule;
  elements.mapStage.hidden = isSchedule;
  elements.schedulePanel.hidden = !isSchedule;
  for (const tab of elements.viewTabs) tab.classList.toggle("is-active", tab.dataset.view === view);
  if (!isSchedule) setTimeout(() => state.map.invalidateSize(), 0);
}

function updateRouteSelection(selection) {
  elements.routeDescription.textContent = describeRouteSelection(selection);
  elements.routeRoadButton.disabled = selection.length !== 2 || !APP_CONFIG.enableRouting;
}

async function calculateRoadRoute() {
  elements.routeRoadButton.disabled = true;
  elements.routeRoadButton.textContent = "Đang tính…";
  try {
    const route = await state.map.drawRoadRoute();
    elements.routeDescription.textContent = `Đường lái xe: ${route.distanceKm.toFixed(1)} km · khoảng ${route.durationMinutes} phút.`;
  } catch (error) {
    elements.routeDescription.textContent = `${error.message} Vẫn giữ khoảng cách đường chim bay.`;
  } finally {
    elements.routeRoadButton.disabled = false;
    elements.routeRoadButton.textContent = "Tính đường đi";
  }
}

function setBusy(form, isBusy) {
  for (const element of form.elements) element.disabled = isBusy;
  form.setAttribute("aria-busy", String(isBusy));
}

function toast(message, isError = false) {
  const item = createElement("div", `toast${isError ? " toast--error" : ""}`, message);
  elements.toastRegion.append(item);
  setTimeout(() => item.remove(), 4200);
}

let mapStatusTimer;
function showMapStatus(message, duration = 0) {
  clearTimeout(mapStatusTimer);
  elements.mapStatus.textContent = message;
  elements.mapStatus.classList.add("is-visible");
  if (duration) mapStatusTimer = setTimeout(() => elements.mapStatus.classList.remove("is-visible"), duration);
}

function makeButton(label, className, handler) {
  const button = createElement("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
}

function collectElements() {
  const byId = (id) => document.getElementById(id);
  return {
    loginScreen: byId("login-screen"), appShell: byId("app-shell"), loginForm: byId("login-form"),
    loginUsername: byId("login-username"), loginPassword: byId("login-password"), loginMessage: byId("login-message"),
    demoEntry: byId("demo-entry"), demoButton: byId("demo-button"), logoutButton: byId("logout-button"),
    userName: byId("user-name"), userRole: byId("user-role"), userAvatar: byId("user-avatar"), connectionPill: byId("connection-pill"),
    viewTabs: document.querySelectorAll(".view-tab"), placesPanel: byId("places-panel"), mapStage: document.querySelector(".map-stage"),
    schedulePanel: byId("schedule-panel"), backToMapButton: byId("back-to-map-button"), addLocationButton: byId("add-location-button"),
    searchInput: byId("search-input"), categoryFilter: byId("category-filter"), refreshButton: byId("refresh-button"),
    resultCount: byId("result-count"), locationList: byId("location-list"), mapStatus: byId("map-status"),
    routeDescription: byId("route-description"), routeRoadButton: byId("route-road-button"), routeClearButton: byId("route-clear-button"),
    myPlanList: byId("my-plan-list"), sharedPlanList: byId("shared-plan-list"), myPlanCount: byId("my-plan-count"),
    locationDialog: byId("location-dialog"), locationForm: byId("location-form"), locationDialogTitle: byId("location-dialog-title"),
    locationId: byId("location-id"), locationName: byId("location-name"), locationCategory: byId("location-category"),
    locationDay: byId("location-day"), locationPeriod: byId("location-period"), locationAddress: byId("location-address"), locationMapsUrl: byId("location-maps-url"),
    locationLatitude: byId("location-latitude"), locationLongitude: byId("location-longitude"), locationCost: byId("location-cost"),
    locationOpeningHours: byId("location-opening-hours"), locationNote: byId("location-note"), locationFormMessage: byId("location-form-message"),
    planDialog: byId("plan-dialog"), planForm: byId("plan-form"), planLocationName: byId("plan-location-name"),
    planLocationId: byId("plan-location-id"), planSelectionId: byId("plan-selection-id"), planDay: byId("plan-day"),
    planPeriod: byId("plan-period"), planTime: byId("plan-time"), planVote: byId("plan-vote"), planNote: byId("plan-note"),
    planFormMessage: byId("plan-form-message"), planDeleteButton: byId("plan-delete-button"), toastRegion: byId("toast-region"),
    sharedPlanDialog: byId("shared-plan-dialog"), sharedPlanForm: byId("shared-plan-form"),
    sharedPlanLocationName: byId("shared-plan-location-name"), sharedPlanLocationId: byId("shared-plan-location-id"),
    sharedPlanItemId: byId("shared-plan-item-id"), sharedPlanDay: byId("shared-plan-day"),
    sharedPlanPeriod: byId("shared-plan-period"), sharedPlanTime: byId("shared-plan-time"),
    sharedPlanOrder: byId("shared-plan-order"), sharedPlanNote: byId("shared-plan-note"),
    sharedPlanFormMessage: byId("shared-plan-form-message"), sharedPlanDeleteButton: byId("shared-plan-delete-button"),
  };
}
