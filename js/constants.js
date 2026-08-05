export const CATEGORY_META = Object.freeze({
  food: { label: "Ăn uống", color: "#f97316", icon: "🍜" },
  cafe: { label: "Cafe", color: "#a16207", icon: "☕" },
  photo: { label: "Chụp ảnh", color: "#9333ea", icon: "📷" },
  sightseeing: { label: "Danh lam thắng cảnh", color: "#16a34a", icon: "🌲" },
  homestay: { label: "Homestay", color: "#2563eb", icon: "🏠" },
});

export const DAY_LABELS = Object.freeze({
  unassigned: "Chưa xếp ngày",
  27: "Ngày 27",
  28: "Ngày 28",
  29: "Ngày 29",
});

export const PERIOD_LABELS = Object.freeze({
  unassigned: "Chưa xếp buổi",
  morning: "Buổi sáng",
  noon: "Buổi trưa",
  afternoon: "Buổi chiều",
  evening: "Buổi tối",
});

export const USER_LABELS = Object.freeze({
  trucnhi: "Trúc Nhi",
  thao: "Thảo",
  tuyen: "Tuyền",
  ngocnhi: "Ngọc Nhi",
});

export const ALLOWED_CATEGORIES = Object.freeze(Object.keys(CATEGORY_META));
export const ALLOWED_DAYS = Object.freeze(Object.keys(DAY_LABELS));
export const ALLOWED_PERIODS = Object.freeze(Object.keys(PERIOD_LABELS));
