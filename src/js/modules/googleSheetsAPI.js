/**
 * Google Sheets API 模組
 *
 * 透過 Google Apps Script Web App 與 Google Sheets 互動
 * 用於儲存和讀取調代課紀錄
 *
 * 前端透過 fetch 呼叫 GAS Web App 的端點
 */

export class GoogleSheetsAPI {
    constructor() {
        this.baseUrl = '';
    }

    /**
     * 設定 API 基礎 URL
     * @param {string} url - Google Apps Script Web App URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }

    /**
     * 測試連線
     * @param {string} url - 要測試的 URL
     * @returns {Promise<Object>} 測試結果
     */
    async testConnection(url) {
        try {
            const response = await fetch(`${url}?action=test`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return {
                success: result.success || false,
                message: result.message || 'Connection OK'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 新增調課紀錄到 Google Sheets
     * @param {string} url - GAS Web App URL
     * @param {Object} record - 調課紀錄
     * @returns {Promise<Object>} 操作結果
     */
    async appendRecord(url, record) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'append',
                    data: record
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('新增紀錄失敗:', error);
            throw error;
        }
    }

    /**
     * 從 Google Sheets 讀取紀錄
     * @param {string} url - GAS Web App URL
     * @param {Object} filters - 篩選條件
     * @returns {Promise<Array>} 紀錄陣列
     */
    async getRecords(url, filters = {}) {
        try {
            const params = new URLSearchParams({
                action: 'get',
                ...filters
            });

            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('讀取紀錄失敗:', error);
            throw error;
        }
    }

    /**
     * 刪除紀錄
     * @param {string} url - GAS Web App URL
     * @param {string} recordId - 紀錄 ID
     * @returns {Promise<Object>} 操作結果
     */
    async deleteRecord(url, recordId) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete',
                    id: recordId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('刪除紀錄失敗:', error);
            throw error;
        }
    }

    /**
     * 批次同步紀錄
     * @param {string} url - GAS Web App URL
     * @param {Array} records - 紀錄陣列
     * @returns {Promise<Object>} 操作結果
     */
    async batchSync(url, records) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'batchSync',
                    data: records
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('批次同步失敗:', error);
            throw error;
        }
    }
}

/**
 * ===============================================
 * 以下是 Google Apps Script 端的程式碼範例
 * 請複製到 Google Apps Script 專案中使用
 * ===============================================
 *
 * 步驟：
 * 1. 建立新的 Google Sheets 試算表
 * 2. 點選「擴充功能」>「Apps Script」
 * 3. 將以下程式碼貼到 Code.gs
 * 4. 部署為 Web App（存取權限設為「任何人」）
 * 5. 複製 Web App URL 到前端系統使用
 */

/*
// ===== Google Apps Script 程式碼（Code.gs）=====

// 設定試算表 ID（從 Google Sheets URL 中取得）
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const SHEET_NAME = '調代課紀錄';

// 處理 GET 請求
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'test') {
    return jsonResponse({ success: true, message: '連線成功' });
  }

  if (action === 'get') {
    return getRecords(e.parameter);
  }

  return jsonResponse({ success: false, error: '未知的操作' });
}

// 處理 POST 請求
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'append') {
      return appendRecord(payload.data);
    }

    if (action === 'delete') {
      return deleteRecord(payload.id);
    }

    if (action === 'batchSync') {
      return batchSync(payload.data);
    }

    return jsonResponse({ success: false, error: '未知的操作' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// 新增紀錄
function appendRecord(data) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);

  // 如果是新表，先建立標題列
  if (headers.length === 0) {
    const defaultHeaders = [
      'ID', '日期', '星期', '節次', '班級', '科目', '領域',
      '原任課教師', '代課教師', '事由', '建立時間'
    ];
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
  }

  // 新增資料列
  const rowData = [
    data.id || Utilities.getUuid(),
    data.date,
    data.weekday,
    data.period,
    data.className,
    data.subject,
    data.domain || '',
    data.originalTeacher,
    data.substituteTeacher,
    data.reason,
    data.createdAt || new Date().toISOString()
  ];

  sheet.appendRow(rowData);

  return jsonResponse({ success: true, message: '紀錄已新增' });
}

// 讀取紀錄
function getRecords(filters) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return jsonResponse({ success: true, data: [] });
  }

  const headers = data[0];
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index];
    });

    // 套用篩選條件
    let include = true;
    if (filters.startDate && record['日期'] < filters.startDate) include = false;
    if (filters.endDate && record['日期'] > filters.endDate) include = false;
    if (filters.teacher && record['原任課教師'] !== filters.teacher &&
        record['代課教師'] !== filters.teacher) include = false;

    if (include) {
      records.push(record);
    }
  }

  return jsonResponse({ success: true, data: records });
}

// 刪除紀錄
function deleteRecord(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const idIndex = 0; // ID 在第一欄

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: '紀錄已刪除' });
    }
  }

  return jsonResponse({ success: false, error: '找不到紀錄' });
}

// 批次同步
function batchSync(records) {
  const sheet = getSheet();

  // 清除現有資料（保留標題）
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // 批次新增
  records.forEach(record => {
    appendRecord(record);
  });

  return jsonResponse({ success: true, message: `已同步 ${records.length} 筆紀錄` });
}

// 取得工作表
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  return sheet;
}

// 取得標題列
function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

// 回傳 JSON 格式
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

*/
