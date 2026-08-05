# Bản đồ kế hoạch du lịch Đà Lạt 3 ngày 2 đêm

## 1. Mục tiêu

Xây dựng website cho nhóm bốn người cùng thu thập, bình chọn và sắp xếp các địa điểm tại Đà Lạt.

- Mã nguồn lưu trên GitHub và website chạy bằng GitHub Pages.
- Bản đồ dùng Leaflet và OpenStreetMap.
- Google Sheets làm nơi lưu dữ liệu.
- Google Apps Script làm API đọc/ghi dữ liệu và kiểm tra đăng nhập.
- Người dùng phải đăng nhập bằng username và password trước khi xem hoặc sửa dữ liệu.
- Có một danh mục địa điểm chung, một lịch trình chung và một lịch trình riêng cho từng thành viên.
- Chuyến đi kéo dài 3 ngày 2 đêm, không cần chức năng tối ưu lộ trình.

## 2. Tài khoản và phân quyền

### Tài khoản ban đầu

| Username | Role | Password ban đầu |
|---|---|---|
| `trucnhi` | `admin` | `123` |
| `thao` | `user` | `123` |
| `tuyen` | `user` | `123` |
| `ngocnhi` | `user` | `123` |

Password `123` chỉ phù hợp cho bản thử nghiệm, không bảo vệ được dữ liệu nếu đường dẫn website bị chia sẻ ra ngoài nhóm. Khi triển khai xong nên đổi thành mật khẩu khác nhau cho từng người.

Mật khẩu mặc định `123` đã được ghi trong tài liệu công khai nên không được xem là bí mật. Mã nguồn không hard-code mật khẩu để xác thực; Apps Script nhận mật khẩu khởi tạo từ Script Properties rồi chỉ giữ salt và password hash. Password chỉ được gửi qua HTTPS khi đăng nhập và không được ghi vào log hoặc Google Sheet.

### Quyền của admin `trucnhi`

- Xem tất cả địa điểm, bình chọn và lịch cá nhân.
- Thêm và sửa địa điểm chung.
- Xóa mềm hoặc khôi phục địa điểm.
- Chốt và sửa lịch trình chung.
- Xem lịch sử thay đổi.

### Quyền của user

- Xem danh mục địa điểm chung và lịch chung.
- Thêm địa điểm mới và sửa thông tin địa điểm chung.
- Không được xóa địa điểm chung.
- Chỉ thêm/sửa/xóa lựa chọn trong Sheet cá nhân của chính mình.
- Bình chọn địa điểm bằng tài khoản của mình; mỗi người chỉ có tối đa một phiếu cho một địa điểm.

### Phiên đăng nhập cơ bản

1. Frontend gửi username/password đến action `login`.
2. Apps Script so sánh password hash ở phía server.
3. Nếu đúng, API trả về token ngẫu nhiên có thời hạn, username và role.
4. Frontend chỉ giữ token trong bộ nhớ của trang; tải lại trang sẽ phải đăng nhập lại.
5. Mọi action được bảo vệ phải gửi token; Apps Script luôn kiểm tra token và quyền trước khi đọc/ghi.
6. Token hết hạn sau khoảng 6 giờ hoặc khi người dùng logout.

Đây là xác thực cơ bản cho ứng dụng nhóm nhỏ, không tương đương hệ thống đăng nhập production. Google Apps Script không thuận tiện cho cookie `HttpOnly` giữa hai domain, rate limiting mạnh hoặc thuật toán password hashing chuyên dụng.

## 3. Quy tắc dữ liệu và phân loại

### Loại địa điểm

Một địa điểm có thể thuộc nhiều loại khác nhau:

- `food`: Ăn uống
- `cafe`: Cafe
- `photo`: Chụp ảnh
- `sightseeing`: Danh lam thắng cảnh
- `homestay`: Homestay

Danh sách loại phải duy nhất. Ví dụ `food + photo` hợp lệ, nhưng `food + food` không hợp lệ.

Mỗi địa điểm có thêm một `primaryCategory` nằm trong danh sách `categories`. Nhóm chính quyết định màu marker; tất cả nhóm còn lại vẫn xuất hiện trong popup và bộ lọc.

Quy ước màu mặc định:

| Nhóm chính | Màu marker | Mã màu |
|---|---|---|
| Ăn uống | Cam | `#F97316` |
| Chụp ảnh | Tím | `#9333EA` |
| Danh lam thắng cảnh | Xanh lá | `#16A34A` |
| Homestay | Xanh dương | `#2563EB` |

