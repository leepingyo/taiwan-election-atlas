# 中選會 2026 計票接入狀態

目前尚未接入中選會即時票數。/api/2026 是登記名冊快照，/api/live2026 明確回傳 awaiting_official_feed；不應宣稱為官方即時 API。

2026-11-25 查核：中選會 FAQ 說明 11 月 28 日 16:00 起提供即時查詢，公開計票網站 https://vote.cec.gov.tw/ 回傳 HTTP 403，未取得已確認的 2026 原始計票格式或媒體下載端點。歷屆媒體下載流程不代表今年端點或授權已確認。

## 待完成的正式接入

1. 取得中選會正式媒體下載網址、使用範圍及樣本資料。
2. 依今年原始格式實作及測試轉接；不得猜測 URL，也不得把歷屆或演練票數當作正式票數。
3. 在 Cloudflare Pages production 設定 CEC2026_FEED_URL。僅允許 HTTPS 的 cec.gov.tw 及子網域，不接受任意代理網站。若必要，CEC2026_FEED_TOKEN 用 secret 保存，不提交 GitHub。
4. 現有接收端要求 schemaVersion=1、electionYear=2026、status=live_count 或 final_results、updatedAt、results。此格式是本站內部格式，不代表中選會公開 API 格式；原始格式不相符時必須先修改轉接器。
5. results 使用本站候選人四欄記錄 [姓名,政黨,票數或 null,正式當選標記]；可含 mayor、mayorByTown、mayorByLeg、council、townMayor。公投可含 referendum: {id:22,support:整數,oppose:整數}。

## 部署與嵌入

正式網址：https://taiwan-election-atlas.pages.dev/
嵌入頁：https://taiwan-election-atlas.pages.dev/embed.html
嵌入頁不含匯入或編輯控制項。所有頁面每 60 秒檢查共用資料接收端，頁面隱藏時暫停；上游失敗時保留本次瀏覽已取得的資料。

使用現有登入執行 wrangler pages deploy public --project-name taiwan-election-atlas --branch main --no-bundle。public/_worker.js 為 Pages advanced-mode worker；_routes.json 僅讓 /api/live2026 使用 Worker。

官方來源：https://info.cec.gov.tw/vote2026/question/ 以及 https://www.ey.gov.tw/File/353306FCE9CBA968?A=C
