# OKJ P&L Dashboard

## Files
- `index.html` — หน้า dashboard + CSS
- `config.js` — MGR zones, branch mapping
- `data.js` — ข้อมูล P&L รายเดือน (อัปเดตทุกเดือน)
- `app.js` — ฟังก์ชันทั้งหมด

## GitHub Pages
Settings → Pages → Deploy from `main` branch, root `/`

## การอัปเดตข้อมูลเดือนใหม่
เพิ่ม key เดือนใหม่ใน `data.js` → `const MONTHS={...}`
