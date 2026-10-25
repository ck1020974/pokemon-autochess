# 程式繪製場景

23 張原始 SVG 由 Python 的幾何圖形繪製，不使用生成圖片。畫面中央保留戰鬥與備戰角色所需的空間。

在專案根目錄執行 `python scripts/draw_battle_scenes.py`，重建 SVG、`catalog.json` 及 `src/presentation/sceneAssets.css`。不需額外 Python 套件。

## 場地規則

`src/presentation/battlePresentation.ts` 負責候選池與隨機選景。App 在玩家選定對手時抽一次並保留結果，開戰演出和實戰共用該張背景。

- 0～7 勝：以敵方核心角色的遊戲羈絆選景。熱風 Fire 對應熔岩；潮汐 Water 對應水邊；吸取 Grass／蟲咬 BugBite 對應林地；降雪 Snow 對應冰川；洞穴 Cave 對應沙漠／道路；念力 Psychic／詛咒 Ghost 對應圖書館；充電 Charge／守住 Hard 對應競技場。至少半數核心角色符合才採用主題，其他隊伍隨機。
- 8～11 勝：四天王場次一律使用五色競技場。
- 12 勝起：冠軍場次一律使用青藍、薰衣草、白金三色殿堂。
- 候選足夠時避開最近兩張。小候選池用完時先排除上一張；僅單一主題場地允許連續重複。
- 備戰商店、休息中心、選敵營地及無限版研究所依遊戲狀態切換；角色池選擇優先使用研究所，不受上一場敗／平影響。

上述規則只改變背景，不影響角色、羈絆、傷害或其他戰鬥結果。

執行 `npm run test:battle-scenes` 檢查選景規則。開啟開發伺服器後，執行 `node scripts/check-scene-flow.mjs` 驗證選敵、開戰及桌機／手機橫向背景；可用 `SCENE_TEST_URL` 與 `SCENE_TEST_OUT` 指定伺服器及檢查輸出位置。
