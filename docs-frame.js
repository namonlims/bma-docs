/* หน้าที่อยู่ในเมนูเอกสาร PHCIS: เปิดตรง (ไม่ได้อยู่ในช่องขวาของหน้ารวม) → ย้ายเข้าหน้ารวมพร้อมเมนูซ้าย (ผู้ใช้ 15 พ.ย. 69 "หน้าที่กดไปก็ต้องยังคงมี sidemenu") */
(function () {
  if (window.top !== window.self) return;
  var f = location.pathname.split('/').pop();
  location.replace('index.html#d=' + encodeURIComponent(f + location.hash));
})();
