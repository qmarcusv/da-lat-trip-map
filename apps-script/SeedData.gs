/**
 * Nhập danh sách địa điểm ban đầu và các ô TRUE vào bốn lịch cá nhân.
 * Có thể chạy lại an toàn: địa điểm được khớp theo tên, lựa chọn theo locationId.
 */
function seedExistingData() {
  return withScriptLock_(function () {
    var existingLocations = getRows_("Locations");
    var locationsByName = {};
    existingLocations.forEach(function (location) {
      locationsByName[normalizeSeedName_(location.name)] = location;
    });

    var personalPlans = {};
    Object.keys(APP.personalSheets).forEach(function (username) {
      personalPlans[username] = getRows_(APP.personalSheets[username]);
    });

    var result = { locationsCreated: 0, locationsReused: 0, votesCreated: 0, votesUpdated: 0 };
    getExistingLocationSeed_().forEach(function (seed) {
      var location = locationsByName[normalizeSeedName_(seed.name)];
      if (!location) {
        var timestamp = nowIso_();
        location = {
          id: newId_(),
          name: seed.name,
          categories: seed.categories,
          primaryCategory: seed.primaryCategory,
          address: seed.address,
          googleMapsUrl: seed.googleMapsUrl,
          latitude: "",
          longitude: "",
          estimatedCost: "",
          openingHours: "",
          note: seed.note || "",
          status: "active",
          createdBy: "system-import",
          createdAt: timestamp,
          updatedBy: "system-import",
          updatedAt: timestamp,
        };
        appendObject_("Locations", APP.headers.Locations, location);
        locationsByName[normalizeSeedName_(seed.name)] = location;
        result.locationsCreated += 1;
      } else {
        result.locationsReused += 1;
      }

      seed.votes.forEach(function (username) {
        var sheetName = APP.personalSheets[username];
        var existingPlan = personalPlans[username].filter(function (item) {
          return item.locationId === location.id;
        })[0];
        if (existingPlan) {
          if (!(existingPlan.vote === true || String(existingPlan.vote).toLowerCase() === "true")) {
            var updated = updateObjectById_(sheetName, "selectionId", existingPlan.selectionId, {
              vote: true,
              updatedAt: nowIso_(),
            });
            Object.assign(existingPlan, updated);
            result.votesUpdated += 1;
          }
        } else {
          var selection = {
            selectionId: newId_(),
            locationId: location.id,
            day: "unassigned",
            period: "unassigned",
            plannedTime: "",
            vote: true,
            note: "Nhập từ danh sách ban đầu",
            updatedAt: nowIso_(),
          };
          appendObject_(sheetName, APP.headers.PersonalPlan, selection);
          personalPlans[username].push(selection);
          result.votesCreated += 1;
        }
      });
    });

    audit_("system-import", "seed", "locations", "initial-list", JSON.stringify(result));
    console.log("seedExistingData: " + JSON.stringify(result));
    return result;
  });
}

