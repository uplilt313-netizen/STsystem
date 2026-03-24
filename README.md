# 國中調代課自動化系統

一套純前端的國中調代課管理系統，專為台灣國中教學組設計，支援 人力資源網2.0匯出的課表格式。

## 功能特色

### 1. 課表匯入與智慧推薦
- 支援 Excel (.xls, .xlsx) 和 CSV 格式匯入
- 自動解析 人力資源網2.0的課表格式
- 智慧推薦代課教師（優先順序：同領域 > 班導師 > 其他空堂教師）

### 2. 一式四份調代課單 PDF 生成
- 原任課教師留存聯
- 代課教師留存聯
- 班級公告聯
- 教學組存查聯

### 3. 月結算與時數統計
- 自動計算每位教師的原定授課時數
- 統計代課增加/被代課減少時數
- 計算實際授課時數與超鐘點時數
- 支援匯出 Excel 報表

### 4. Firebase 雲端同步
- Google 帳號一鍵登入
- Firebase Realtime Database 即時同步
- 支援多設備共享調課紀錄
- 離線時自動切換本地儲存

## 技術架構

- **前端**：純 HTML + CSS + JavaScript (ES6 Modules)
- **資料儲存**：localStorage + Firebase Realtime Database
- **身份驗證**：Firebase Authentication（Google 登入）
- **部署**：可直接部署至 GitHub Pages
- **無需自建後端伺服器**

## 使用的 CDN 套件

- [PapaParse](https://www.papaparse.com/) - CSV 解析
- [SheetJS (xlsx)](https://sheetjs.com/) - Excel 讀取
- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) - PDF 表格

## 快速開始

### 本地測試

1. 使用 Python 啟動簡易伺服器：
   ```bash
   python start-server.py
   ```

2. 或使用其他 HTTP 伺服器：
   ```bash
   # Node.js
   npx serve

   # Python 3
   python -m http.server 8000
   ```

3. 開啟瀏覽器訪問 `http://localhost:8000`

### 部署到 GitHub Pages

1. 建立 GitHub Repository
2. 將專案檔案推送到 `main` 分支
3. 在 Repository Settings > Pages 中啟用 GitHub Pages
4. 選擇 `main` 分支作為來源

## 課表格式說明

系統支援 人力資源網2.0匯出的標準格式，包含以下欄位：

| 欄位名稱 | 說明 | 範例 |
|---------|------|------|
| 週次 | 星期幾 | 週一、週二... |
| 節次 | 第幾節課 | 第一節、第二節... |
| 年級 | 年級 | 7年級、8年級、9年級 |
| 班級 | 班級名稱 | 7年1班、8年2班... |
| 教師姓名 | 任課教師 | 王大明 |
| 類別 | 課程類別 | 領域學習、彈性學習 |
| 領域 | 學習領域 | 數學領域、語文領域... |
| 科目 | 科目名稱 | 數學、國語文... |

## 雲端同步功能

系統內建 Firebase 雲端同步，使用者只需：

1. 點擊「登入」按鈕
2. 使用 Google 帳號授權登入
3. 資料將自動同步至雲端

登入後可在多台設備間同步調代課紀錄，登出後自動切換為本地儲存模式。

## 專案結構

```
STsystem/
├── index.html              # 主頁面
├── start-server.py         # 本地測試伺服器
├── src/
│   ├── css/
│   │   └── style.css       # 樣式表
│   └── js/
│       ├── app.js          # 主應用程式
│       └── modules/
│           ├── dataManager.js          # 資料管理（含 Firebase 同步）
│           ├── scheduleParser.js       # 課表解析
│           ├── recommendationEngine.js # 智慧推薦
│           ├── pdfGenerator.js         # PDF 生成
│           └── settlementCalculator.js # 月結算
└── test/
    └── ...                 # 測試檔案
```

## 智慧推薦演算法

代課教師推薦依照以下優先順序排序：

1. **同領域教師**（+100 分）
   - 例如：數學課優先推薦數學領域老師

2. **該班導師**（+50 分）
   - 該班級的導師，熟悉學生狀況

3. **其他空堂教師**（+10 分）
   - 該時段沒有課的教師

## 月結算計算邏輯

```
實際授課時數 = 原定授課時數 + 代課增加時數 - 被代課減少時數

其中：
- 原定授課時數 = 每週節數 × 當月上課週數
- 代課增加時數 = 該月為他人代課的總節數
- 被代課減少時數 = 該月被他人代課的總節數
```

## 授權條款

MIT License
