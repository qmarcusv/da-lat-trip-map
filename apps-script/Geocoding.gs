function resolveLocationCoordinates_(location) {
  var supplied = coordinatePair_(location.latitude, location.longitude);
  if (supplied) return { latitude: supplied.latitude, longitude: supplied.longitude, source: "provided" };

  var mapsUrl = String(location.googleMapsUrl || "").trim();
  var urlCoordinates = extractCoordinatesFromGoogleMapsUrl_(mapsUrl);
  if (!urlCoordinates) {
    var expandedUrl = expandGoogleMapsUrl_(mapsUrl);
    urlCoordinates = extractCoordinatesFromGoogleMapsUrl_(expandedUrl);
  }
  if (urlCoordinates) {
    return { latitude: urlCoordinates.latitude, longitude: urlCoordinates.longitude, source: "google_maps_url" };
  }

  var query = buildGeocodeQuery_(location);
  if (!query) return null;
  try {
    var response = Maps.newGeocoder()
      .setBounds(11.7, 108.1, 12.25, 108.75)
      .setRegion("vn")
      .setLanguage("vi")
      .geocode(query);
    var point = response && response.results && response.results[0]
      && response.results[0].geometry && response.results[0].geometry.location;
    var geocoded = point && coordinatePair_(point.lat, point.lng);
    return geocoded && isWithinDaLatArea_(geocoded)
      ? { latitude: geocoded.latitude, longitude: geocoded.longitude, source: "geocoder" }
      : null;
  } catch (error) {
    return null;
  }
}

function enrichLocationCoordinates_(location) {
  var resolved = resolveLocationCoordinates_(location);
  if (!resolved) return Object.assign({}, location, { latitude: "", longitude: "" });
  return Object.assign({}, location, {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
  });
}

function extractCoordinatesFromGoogleMapsUrl_(url) {
  var value = String(url || "");
  var placeMatch = value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
  if (placeMatch) return coordinatePair_(placeMatch[1], placeMatch[2]);

  var viewMatch = value.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/i);
  if (viewMatch) return coordinatePair_(viewMatch[1], viewMatch[2]);

  try {
    var decoded = decodeURIComponent(value.replace(/\+/g, " "));
    var queryMatch = decoded.match(/[?&](?:query|destination|origin)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:&|$)/i);
    return queryMatch ? coordinatePair_(queryMatch[1], queryMatch[2]) : null;
  } catch (error) {
    return null;
  }
}

function expandGoogleMapsUrl_(url) {
  var current = String(url || "").trim();
  if (!/^https:\/\/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps(?:\/|$))/i.test(current)) return current;

  try {
    for (var redirect = 0; redirect < 5; redirect += 1) {
      var response = UrlFetchApp.fetch(current, { followRedirects: false, muteHttpExceptions: true });
      var code = response.getResponseCode();
      var headers = response.getHeaders();
      var next = headers.Location || headers.location;
      if (code < 300 || code >= 400 || !next || !isGoogleMapsUrl_(next)) break;
      current = next;
      if (!/^https:\/\/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps(?:\/|$))/i.test(current)) break;
    }
  } catch (error) {
    return String(url || "").trim();
  }
  return current;
}

function buildGeocodeQuery_(location) {
  var name = String(location.name || "").trim();
  var address = String(location.address || "").trim();
  if (/^chưa cập nhật(?:,|$)/i.test(address)) address = "";
  return [name, address, "Đà Lạt, Lâm Đồng, Việt Nam"].filter(Boolean).join(", ");
}

function coordinatePair_(latitude, longitude) {
  if (latitude === "" || latitude === null || latitude === undefined
    || longitude === "" || longitude === null || longitude === undefined) return null;
  var lat = Number(latitude);
  var lng = Number(longitude);
  if (!isFinite(lat) || lat < -90 || lat > 90 || !isFinite(lng) || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

function isWithinDaLatArea_(coordinates) {
  return coordinates.latitude >= 11.7 && coordinates.latitude <= 12.25
    && coordinates.longitude >= 108.1 && coordinates.longitude <= 108.75;
}

function geocodeMissingLocations() {
  var locations = getRows_("Locations").filter(function (location) {
    return location.status === "active" && !coordinatePair_(location.latitude, location.longitude);
  });
  var summary = { checked: locations.length, updated: 0, unresolved: 0, errors: [] };

  locations.forEach(function (location) {
    var coordinates = resolveLocationCoordinates_(location);
    if (!coordinates) {
      summary.unresolved += 1;
      summary.errors.push(location.name);
      return;
    }
    withScriptLock_(function () {
      updateObjectById_("Locations", "id", location.id, {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        updatedBy: "system-geocoder",
        updatedAt: nowIso_(),
      });
    });
    summary.updated += 1;
  });

  console.log("geocodeMissingLocations: " + JSON.stringify(summary));
  return summary;
}
