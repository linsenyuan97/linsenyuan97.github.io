// ============================================================
// 林森苑 LINE 綁定共用模組（給 book/course/facility/parking/share/index 六個頁面共用）
// ------------------------------------------------------------
// 用途：
//   - 若頁面是從 LINE 官方帳號的圖文選單（LIFF）開啟，自動取得 LINE 使用者身份，
//     查詢／建立「門牌 <-> LINE userId」綁定，取代原本的 localStorage 門牌記憶。
//   - 若不是從 LIFF 開啟（一般瀏覽器直接連上網站），init() 會 resolve(null)，
//     頁面應該照舊使用 localStorage 的門牌機制，不受影響。
//
// 使用方式（在各頁面自己的 <script> 裡）：
//   LineBinding.init('這個頁面對應的 LIFF ID').then(function (profile) {
//     if (!profile) { /* 不是從 LINE 開啟，照舊用 localStorage */ return; }
//     LineBinding.checkBound(profile.userId).then(function (info) {
//       if (info.bound) {
//         addr = info.addr; // 直接蓋掉 localStorage 的門牌
//         onAddrReady();
//       } else {
//         showAddrPickerModal(function (selectedAddr) {
//           LineBinding.bind(profile.userId, profile.displayName, selectedAddr)
//             .then(function () { addr = selectedAddr; onAddrReady(); });
//         });
//       }
//     });
//   });
// ============================================================

const LineBinding = (function () {
  // TODO: 部署 gas/user.gs 為 Web App 後，把網址貼在這裡（六個頁面共用同一組）
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyX2G2_jZy31CuTFlZDH4QnQU71SdIEHcF0TiT56FAo_8IiJhbS4Pr52uVe-t8hvQf0/exec';

  function init(liffId) {
    return new Promise(function (resolve) {
      if (!liffId || typeof liff === 'undefined') {
        resolve(null);
        return;
      }
      liff.init({ liffId: liffId })
        .then(function () {
          // 只有真的是從 LINE App 內建瀏覽器開啟（例如圖文選單點進來）才自動登入；
          // 如果是外部瀏覽器直接訪問網站（例如一般訪客用電腦瀏覽器打開網址），
          // 不強制導去 LINE 登入，避免打擾一般訪客。
          if (!liff.isInClient()) { return null; }
          if (!liff.isLoggedIn()) {
            liff.login(); // 會在 LINE 內建瀏覽器裡靜默完成，完成後頁面重新載入
            return null;
          }
          return liff.getProfile();
        })
        .then(function (profile) { resolve(profile || null); })
        .catch(function (err) {
          console.error('LIFF 初始化失敗:', err);
          resolve(null);
        });
    });
  }

  function checkBound(lineUserId) {
    return fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'checkBoundByUserId', lineUserId: lineUserId })
    }).then(function (r) { return r.json(); });
  }

  function bind(lineUserId, displayName, addr) {
    return fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'bindByUserId', lineUserId: lineUserId, displayName: displayName, addr: addr })
    }).then(function (r) { return r.json(); });
  }

  return { init: init, checkBound: checkBound, bind: bind };
})();