Giao diện phải có chú giải màu. Marker cũng nên có icon hoặc ký hiệu khác nhau để người khó phân biệt màu vẫn nhận biết được nhóm.

### Ngày và buổi

Ngày và buổi thuộc về một mục trong lịch cá nhân hoặc lịch chung, không gắn cố định vào địa điểm. Vì vậy cùng một địa điểm có thể được `thao` chọn vào sáng Ngày 1 và `tuyen` chọn vào chiều Ngày 2.

Mỗi mục lịch chỉ có:

- Một ngày: `unassigned`, `1`, `2` hoặc `3`.
- Một buổi: `unassigned`, `morning`, `afternoon` hoặc `evening`.

Ví dụ hợp lệ: `Ngày 1 + Buổi sáng`. Ví dụ không hợp lệ: vừa `Buổi sáng` vừa `Buổi chiều` trong cùng một mục lịch.

### Thông tin địa điểm

Mỗi địa điểm gồm:

- Tên địa điểm.
- Một hoặc nhiều loại địa điểm, không trùng nhau.
- Địa chỉ cơ bản.
- Link Google Maps.
- Vĩ độ và kinh độ để đặt marker lên bản đồ.
- Chi phí dự kiến.
- Giờ mở cửa.
- Ghi chú.
- Trạng thái còn hoạt động hoặc đã xóa mềm.

## 4. Chức năng website

### Bản đồ và danh sách

- Hiển thị bản đồ trung tâm Đà Lạt và marker của các địa điểm đang hoạt động.
- Các địa điểm cùng nhóm chính dùng cùng màu; các nhóm khác nhau dùng màu khác nhau theo bảng màu ở mục 3.
- Popup khi nhấn marker phải hiển thị tối thiểu: tên, giá/chi phí dự kiến, giờ mở cửa và tất cả nhóm của địa điểm.
- Popup cũng hiển thị địa chỉ, link Google Maps, ghi chú, tổng số phiếu và nút chọn điểm để đo khoảng cách/chỉ đường nếu tính năng định tuyến khả dụng.
- Có danh sách địa điểm responsive cho điện thoại và máy tính.
- Có bộ lọc theo loại, ngày, buổi và người dùng.

### Khoảng cách và tuyến đường tùy chọn

- Leaflet và lớp tile OpenStreetMap chỉ hiển thị bản đồ; chúng không tự tính tuyến đường.
- Website luôn có thể tính khoảng cách đường chim bay giữa hai marker bằng tọa độ, không cần gọi dịch vụ bên ngoài.
- Nếu dịch vụ OSRM khả dụng, người dùng chọn hai địa điểm để website gọi Route API, vẽ tuyến đường lái xe và hiển thị quãng đường cùng thời gian ước tính.
- Không gọi OSRM Trip API và không tự sắp xếp/tối ưu thứ tự địa điểm.
- Nếu OSRM lỗi, quá tải, bị giới hạn hoặc không tìm thấy đường, website vẫn hoạt động bình thường: xóa đường cũ, báo không thể tính tuyến và chỉ hiển thị khoảng cách đường chim bay.
- Bản demo công cộng của OSRM chỉ phù hợp thử nghiệm, không có cam kết ổn định. Tính năng tuyến đường được xem là bổ sung, không phải điều kiện bắt buộc để website hoạt động.

### Quản lý địa điểm

- Thêm địa điểm bằng form và chọn tọa độ bằng cách nhấn bản đồ.
- Nhập cả địa chỉ cơ bản và link Google Maps.
- Sửa thông tin địa điểm.
- Admin được xóa mềm và khôi phục.
- Kiểm tra dữ liệu ở cả frontend và Apps Script.
- Không dùng `innerHTML` để hiển thị nội dung người dùng nhập.

### Lịch cá nhân, bình chọn và lịch chung

- Mỗi người chọn địa điểm, ngày, buổi và giờ dự kiến trong lịch cá nhân.
- Một user không thể tạo hai mục lịch cho cùng một địa điểm.
- Mỗi người bật/tắt một phiếu bình chọn cho từng địa điểm.
- Tổng phiếu được tính từ bốn Sheet cá nhân, không nhập tay vào Sheet địa điểm.
- Admin dùng kết quả bình chọn và bốn lịch cá nhân để chốt `SharedPlan`.
- Lịch chung chỉ thể hiện phương án cuối cùng; không có chức năng tự tối ưu đường đi.

