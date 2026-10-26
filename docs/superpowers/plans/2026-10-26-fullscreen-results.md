# 勝敗全畫面與結算圖示一致

使用者要求勝敗底色覆蓋整個畫面、雙方結算角色圖示都保留陰影。

原因：`.battle-result-overlay` 仍使用 absolute、16px 圓角，受遊戲容器邊界限制；敵方圖示 inline `filter: grayscale(.2)` 覆蓋 `.summary-unit-img` 的 drop-shadow。

設計：結果層共用 fixed/inset 0、無圓角；保留已確認黑灰底與透明訊息。移除敵方圖示 filter override，雙方直接共用同一陰影。維持版面、數值和滑動規則。

- [x] 真實瀏覽器紅燈：結果層為 absolute，不符合全視窗固定定位。
- [x] 產品程式只改三行：fixed、radius 0、移除敵方 inline filter。
- [x] 桌機／手機 WIN、LOSS、完整結果、雙方隊伍及長紀錄驗證：32 個狀態通過，無瀏覽器錯誤。四邊誤差小於 1px、雙方 filter 相同且含 drop-shadow。
- [x] TypeScript／Vite 建置與 trainer-presentation 通過；唯讀審查確認父層沒有 transform/filter/contain 限制 fixed 定位。

驗證輸出：工作區 `output/全畫面勝敗與雙方陰影-20261026/`。發布後另記錄 Pages 與正式站結果。
