# 戰鬥播放按鈕更新

依作者定案：左側只顯示暫停／播放 SVG，右側只顯示 1×／2×／3×；兩顆外框均為 56×44px。一般狀態白色，暫停及加速狀態淡金色。保留原操作回呼及速度循環。

按鈕維持高不透明度深色底，加強外框，在不同明暗背景仍能識別。保留鍵盤焦點、按鈕名稱及暫停狀態的無障礙標示。

驗證通過：

- `node scripts/verify-battle-control-backgrounds.mjs`：23 種 SVG 背景與純白／純黑，共 25 種背景、各四種狀態；最低文字／圖示對比 8.60:1、外框對按鈕底色 3.76:1。檢查懸停、鍵盤焦點、停用背景模糊及手機無溢出。
- `node scripts/preview-battle-controls.mjs`：圖示切換、倍率循環及等寬等高。
- `node scripts/verify-battle-controls-game.mjs`：原生版本／難度／選敵／開戰流程，實際按鈕狀態切換與尺寸。
- `npm run test:trainer-presentation`、`npm run test:smoke`、`npm run build`。

圖片與 JSON 證據保存於影片專案 `output/戰鬥控制按鈕-背景驗證-20261102/`。本次不修改影片、錄影副本及尚未提交的小火龍戰鬥調整。