## 5. Kiến trúc

```text
Trình duyệt
  GitHub Pages: HTML/CSS/JavaScript + Leaflet
            |
            | HTTPS: login token + action + payload
            v
  Google Apps Script Web App
    - xác thực và phân quyền
    - validate dữ liệu
    - khóa thao tác ghi đồng thời
            |
            v
  Google Spreadsheet
    - Locations và SharedPlan
    - 4 Sheet lịch cá nhân
    - AuditLog và Sessions
```

GitHub Pages chỉ phục vụ frontend tĩnh. Không đặt Spreadsheet ID, password, password hash hoặc quyền quản trị trong frontend. Apps Script chạy dưới tài khoản người triển khai để frontend không cần được cấp quyền trực tiếp vào Google Sheet.

## 6. Cấu trúc Google Spreadsheet

Tạo một spreadsheet, ví dụ `Da Lat Trip Database`, gồm tám Sheet sau. Tên Sheet phải viết đúng để code không đọc nhầm.

### 6.1 `Locations` — danh mục địa điểm chung

| Cột | Trường | Quy tắc / ví dụ |
|---|---|---|
| A | `id` | UUID, không đổi sau khi tạo |
| B | `name` | Tên địa điểm, bắt buộc |
| C | `categories` | Chuỗi JSON duy nhất, ví dụ `["food","photo"]` |
| D | `primaryCategory` | Một giá trị thuộc `categories`, dùng chọn màu marker |
| E | `address` | Địa chỉ cơ bản, bắt buộc |
| F | `googleMapsUrl` | URL bắt đầu bằng `https://www.google.com/maps/` hoặc URL Maps hợp lệ |
| G | `latitude` | Số từ -90 đến 90 |
| H | `longitude` | Số từ -180 đến 180 |
| I | `estimatedCost` | Chi phí dự kiến, số không âm; thống nhất đơn vị VND |
| J | `openingHours` | Ví dụ `07:00-22:00` hoặc mô tả ngắn |
| K | `note` | Ghi chú tối đa 1000 ký tự |
| L | `status` | `active` hoặc `deleted` |
| M | `createdBy` | Username tạo |
| N | `createdAt` | Thời gian ISO 8601 do Apps Script tạo |
| O | `updatedBy` | Username sửa gần nhất |
| P | `updatedAt` | Thời gian ISO 8601 do Apps Script tạo |

### 6.2 `SharedPlan` — lịch trình chung đã chốt

| Cột | Trường | Quy tắc |
|---|---|---|
| A | `planItemId` | UUID |
| B | `locationId` | Tham chiếu `Locations.id` |
| C | `day` | `1`, `2` hoặc `3` |
| D | `period` | `morning`, `afternoon` hoặc `evening` |
| E | `plannedTime` | Giờ dự kiến dạng `HH:mm`, có thể để trống |
| F | `order` | Thứ tự thủ công trong cùng ngày/buổi |
| G | `note` | Ghi chú chung |
| H | `updatedBy` | Phải là admin |
| I | `updatedAt` | Thời gian server |

### 6.3 Bốn Sheet lịch cá nhân

Tên Sheet:

- `Plan_trucnhi`
- `Plan_thao`
- `Plan_tuyen`
- `Plan_ngocnhi`

Cả bốn Sheet dùng cùng cấu trúc:

| Cột | Trường | Quy tắc |
|---|---|---|
| A | `selectionId` | UUID |
| B | `locationId` | Tham chiếu `Locations.id`, duy nhất trong Sheet này |
| C | `day` | `unassigned`, `1`, `2` hoặc `3` |
| D | `period` | `unassigned`, `morning`, `afternoon` hoặc `evening` |
| E | `plannedTime` | `HH:mm`, có thể để trống |
| F | `vote` | `TRUE` hoặc `FALSE` |
| G | `note` | Ghi chú cá nhân |
| H | `updatedAt` | Thời gian server |

### 6.4 `AuditLog` — nhật ký thay đổi

| Cột | Trường |
|---|---|
| A | `timestamp` |
| B | `username` |
| C | `action` |
| D | `entityType` |
| E | `entityId` |
| F | `summary` |

Không ghi password, token hoặc toàn bộ nội dung nhạy cảm vào `AuditLog`.

### 6.5 `Sessions` — phiên đăng nhập

| Cột | Trường |
|---|---|
| A | `tokenHash` |
| B | `username` |
| C | `role` |
| D | `expiresAt` |
| E | `createdAt` |