function getExistingLocationSeed_() {
  var rows = [
    ["Quán cơm Linh", "17b Trần Hưng Đạo, Xuân Hương - Đà Lạt", "food", ["food"], ["tuyen"]],
    ["Quán cơm Hồi Đó", "Số 5, đường Lý Nam Đế, P. Lâm Viên, Đà Lạt", "food", ["food"], ["thao", "tuyen"]],
    ["Nướng Bên Sườn Đồi", "1B Hoàng Hoa Thám, Xuân Hương - Đà Lạt", "food", ["food"], ["tuyen"]],
    ["Nướng Chạm Dừng Chill (view xe lửa)", "111 Huỳnh Tấn Phát, P. 11, Đà Lạt", "food", ["food", "photo"], ["thao"]],
    ["Our Memory (combo nướng và lẩu)", "12 Đường Triệu Việt Vương, Xuân Hương - Đà Lạt", "food", ["food"], []],
    ["Gà nướng cơm lam", "178 Hùng Vương, P. 11, Đà Lạt (quán local lề đường)", "food", ["food"], ["thao", "ngocnhi", "tuyen"]],
    ["Lẩu bò Gia Lâm", "30 đường Ngô Quyền, Cam Ly - Đà Lạt, Lâm Đồng", "food", ["food"], ["tuyen"]],
    ["Bánh ướt lòng gà Gốc Phố Đà Lạt", "94 Xô Viết Nghệ Tĩnh, Lâm Viên - Đà Lạt", "food", ["food"], []],
    ["Bánh ướt lòng gà Long", "Hẻm 202 Phan Đình Phùng, Xuân Hương - Đà Lạt", "food", ["food"], []],
    ["Bánh ướt lòng gà Mật Đường", "287/13 Phan Đình Phùng, Đà Lạt", "food", ["food"], ["thao", "ngocnhi", "tuyen"]],
    ["Bún Sườn Bò - Tiệm Lành", "22 Đ. Trần Nhật Duật, Cam Ly - Đà Lạt", "food", ["food"], ["trucnhi"]],
    ["Bánh mì xíu mại 79", "Chưa cập nhật, Đà Lạt", "food", ["food"], ["ngocnhi", "tuyen"]],
    ["Bánh căn Lệ", "Số 27/44 Yersin, Đà Lạt", "food", ["food"], ["thao"]],
    ["Lẩu cá tầm Tuyên", "Chưa cập nhật, Đà Lạt", "food", ["food"], ["trucnhi", "ngocnhi"]],
    ["Sữa đậu nành Dung Béo", "Chưa cập nhật, Đà Lạt", "food", ["food"], ["thao", "ngocnhi"]],
    ["Trà sữa Plume", "43/1 Phù Đổng Thiên Vương, Đà Lạt", "food", ["food"], ["ngocnhi"]],
    ["Hồng Trà Hoà Bình - Xưởng Trà Thủ Công", "Chưa cập nhật, Đà Lạt", "food", ["food"], ["ngocnhi"], "Nghe nói không ngon lắm, tùy khẩu vị."],
    ["Cafe Cheo Veo (bình minh, cảnh chill)", "116 Hùng Vương, P. 11, Đà Lạt", "cafe", ["cafe", "photo"], ["thao", "trucnhi", "tuyen"]],
    ["Reo", "Ngay hồ Tuyền Lâm, Đà Lạt", "cafe", ["cafe", "photo"], ["thao", "ngocnhi", "tuyen"]],
    ["Mongo Land", "Tổ 16, Thôn 1, Tà Nung, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "ngocnhi", "tuyen"]],
    ["Đồi Măng Lin (ngắm bình minh)", "Đi theo TikTok, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "ngocnhi", "tuyen"], "Cần xác minh lại đường đi."],
    ["Cây thông cô đơn", "Chưa cập nhật, Đà Lạt", "sightseeing", ["sightseeing", "photo"], [], "Xa và có thể tốn phí qua khu vực cây."],
    ["Tháp Vinaphone", "P. 3, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "trucnhi", "ngocnhi", "tuyen"]],
    ["Đập tràn hồ Tuyền Lâm", "Hồ Tuyền Lâm, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "trucnhi", "ngocnhi", "tuyen"]],
    ["Chợ đêm Đà Lạt", "Đ. Nguyễn Thị Minh Khai, P. 1, Đà Lạt", "sightseeing", ["sightseeing", "food"], ["thao", "trucnhi", "ngocnhi", "tuyen"]],
    ["Hồ Xuân Hương (ngắm hoàng hôn miễn phí)", "Hồ Xuân Hương, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "trucnhi", "ngocnhi", "tuyen"]],
    ["Quảng trường Lâm Viên", "Quảng trường Lâm Viên, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "ngocnhi", "tuyen"]],
    ["Thôn 13", "Chưa cập nhật, Đà Lạt", "sightseeing", ["sightseeing", "photo"], ["thao", "trucnhi", "ngocnhi"]],
    ["Làng Cù Lần", "ĐT722, Lát, Lạc Dương, Lâm Đồng", "sightseeing", ["sightseeing", "photo"], ["ngocnhi"]],
    ["Photobooth", "Chưa cập nhật, Đà Lạt", "photo", ["photo"], ["thao", "ngocnhi", "tuyen"]],
    ["Trạm Mèo Mướp", "Chưa cập nhật, Đà Lạt", "photo", ["photo"], ["trucnhi", "ngocnhi"]],
    ["Địa điểm chưa đặt tên (Lalalalaa)", "Lalalalaa", "sightseeing", ["sightseeing"], [], "Dữ liệu gốc thiếu tên địa điểm; cần kiểm tra và sửa lại."],
  ];

  return rows.map(function (row) {
    return {
      name: row[0],
      address: row[1],
      primaryCategory: row[2],
      categories: [row[2]],
      votes: row[4],
      note: row[5] || "",
      googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(row[0] + " " + row[1]),
    };
  });
}

function normalizeSeedName_(value) {
  return String(value || "").trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
}
