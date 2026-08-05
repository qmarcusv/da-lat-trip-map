const DEMO_LOCATIONS = [
  {
    id: "demo-1", name: "Quảng trường Lâm Viên", categories: ["photo"], primaryCategory: "photo",
    address: "Đường Trần Quốc Toản, Phường 1, Đà Lạt", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Quang+truong+Lam+Vien",
    latitude: 11.9406, longitude: 108.4467, estimatedCost: 0, openingHours: "Cả ngày", note: "Biểu tượng nụ hoa Atiso.", status: "active",
  },
  {
    id: "demo-2", name: "Hồ Xuân Hương", categories: ["sightseeing"], primaryCategory: "sightseeing",
    address: "Trung tâm thành phố Đà Lạt", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Ho+Xuan+Huong+Da+Lat",
    latitude: 11.9447, longitude: 108.4483, estimatedCost: 0, openingHours: "Cả ngày", note: "Đi bộ và ngắm cảnh quanh hồ.", status: "active",
  },
  {
    id: "demo-3", name: "Tiệm cà phê Túi Mơ To", categories: ["food"], primaryCategory: "food",
    address: "Hẻm 31 Sào Nam, Phường 11, Đà Lạt", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Tui+Mo+To+Da+Lat",
    latitude: 11.9585, longitude: 108.4683, estimatedCost: 70000, openingHours: "07:00-21:30", note: "Có góc nhìn nhà lồng và nhiều hoa.", status: "active",
  },
  {
    id: "demo-4", name: "Dinh Bảo Đại III", categories: ["sightseeing"], primaryCategory: "sightseeing",
    address: "01 Triệu Việt Vương, Phường 4, Đà Lạt", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Dinh+Bao+Dai+III",
    latitude: 11.9291, longitude: 108.4286, estimatedCost: 50000, openingHours: "07:00-17:30", note: "Kiến trúc và khuôn viên lịch sử.", status: "active",
  },
  {
    id: "demo-5", name: "Chợ đêm Đà Lạt", categories: ["food"], primaryCategory: "food",
    address: "Nguyễn Thị Minh Khai, Phường 1, Đà Lạt", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Cho+dem+Da+Lat",
    latitude: 11.9421, longitude: 108.4379, estimatedCost: 150000, openingHours: "17:00-23:30", note: "Phù hợp lịch buổi tối.", status: "active",
  },
  {
    id: "demo-6", name: "Homestay của nhóm", categories: ["homestay"], primaryCategory: "homestay",
    address: "Cập nhật địa chỉ homestay", googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Da+Lat",
    latitude: 11.9367, longitude: 108.4389, estimatedCost: 0, openingHours: "Cả ngày", note: "Thay bằng tọa độ thật sau.", status: "active",
  },
];

export class DemoApi {
  #locations = structuredClone(DEMO_LOCATIONS);
  #myPlan = [];
  #sharedPlan = [];

  async request(action, payload = {}) {
    const handlers = {
      listLocations: () => this.#locations.filter((item) => item.status === "active"),
      getMyPlan: () => this.#myPlan,
      getSharedPlan: () => this.#sharedPlan,
      getVoteSummary: () => Object.fromEntries(this.#myPlan.filter((item) => item.vote).map((item) => [item.locationId, 1])),
      createLocation: () => this.#createLocation(payload),
      updateLocation: () => this.#updateLocation(payload),
      deleteLocation: () => this.#deleteLocation(payload.id),
      upsertMyPlanItem: () => this.#upsertPlan(payload),
      deleteMyPlanItem: () => this.#deletePlan(payload.locationId),
      upsertSharedPlanItem: () => this.#upsertSharedPlan(payload),
      deleteSharedPlanItem: () => this.#deleteSharedPlan(payload.planItemId),
    };
    if (!handlers[action]) throw new Error(`Demo chưa hỗ trợ action ${action}.`);
    return structuredClone(handlers[action]());
  }

  #createLocation(payload) {
    const location = { ...payload, id: crypto.randomUUID(), status: "active", createdBy: "demo", updatedBy: "demo" };
    this.#locations.push(location);
    return location;
  }

  #updateLocation(payload) {
    const index = this.#locations.findIndex((item) => item.id === payload.id);
    if (index < 0) throw new Error("Không tìm thấy địa điểm.");
    this.#locations[index] = { ...this.#locations[index], ...payload, updatedBy: "demo" };
    return this.#locations[index];
  }

  #deleteLocation(id) {
    const location = this.#locations.find((item) => item.id === id);
    if (location) location.status = "deleted";
    return { id };
  }

  #upsertPlan(payload) {
    const index = this.#myPlan.findIndex((item) => item.locationId === payload.locationId);
    const item = { ...payload, selectionId: payload.selectionId || crypto.randomUUID() };
    if (index < 0) this.#myPlan.push(item);
    else this.#myPlan[index] = item;
    return item;
  }

  #deletePlan(locationId) {
    this.#myPlan = this.#myPlan.filter((item) => item.locationId !== locationId);
    return { locationId };
  }

  #upsertSharedPlan(payload) {
    const item = { ...payload, planItemId: payload.planItemId || crypto.randomUUID() };
    const index = this.#sharedPlan.findIndex((entry) => entry.planItemId === item.planItemId);
    if (index < 0) this.#sharedPlan.push(item);
    else this.#sharedPlan[index] = item;
    return item;
  }

  #deleteSharedPlan(planItemId) {
    this.#sharedPlan = this.#sharedPlan.filter((item) => item.planItemId !== planItemId);
    return { planItemId };
  }
}

export function createDemoSession() {
  return { username: "trucnhi", displayName: "Trúc Nhi (Demo)", role: "admin" };
}
