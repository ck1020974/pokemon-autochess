# 念力與小偷調整

已核准：念力對隨機 2／3／5 名敵人各造成 N 傷害；保留原觸發時機，每場一次；我方 N 初始 2，啟用時戰後固定 +1。敵方沿用玩家勝場 +1。小偷保留每名角色觸發、依攻擊加當前生命選最強敵人、我方永久成長，只將五羈絆偷取量由 5 改 8，兩羈絆維持 2。

文字採作者定案版本，不修改已核准影片、旁白及錄影副本。

- [x] 新增行為測試，確認舊版在累進、命中數及偷取量上失敗。
- [x] 修改 Synergies、GameLoop、BattleSimulator，同步 HeadlessBattleSimulator 的這兩項規則及可傳入的雙方 N。
- [x] 執行行為測試、既有相關測試及正式建置。
- [x] 保留固定第 5 槽修正；不夾帶尚未提交的小火龍變更。
- [ ] 推送 GitHub main、等待 Pages 部署並核對線上資源及說明。

驗證：`npm run test:psychic-thief` 通過 74 項，包含雙方、死亡目標不足、完整五目標、各階級與逐場成長。`test:balance-values`、`test:permanent-family-buffs`、`test:temporary-reward-order`、`test:summon-ownership` 通過；`test:smoke` 通過 266 角色、60 商店流程及 100 場戰鬥；`npm run build` 通過。正式建置 JS 為 `assets/index-Dx2wffpx.js`。

平衡模擬器可由建構子第五／六參數傳入實際雙方念力 N；未傳入時我方採初始 2，敵方依第四參數勝場數 +1。既有批次模擬流程尚未改成跨場保存念力養成，不應用其結果宣稱新版長期平衡已驗證。
