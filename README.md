# 臺灣開票互動地圖

地圖涵蓋 22 個縣市、368 個鄉鎮市區及離島，可切換區域立委、議員選區與行政區，檢視首長、立委票數和議員當選名單。

GitHub 管理版本，Cloudflare Workers Static Assets 提供網站。地圖與資料包含在 public/index.html。

## Cloudflare 部署

在 Cloudflare Dashboard 的 Workers & Pages 建立應用程式，選擇 GitHub，再選擇 leepingyo/taiwan-election-atlas。

- Worker 名稱使用 taiwan-election-atlas。
- 正式分支使用 main。
- 專案根目錄使用儲存庫根目錄。
- Build command 留空。
- Deploy command 使用 npx wrangler deploy。

授權 Cloudflare GitHub App 讀取這個儲存庫，完成 Save and Deploy。之後推送至 main 時，Cloudflare 會自動發布。Cloudflare 帳號須由擁有者登入並完成授權。

本專案使用靜態資產。免費方案的靜態資產請求免費且不限次數。 [Cloudflare 官方說明](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## 本機操作

安裝 Node.js 20.19 以上版本，執行 npm install，再執行 npm run dev。

命令列部署可執行 npx wrangler login，再執行 npm run deploy。

## 編輯與嵌入

右上角「地圖編輯」可調整各區塊配色，並匯入 2026 年候選人及開票 JSON。設定儲存在目前瀏覽器。要讓讀者看到設定，下載發佈版 HTML，再用該檔案更新 public/index.html 並提交。

網站部署後，在其他網站使用 iframe，將 src 換成實際 workers.dev 網址。

```html
<iframe
  src="https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/"
  title="臺灣開票地圖"
  style="display:block;width:100%;height:900px;border:0"
  loading="lazy">
</iframe>
```

## 資料版本

- 首長預設顯示 2022 年地方選舉結果。
- 區域立委使用 2024 年第 11 屆選舉結果。
- 議員選區及席次使用 2026 年公告，另可查看 2022 年當選名單。
- 2026 年候選人及開票資料由編輯者整理後匯入 JSON。

資料取自 [中選會開放資料](https://data.cec.gov.tw/)、[第11屆立委選區公告](https://web.cec.gov.tw/central/article/39952)及 [2026 年地方選舉公告](https://web.cec.gov.tw/central/article/63626)。

行政界線來自國土測繪中心的 [鄉鎮市區界](https://data.gov.tw/dataset/7441)及 [村里界](https://data.gov.tw/dataset/7438)，依政府資料開放授權條款第 1 版利用。網頁地圖使用簡化界線。
