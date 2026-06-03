// ╔══════════════════════════════════════════════════════════════╗
// ║         Google Apps Script — 點數查詢系統後端               ║
// ║  貼到 Apps Script 編輯器，部署為「網頁應用程式」即可        ║
// ╚══════════════════════════════════════════════════════════════╝

// ▼▼▼ 填入你的 Google Sheets ID（網址列中間那段）▼▼▼
const SHEET_ID = '你的_GOOGLE_SHEETS_ID';
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// 工作表名稱（與 Google Sheets 分頁名稱一致）
const SHEET_USER  = 'user';
const SHEET_DATA  = 'data';
const SHEET_USING = 'using';

// ── 主入口：處理 GET 請求 ──────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if (action === 'login') {
      result = handleLogin(e.parameter.account, e.parameter.password);
    } else if (action === 'using') {
      result = handleUsing(e.parameter.accountNo);
    } else {
      result = { success: false, message: '無效的請求' };
    }
  } catch(err) {
    result = { success: false, message: '伺服器錯誤：' + err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 登入驗證 ───────────────────────────────────────────────────
function handleLogin(account, password) {
  if (!account || !password) {
    return { success: false, message: '請填寫帳號與密碼' };
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);

  // 1. 比對 user 工作表
  const userSheet = ss.getSheetByName(SHEET_USER);
  const userRows  = userSheet.getDataRange().getValues();
  let accountNo   = null;

  for (let i = 1; i < userRows.length; i++) {  // 從第2列開始（略過標題）
    const rowAccount  = String(userRows[i][0]).trim();
    const rowPassword = String(userRows[i][1]).trim();
    const rowAccountNo = String(userRows[i][2]).trim();
    if (rowAccount === account && rowPassword === password) {
      accountNo = rowAccountNo;
      break;
    }
  }

  if (!accountNo) {
    return { success: false, message: '帳號或密碼錯誤，查無資料' };
  }

  // 2. 讀取 data 工作表，篩選該戶號
  const dataSheet = ss.getSheetByName(SHEET_DATA);
  const dataRows  = dataSheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < dataRows.length; i++) {
    const rowAccountNo = String(dataRows[i][0]).trim();
    if (rowAccountNo === accountNo) {
      data.push({
        accountNo:  rowAccountNo,
        expireDate: formatDate(dataRows[i][1]),
        points:     dataRows[i][2]
      });
    }
  }

  return { success: true, accountNo, data };
}

// ── 點數使用查詢 ───────────────────────────────────────────────
function handleUsing(accountNo) {
  if (!accountNo) return { success: false, message: '缺少戶號' };

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const usingSheet = ss.getSheetByName(SHEET_USING);
  const usingRows  = usingSheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < usingRows.length; i++) {
    const rowAccountNo = String(usingRows[i][0]).trim();
    if (rowAccountNo === accountNo) {
      data.push({
        accountNo:    rowAccountNo,
        useDate:      formatDate(usingRows[i][1]),
        facilityName: String(usingRows[i][2]).trim(),
        usePoints:    usingRows[i][3]
      });
    }
  }

  // 依日期倒序排列
  data.sort((a, b) => new Date(b.useDate) - new Date(a.useDate));

  return { success: true, data };
}

// ── 日期格式化工具 ─────────────────────────────────────────────
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}
