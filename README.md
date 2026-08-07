# 🎮 寶可夢自走棋 (Pokemon Auto Chess)

一款基於寶可夢主題的自走棋遊戲，使用 React + TypeScript + Vite 開發。

## 🌟 遊戲特色

- 🎯 **策略性玩法**：購買、合成、升級寶可夢建立最強隊伍
- ⚔️ **自動戰鬥**：觀看您的隊伍自動戰鬥
- 🔄 **羈絆系統**：組合不同屬性與特性的寶可夢獲得加成
- 📈 **成長機制**：透過戰鬥與合成讓寶可夢變得更強
- 🏆 **挑戰模式**：擊敗道館館主與四天王，成為冠軍

## 🎯 遊戲目標

- 獲得 8 勝：解鎖道館徽章，獲得 +1 生命
- 獲得 12 勝：擊敗四天王，獲得 +1 生命
- 獲得 13 勝：成為冠軍，遊戲勝利！

## 🚀 線上遊玩

[點擊這裡開始遊戲](https://ck1020974.github.io/pokemon-autochess/)

## 💻 本地開發

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```

### 建置專案
```bash
npm run build
```

## 📱 手機遊玩

本遊戲支援手機瀏覽器遊玩！
- 在手機瀏覽器開啟遊戲網址
- 可以使用「加入主畫面」功能，像 App 一樣使用

## 🎲 遊戲玩法

1. **購買階段**：使用金幣購買商店中的寶可夢
2. **佈陣**：拖放寶可夢到戰場上的 5 個位置
3. **合成**：3 隻相同的寶可夢可以合成升星
4. **進化**：某些寶可夢升星時會進化成更強的形態
5. **戰鬥**：點擊「開始戰鬥」觀看自動戰鬥
6. **羈絆**：組合相同屬性/特性的寶可夢獲得額外加成

## 🔧 技術棧

- **前端框架**：React 18
- **開發語言**：TypeScript
- **建置工具**：Vite
- **樣式**：CSS Modules
- **部署**：GitHub Pages

## 📄 授權

本專案僅供學習與娛樂用途。寶可夢相關素材版權歸任天堂/Game Freak 所有。

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

---

## 本機執行與驗證

第一次執行請先安裝依賴：

```powershell
npm install
npm run dev
```

開啟 Vite 顯示的網址，通常是 `http://localhost:5173/`。自動驗證可依序執行：

```powershell
npm run test:trainer-presentation
npm run test:balance-values
npm run test:smoke
npm run build
```

Made with ❤️ by 李祐馨
