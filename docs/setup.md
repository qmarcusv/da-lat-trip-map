# Kết nối Google Sheets, Apps Script và GitHub Pages

## A. Tạo Google Sheet

1. Mở https://sheets.google.com và tạo spreadsheet tên `Da Lat Trip Database`.
2. Trong spreadsheet chọn `Extensions > Apps Script`.
3. Đặt tên project Apps Script là `Da Lat Trip API`.

Không cần tự tạo các tab. Hàm `setupProject()` sẽ tạo và kiểm tra đủ tám tab:

- `Locations`
- `SharedPlan`
- `Plan_trucnhi`
- `Plan_thao`
- `Plan_tuyen`
- `Plan_ngocnhi`
- `AuditLog`
- `Sessions`

## B. Đưa mã Apps Script vào project

Trong Apps Script editor, tạo các Script file rồi sao chép nội dung từ thư mục `apps-script/` theo đúng tên:

1. `Config.gs`
2. `Auth.gs`
3. `Repository.gs`
4. `Validation.gs`
5. `Services.gs`
6. `Code.gs`
7. `SeedData.gs`

Apps Script tự quản lý manifest. Nếu muốn dùng manifest trong repository:

1. Mở `Project Settings`.
2. Bật `Show "appsscript.json" manifest file in editor`.
3. Thay nội dung bằng file `apps-script/appsscript.json`.

## C. Tạo bốn tài khoản lần đầu

1. Trong Apps Script mở `Project Settings`.
2. Ở `Script Properties`, chọn `Add script property`.
3. Nhập:
   - Property: `INITIAL_PASSWORD`
   - Value: mật khẩu ban đầu đã thống nhất, hiện tại là `123`.
4. Lưu property.
5. Quay lại editor, chọn hàm `setupProject` trên thanh công cụ và bấm `Run`.
6. Đồng ý cấp quyền truy cập spreadsheet cho script.
7. Kiểm tra spreadsheet đã có đủ tám tab và đúng dòng tiêu đề.
8. Kiểm tra Script Properties: `INITIAL_PASSWORD` đã tự bị xóa; `USERS_JSON` và `SPREADSHEET_ID` đã được tạo.

Không chụp màn hình hoặc chia sẻ giá trị `USERS_JSON`. Dù chỉ chứa salt/hash, đây vẫn là dữ liệu xác thực phía server.

Để đổi mật khẩu chung sau khi thử nghiệm: tạo lại Script Property `INITIAL_PASSWORD` với giá trị mới, chạy thủ công hàm `resetAllPasswords()`, rồi kiểm tra property tạm đã tự xóa. Hàm này cũng đăng xuất toàn bộ phiên cũ.

Nếu `setupProject()` báo `SCHEMA_MISMATCH`, không sửa code để bỏ qua. Hãy kiểm tra dòng tiêu đề của tab được báo lỗi hoặc dùng spreadsheet mới chưa có dữ liệu.

## C.1. Nhập danh sách địa điểm và bình chọn ban đầu

Sau khi `setupProject()` đã tạo đủ tám tab:

1. Tạo file `SeedData.gs` trong Apps Script và dán nội dung từ `apps-script/SeedData.gs`.
2. Chọn hàm `seedExistingData` trên thanh công cụ rồi bấm `Run` đúng một lần.
3. Mở **Execution log**; kết quả lần đầu phải báo `locationsCreated: 32` và `votesCreated: 62` nếu database đang trống.
4. Kiểm tra tab `Locations` có 32 dòng dữ liệu; bốn tab `Plan_*` lần lượt có số lựa chọn: `thao` 17, `trucnhi` 9, `ngocnhi` 19, `tuyen` 17.

Hàm có chống trùng theo tên nên có thể chạy lại nếu lần chạy trước bị gián đoạn. Các ô FALSE không tạo dòng lịch cá nhân; tổng bình chọn được website tự tính. Địa điểm thiếu giá, giờ mở cửa hoặc tọa độ được giữ trống để cập nhật sau. Chúng vẫn hiện trong danh sách nhưng chỉ xuất hiện trên bản đồ và dùng được nút **Đo đường** sau khi có tọa độ hợp lệ.

## D. Deploy Apps Script thành Web app