Chỉ lưu hash của token. Apps Script dọn phiên hết hạn khi login/logout hoặc theo trigger định kỳ. Người dùng bình thường không được cấp quyền mở trực tiếp spreadsheet.

## 7. API Apps Script dự kiến

### Action công khai

- `POST login`: nhận username/password và trả token tạm thời.

### Action cần đăng nhập

- `POST logout`
- `POST listLocations`
- `POST createLocation`
- `POST updateLocation`
- `POST getMyPlan`
- `POST upsertMyPlanItem`
- `POST deleteMyPlanItem`
- `POST getSharedPlan`
- `POST getVoteSummary`

### Action chỉ admin

- `POST deleteLocation`
- `POST restoreLocation`
- `POST getAllPersonalPlans`
- `POST upsertSharedPlanItem`
- `POST deleteSharedPlanItem`
- `POST getAuditLog`

### Quy tắc API

- Phản hồi thống nhất: `{ "success": true, "data": ... }` hoặc `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- Mọi action có token dùng `POST`; không đặt password hoặc token trong query string/URL vì URL có thể bị lưu trong lịch sử và log.
- Frontend gửi JSON dưới dạng body phù hợp với Apps Script và kiểm thử redirect thực tế từ `script.google.com` sang `script.googleusercontent.com`.
- Username lấy từ token đã xác thực, không tin trường `username` frontend gửi lên.
- Sheet cá nhân được chọn bằng allowlist cố định; tuyệt đối không nối trực tiếp tên Sheet từ input.
- Apps Script validate enum, độ dài, URL, tọa độ, chi phí, ngày, buổi và quyền sở hữu.
- `primaryCategory` bắt buộc thuộc `categories`; `categories` phải loại bỏ giá trị trùng trước khi ghi.
- Dùng `LockService.getScriptLock()` trước thao tác ghi để tránh ghi đè khi nhiều người lưu cùng lúc.
- Mọi nội dung trả về chỉ được frontend gán bằng `textContent`, không render HTML tùy ý.

## 8. Cấu trúc project dự kiến

```text
da-lat/
├── README.md
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js             # URL /exec, có thể public; không chứa password
│   ├── app.js
│   ├── api.js
│   ├── constants.js
│   ├── demo-api.js
│   ├── domain.js
│   ├── map.js
├── apps-script/
│   ├── Code.gs
│   ├── Auth.gs
│   ├── Config.gs
│   ├── Repository.gs
│   ├── Services.gs
│   ├── Validation.gs
│   ├── Geocoding.gs         # Link Google Maps / địa chỉ thành tọa độ
│   ├── SeedData.gs          # Import 32 địa điểm và các bình chọn ban đầu
│   └── appsscript.json
└── docs/
    └── setup.md
