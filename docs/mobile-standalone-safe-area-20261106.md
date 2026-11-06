# iPhone 主畫面模式：頂列安全區與短螢幕修正

作者回報：從 iPhone 加入主畫面的遊戲圖示進入，偶爾頂列被遮住，轉向後再回來才恢復。

## 已確認的程式問題

- `viewport-fit=cover` 與 `apple-mobile-web-app-status-bar-style=black-translucent` 讓遊戲自行處理安全區，但手機 CSS 的 `#root { padding:5px }` 覆蓋了預設 `safe-area-inset-top`。
- 高度小於380px的規則直接對 `.header` 設 `display:none`。只要啟動當下的可用高度落在這個範圍，上排就會被程式隱藏。
- 完整遊戲的HUD內容在左右瀏海安全區下會超出可用寬度，右側圖鑑／聲音按鈕可能被裁切。

這些是已重現的CSS缺陷，並非已在iPhone實機重現、確認所有偶發啟動問題的根因。

## 修正

- 手機版緊湊間距仍保留四邊安全區，不需等待旋轉才套用。
- 短螢幕不再隱藏頂列；頂列及其群組在空間不足時換行，手機備戰畫面使用原有緊湊字級。
- 內容超過可用高度時允許垂直捲動，避免新增顯示頂列後，下方商店或戰鬥按鈕被裁切。
- 背景最小高度以`100dvh`反映動態可用高度，保留`100vh`作舊瀏覽器回退。

## 驗證與限制

`npm run test:mobile-safe-area` 使用 Chrome CDP 的 `Emulation.setSafeAreaInsetsOverride`，直接覆寫瀏覽器的`env(safe-area-inset-*)`，不是自行模擬CSS padding。

- 13個尺寸／安全區情境：初始頂部44／59px、左右47／59px、短高度360／375px，以及同尺寸下安全區改變而沒有旋轉。
- 另以實際遊戲檢查頂列各項目均在安全邊界內，下方戰鬥按鈕能捲動至可點位置。
- 修正前失敗紀錄與畫面、修正後量測及畫面：`output/mobile-safe-area-20261106/`。
- 桌面Chrome模擬不能取代iPhone standalone實機驗證，不宣稱所有iOS系統視窗異常都已排除。

參考：[WebKit viewport單位](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)、[Apple對Safari安全區的說明](https://developer.apple.com/videos/play/wwdc2021/10029/)。
