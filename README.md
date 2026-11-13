# 臺灣開票互動地圖

[正式網站](https://taiwan-election-atlas.leepingyo.workers.dev/)

涵蓋 22 縣市、368 鄉鎮市區及離島，支援行政區、區域立委與議員選區。GitHub 管理版本，Cloudflare Workers 負責發布。

## 部署

正式分支 main，根目錄 /，Build command 留空，Deploy command 為 npx wrangler deploy。worker.js 提供資料介面，public/ 提供靜態網站；wrangler.toml 綁定 ASSETS。推送 main 後自動建置。

一般網站及嵌入頁使用靜態資產；/api/2026 會執行 Worker，計入免費方案的 Worker 用量。資料介面回應快取 5 分鐘，不啟用付費服務。

本機使用 Node.js 20.19 以上版本，執行 npm install、npm run dev。部署前可執行 npm run deploy:check。

## 編輯與嵌入

頁首顯示風傳媒 SVG logo，右上角「HTML 嵌入碼」可複製：
```html
<iframe src="https://taiwan-election-atlas.leepingyo.workers.dev/?embed=1"
  title="風傳媒・臺灣開票地圖"
  style="display:block;width:100%;height:1000px;border:0"
  loading="lazy"></iframe>
```
嵌入頁保留 logo，隱藏編輯控制。HTML 編輯器必須允許 iframe。

「地圖編輯」可調整配色並匯入開票 JSON，設定儲存於目前瀏覽器。下載發佈版 HTML 後，用該檔更新 public/index.html 並提交，才能讓其他讀者看見設定。

## 2026 資料與 API

預設顯示 2026 年。已匯入中選會 2026-09-07 製表、2026-11-13 核對的[官方候選人登記名冊](https://web.cec.gov.tw/central/article/64708)：81 位首長、1,502 位議員登記人，涵蓋 22 縣市及各議員選區。

這是登記名冊快照，不是最終審定名單。投開票日為 2026-11-28，票數為 null、當選標記為 false，頁面顯示「待開票」，不以 0 票冒充開票結果。

本站 GET /api/2026 傳回 public/data/cec-2026.json，含來源、製表日期、核對日期、資料狀態與 results；它是本站整理的 JSON 介面，**不是中選會官方即時 API**。目前未驗證到可公開介接的 2026 即時開票 API，因此未假設端點或自動抓取票數。後續需要根據正式公開介面另外接入並核對選區、候選人與當選公告。

每筆 results 資料沿用 [姓名, 政黨, 票數或null, 當選布林值]。議員尚未開票時列出登記人；有開票資料時只列已標記當選者，按票數排序，不自行推定當選。

更新官方名冊時，應同步更新 JSON 快照與 HTML 內嵌備援資料。編輯者匯入的資料優先於內建資料。下載 HTML 保留內建資料，可離線使用。

## 其他資料

可切換 2022 年首長及議員當選結果；區域立委使用 2024 年第 11 屆結果，2026 年不顯示為立委改選。議員選區與席次使用[2026 年公告](https://web.cec.gov.tw/central/article/63626)。

其他來源：[中選會開放資料](https://data.cec.gov.tw/)、[第11屆立委選區公告](https://web.cec.gov.tw/central/article/39952)、國土測繪中心[鄉鎮市區界](https://data.gov.tw/dataset/7441)及[村里界](https://data.gov.tw/dataset/7438)。圖資依政府資料開放授權條款第 1 版利用，網頁使用簡化界線，離島為放大示意，馬祖以連江縣標示。