```

## 9. Hướng dẫn tạo Google Sheets

1. Đăng nhập tài khoản Google sẽ sở hữu hệ thống.
2. Mở Google Sheets và tạo spreadsheet mới tên `Da Lat Trip Database`.
3. Không cần tạo tab hoặc cột thủ công; hàm `setupProject()` sẽ tạo và kiểm tra đúng tám Sheet ở mục 6.
4. Không chia sẻ quyền Editor của spreadsheet cho người dùng cuối; họ thao tác qua website.
5. Tạo một bản sao lưu trước khi chạy thử dữ liệu thật.

Không cần tự nhập tài khoản vào Sheet. Danh sách username, role, salt và password hash sẽ nằm trong Apps Script Properties; lịch cá nhân nằm ở bốn Sheet `Plan_*`.

## 10. Hướng dẫn tạo Google Apps Script

### 10.1 Tạo project gắn với Sheet

1. Trong spreadsheet chọn `Extensions > Apps Script`.
2. Đặt tên project, ví dụ `Da Lat Trip API`.
3. Tạo các file `.gs` đúng như mục 8 và dán nội dung từ thư mục `apps-script/`, bao gồm `Geocoding.gs` và `SeedData.gs`.
4. Trong `Project Settings > Script Properties`, tạo property tạm `INITIAL_PASSWORD` với giá trị `123`.
5. Chạy thủ công `setupProject()`. Hàm này tự lưu Spreadsheet ID, tạo tám Sheet, tạo salt/hash cho bốn tài khoản và xóa `INITIAL_PASSWORD`.
6. Chạy thủ công `seedExistingData()` để nhập 32 địa điểm và 62 bình chọn từ danh sách ban đầu. Hàm có chống trùng nên chạy lại không tạo bản sao.
7. Chạy `geocodeMissingLocations()` để tự điền tọa độ từ link Google Maps hoặc tên + địa chỉ.
8. Không đặt password hoặc token vào `Code.gs`, `config.js` hay repository GitHub.

Hướng dẫn thao tác chi tiết nằm tại [`docs/setup.md`](docs/setup.md).

### 10.2 Kiểm thử trong Apps Script

1. Chạy hàm thiết lập Sheet/tài khoản một lần trong editor.
2. Google sẽ yêu cầu cấp quyền truy cập spreadsheet; chỉ cấp cho tài khoản chủ sở hữu.
3. Chạy các hàm test cho login, quyền user/admin, validate dữ liệu và ghi đồng thời.
4. Kiểm tra `Executions` để tìm lỗi, nhưng không log password/token.

### 10.3 Triển khai Web app

1. Chọn `Deploy > New deployment`.
2. Chọn loại `Web app`.
3. Đặt mô tả phiên bản.
4. Chọn thực thi dưới tài khoản người triển khai (`Execute as me`).
5. Chọn mức truy cập cho phép bất kỳ người nào, kể cả ẩn danh, gọi endpoint. Giao diện Google có thể hiển thị `Anyone` hoặc tùy chọn tương đương tùy loại tài khoản.
6. Chọn `Deploy`, cấp quyền và sao chép URL production kết thúc bằng `/exec`.
7. Không dùng URL `/dev` trên GitHub Pages vì URL đó chỉ dành cho người có quyền sửa script.
8. Mỗi lần đổi Apps Script, vào `Deploy > Manage deployments`, sửa deployment và chọn version mới.

Apps Script phải public ở tầng HTTP để trang GitHub Pages gọi được, nhưng dữ liệu vẫn được bảo vệ bằng login token và kiểm tra role bên trong code.

## 11. Hướng dẫn tạo GitHub và GitHub Pages

### 11.1 Tạo repository

1. Đăng nhập GitHub và chọn `New repository`.
2. Đặt tên, ví dụ `da-lat-trip-map`.
3. Chọn Public nếu đang dùng GitHub Free và muốn triển khai Pages đơn giản.
4. Không tạo thêm README từ giao diện nếu sẽ push thư mục `da-lat` hiện tại.
5. Tạo repository và sao chép URL HTTPS.

### 11.2 Đưa project lên GitHub

Chạy tại thư mục `da-lat`:

```powershell
git init
git add .
git commit -m "Initialize Da Lat trip planner"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPOSITORY>.git
git push -u origin main
```

Trước khi commit, tìm password/token bị ghi nhầm:

```powershell
git diff --cached | Select-String -Pattern 'password|secret|token|123'
```

Kết quả có thể khớp phần tài liệu nói về password mặc định `123`, nhưng không được chứa `USERS_JSON`, password hash, token phiên hoặc bí mật Apps Script.

### 11.3 Bật GitHub Pages

1. Mở repository trên GitHub.
2. Vào `Settings > Pages`.
3. Tại `Build and deployment`, chọn `Deploy from a branch`.
4. Chọn branch `main`, thư mục `/(root)`, sau đó `Save`.
5. Chờ deployment hoàn tất rồi mở URL:

```text
https://<USERNAME>.github.io/<REPOSITORY>/
```

Mỗi lần push thay đổi vào nguồn đã chọn, GitHub Pages sẽ triển khai lại website.

## 12. Thứ tự triển khai đề xuất

1. Tạo Google Spreadsheet và tám Sheet.
2. Viết Apps Script: helper dữ liệu, validation và khóa ghi.
3. Viết login, token session và kiểm tra role.
4. Viết API địa điểm chung.
5. Viết API bốn lịch cá nhân, bình chọn và lịch chung.
6. Test API bằng dữ liệu thử trước khi nối frontend.
7. Xây giao diện đăng nhập, bản đồ, form, bộ lọc và lịch.
8. Chạy website ở máy và kiểm thử đủ bốn tài khoản.
9. Push GitHub, bật GitHub Pages và cấu hình URL `/exec`.
10. Kiểm thử lại trên URL thật bằng điện thoại và máy tính.

## 13. Kiểm thử bắt buộc

- Sai username/password không đăng nhập được.
- User không gọi được action admin dù tự sửa request trong DevTools.
- User chỉ ghi được `Plan_<username>` của chính mình.
- Mỗi user chỉ có một phiếu cho mỗi địa điểm.
- Một địa điểm có thể có nhiều category nhưng category không trùng.
- Màu marker đúng theo `primaryCategory`, có chú giải màu và popup hiện đủ tên, giá, giờ mở cửa, nhóm.
- Một mục lịch không thể có đồng thời hai ngày hoặc hai buổi.
- Cùng địa điểm có thể xuất hiện vào thời gian khác nhau trong lịch của hai người.
- Địa chỉ, Google Maps URL, chi phí và giờ mở cửa được lưu và tải lại đúng.
- Dữ liệu chứa thẻ `<script>` chỉ hiển thị như văn bản.
- Hai người lưu gần đồng thời không làm mất dữ liệu.
- Token hết hạn hoặc đã logout không dùng lại được.
- Xóa địa điểm là xóa mềm và chỉ admin thực hiện được.
- Bản đồ có attribution OpenStreetMap.
- Chọn hai địa điểm luôn tính được khoảng cách đường chim bay; nếu OSRM khả dụng thì vẽ được tuyến lái xe và hiện khoảng cách tuyến đường.
- Khi dịch vụ định tuyến lỗi, các chức năng địa điểm, bình chọn và lịch vẫn tiếp tục hoạt động.
- Website hoạt động trên URL GitHub Pages, không chỉ localhost.

## 14. Ranh giới và rủi ro bảo mật

### Luôn thực hiện

- Validate và phân quyền trong Apps Script cho mọi request.
- Hash password và token; không lưu plaintext.
- Dùng HTTPS, khóa ghi, xóa mềm, audit log và backup.
- Giới hạn độ dài dữ liệu và số lần login sai trong một khoảng thời gian.
- Đổi password `123` sau khi nhóm thử nghiệm xong.

### Phải hỏi trước khi thay đổi

- Thêm user hoặc đổi role.
- Cho user quyền xóa dữ liệu chung.
- Thay đổi cấu trúc Sheet hoặc tên Sheet.
- Đưa dữ liệu cá nhân/nhạy cảm vào hệ thống.

### Không thực hiện

- Không commit password, hash, token hoặc bí mật lên GitHub.
- Không coi việc ẩn URL Apps Script là một biện pháp bảo mật.
- Không tin username hoặc role do frontend gửi lên.
- Không render nội dung người dùng bằng `innerHTML`.
- Không cấp quyền Editor của spreadsheet chỉ để người dùng sử dụng website.

## 15. Tiêu chí hoàn thành

- Bốn tài khoản đăng nhập đúng role; tài khoản khác bị từ chối.
- Admin và user bị giới hạn đúng quyền.
- Danh mục chung, lịch chung và bốn lịch cá nhân đọc/ghi đúng Sheet.
- Bình chọn được tổng hợp chính xác, không trùng phiếu.
- Bản đồ hiển thị đúng dữ liệu địa chỉ, Google Maps, loại, chi phí và giờ mở cửa.
- Marker có màu theo nhóm chính; popup hiển thị tên, giá, giờ mở cửa và toàn bộ nhóm.
- Bộ lọc hỗ trợ loại, ngày, sáng/chiều/tối và người dùng.
- Không có password, hash hoặc token trong repository.
- Website chạy ổn trên GitHub Pages và kết nối được Apps Script `/exec`.
- Có backup và có thể khôi phục địa điểm bị xóa mềm.

## 16. Thông tin còn cần cung cấp trước khi viết code

1. GitHub username và tên repository muốn dùng.
2. Ngày bắt đầu chuyến đi.
3. Tên, địa chỉ và link Google Maps của homestay.
4. Danh sách địa điểm ban đầu nếu đã có.
5. Chi phí sẽ lưu theo một số VND hay theo khoảng giá/mô tả.
6. Giờ dự kiến có cần chính xác `HH:mm` hay chỉ cần Sáng/Chiều/Tối.

Sau khi có các thông tin này, có thể chuyển sang bước viết Google Apps Script và frontend trong chính thư mục `da-lat`.

## 17. Tài liệu chính thức tham khảo

- Google Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Google Apps Script Content Service: https://developers.google.com/apps-script/guides/content
- GitHub Pages publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Leaflet documentation: https://leafletjs.com/reference.html
- OpenStreetMap copyright and attribution: https://www.openstreetmap.org/copyright
- OSRM Route API: https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