1. Trong Apps Script chọn `Deploy > New deployment`.
2. Nhấn biểu tượng bánh răng cạnh `Select type`, chọn `Web app`.
3. Description: `Da Lat Trip API v1`.
4. Execute as: `Me` / tài khoản đang triển khai.
5. Who has access: chọn `Anyone` hoặc lựa chọn cho phép cả người không đăng nhập Google truy cập.
6. Nhấn `Deploy` và chấp nhận quyền được yêu cầu.
7. Sao chép Web app URL kết thúc bằng `/exec`.

Kiểm tra nhanh: mở URL `/exec` trong trình duyệt. Kết quả phải tương tự:

```json
{"success":true,"data":{"service":"Da Lat Trip API","status":"ok"}}
```

URL `/dev` chỉ dành cho chủ project test và không được đặt trong GitHub Pages.

## E. Gắn URL Apps Script vào frontend

Mở `js/config.js` và thay dòng:

```js
apiUrl: "",
```

thành:

```js
apiUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
```

URL `/exec` là endpoint công khai nên có thể xuất hiện trong frontend. Password, password hash và token thì tuyệt đối không được ghi vào file này.

Chạy local để thử:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Mở http://127.0.0.1:8080 và đăng nhập bằng một trong bốn username:

- `trucnhi`
- `thao`
- `tuyen`
- `ngocnhi`

Mật khẩu ban đầu là giá trị đã đặt ở `INITIAL_PASSWORD`.

## F. Khi sửa Apps Script

Lưu code không tự cập nhật deployment production. Sau mỗi lần sửa:

1. Chọn `Deploy > Manage deployments`.
2. Chọn deployment hiện tại và nhấn biểu tượng Edit.
3. Ở Version chọn `New version`.
4. Nhấn `Deploy`.

Giữ nguyên deployment hiện tại để URL `/exec` không đổi.

## G. Bật GitHub Pages

Sau khi code đã được push:

1. Mở https://github.com/qmarcusv/da-lat-trip-map.
2. Chọn `Settings > Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main`; folder: `/(root)`.
5. Nhấn `Save`.
6. Chờ GitHub Pages hoàn thành deployment.

Website dự kiến:

```text
https://qmarcusv.github.io/da-lat-trip-map/
```

## H. Checklist kết nối thật

- [ ] Mở URL `/exec` thấy JSON `status: ok`.
- [ ] `js/config.js` chứa đúng URL `/exec`, không phải `/dev`.
- [ ] `trucnhi / 123` đăng nhập được.
- [ ] `thao / 123` đăng nhập được nhưng không thấy nút xóa địa điểm.
- [ ] Thêm một địa điểm trên website tạo một dòng trong `Locations`.
- [ ] Bình chọn bằng `thao` tạo/cập nhật dòng trong `Plan_thao`.
- [ ] Đăng nhập `tuyen` không sửa được dòng trong `Plan_thao`.
- [ ] Xóa địa điểm bằng admin chuyển `status` thành `deleted` thay vì xóa dòng.
- [ ] Mở website trên điện thoại và kiểm tra bản đồ, popup, form.

## I. Xử lý lỗi thường gặp

### `src refspec main does not match any`

Repository chưa có commit. Sau khi đã có commit, lệnh `git push -u origin main` sẽ hoạt động.

### Website báo chưa kết nối Apps Script

- Kiểm tra `apiUrl` trong `js/config.js`.
- URL phải bắt đầu bằng `https://script.google.com/` và kết thúc bằng `/exec`.
- Kiểm tra đã push commit chứa cấu hình mới và GitHub Pages đã deploy xong.

### Đăng nhập luôn thất bại

- Kiểm tra đã chạy `setupProject()` thành công.
- Kiểm tra Script Properties có `USERS_JSON`.
- Kiểm tra `Executions` trong Apps Script để xem lỗi server.
- Nếu vừa sửa code, tạo `New version` cho deployment.

### Trình duyệt báo lỗi mạng/CORS

- Không đổi `Content-Type` trong `js/api.js`; frontend cố ý gửi `text/plain` để tránh preflight không cần thiết.
- Deployment phải cho phép `Anyone` truy cập và chạy dưới tài khoản người triển khai.
- Không dùng URL test `/dev` trên GitHub Pages.

### Bản đồ có marker nhưng không tính được đường

OSRM công cộng là dịch vụ demo và có thể gián đoạn. Website vẫn tính khoảng cách đường chim bay; lỗi OSRM không ảnh hưởng Google Sheets hoặc lịch trình.
