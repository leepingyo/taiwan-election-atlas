# 2026 中選會接入準備

檢查日期：2026-11-28（臺灣時間）。正式網站：https://taiwan-election-atlas.pages.dev/

## 已部署

- 官方入口：https://vote.cec.gov.tw/home/zh-TW/ 。從入口實際公布的連結取得地方選舉與公投頁，不使用過往年度的猜測網址。
- 官方階段：讀取頁面 `VoteApp.api.run` 的 `prior`、`count`、`final`。本次實測為 `prior`，尚未發布計票表格。
- 路徑設定來自官方 2026 compiled tree，包含 22 縣市、368 鄉鎮市區及現有網站可對應的議員選區；鄉鎮市長維持六都以外範圍。共 821 個地方選舉查詢目標。
- 每 30 秒更新、Cloudflare 快取、分項查詢及並行上限，單次最大 38 個表格，控制在免費 Workers 的子請求限制內。
- 以縣市、鄉鎮、選區、候選人姓名及表格欄位驗證。空白、待開票、負值、錯誤選區及演練資料均拒絕；不將缺少資料換成零票、不推算當選人。
- D1 `election_feed_cache` 保存最後驗證資料。來源異常保留舊資料並標示；訪客計數器與原有資料不受影響。
- 主頁與純讀取嵌入版均已更新；嵌入版不含 API 匯入或編輯按鈕。保留 81 張官方首長候選人照片。

## 端點

- `/api/live2026`：全國縣市首長。
- `/api/live2026?county=連江縣&kind=mayorByTown`：鄉鎮市區內的縣市首長得票。
- `kind=council`：該縣市現有議員選區。
- `kind=townMayor`：六都以外鄉鎮市長。
- `/api/live2026?kind=referendum`：第 22 案全國支持與不支持票數。

狀態包括 `awaiting_counting`、`live_count`、`final_results`、`source_unavailable`、`not_applicable`。`updatedAt` 是取得時間；不宣稱為官方產製時間。`partial` 或 `stale` 會提示部分更新或保留上次資料。

## 尚待官方計票表格公布後核對

實際計票表格尚未公布，候選人得票、公投總計與當選圖記的解析目前以合約測試驗證，不能宣稱已取得真實票數。只有正式頁面進入計票階段、實際欄位及識別驗證全部通過才會套用；官方若改版，端點會拒絕未知格式，須再調整解析器。公投僅接受明確標示全國／總計／合計的一筆資料，不加總可能重複的地區列。

本次使用官方公開查詢站點，並非取得中選會另行提供或授權的 JSON 開票 API。可公開查詢不等於另獲商業授權；網站保留「資料來源：中選會」與官方公告優先註記。未啟用授權未確認的第三方票數來源。

## 本機維護

- `work/cec-live-adapter.js`：解析及官方來源連接。
- `work/prepare-cec-live.mjs`：依官方樹建立設定、組合進 Pages Worker。
- `work/verify-cec-live.mjs`：階段、表格、行政區、缺值與舊資料保留測試。
- `work/cloudflare/election-feed.sql`：新增快取表，沒有修改訪客表。
- `work/cloudflare/public/_worker.js`：實際部署的獨立 Worker。

勿執行舊 `work/verify-official-feed.mjs`：其舊有產檔副作用會覆寫現在的 Worker。

開票進度依官方明示的百分比或已開票所數／應開票所數顯示；僅在 22 縣市均有完整所數時彙總全國進度，缺值不推算。\n