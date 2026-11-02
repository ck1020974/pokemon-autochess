import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authorClient, fetchDashboard, isAuthor } from './authorApi';
import type { DashboardData, DashboardFilters, TeamSnapshot } from './types';
import { SYNERGIES } from '../models/Synergies';
import './AuthorDashboard.css';

type Access = 'checking' | 'signed_out' | 'allowed' | 'denied' | 'error';
const editions: Record<string, string> = { classic: '經典版本', modern: '帝王版本', infinite: '無限版本' };
const difficulties: Record<string, string> = { NORMAL: '普通', GREAT: '超級', ULTRA: '高級', MASTER: '大師' };
const statuses = { victory: '已通關', defeat: '已戰敗', abandoned: '未完成', in_progress: '進行中' };
const number = (value: number) => value.toLocaleString('zh-TW');
const rate = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;
const dateTime = (value: string) => new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
function initialFilters(): DashboardFilters {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const start = new Date(`${today}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    return { from: start.toISOString().slice(0, 10), to: today, edition: '', difficulty: '', version: '' };
}

function Team({ team }: { team: TeamSnapshot }) {
    return <ol className="ad-team" aria-label="最終隊伍，依邏輯槽位排序">{Array.from({ length: Math.max(5, team.length) }, (_, index) => {
        const unit = team[index];
        return <li key={index} className={unit ? '' : 'ad-empty-slot'}><small>槽位 {index + 1}</small>{unit ? <><strong>{unit.name}</strong><span>Lv.{unit.level} · 攻 {unit.attack}</span><span>生命 {unit.hp} / {unit.maxHp}</span></> : <span>空槽</span>}</li>;
    })}</ol>;
}

function DailyChart({ daily }: { daily: DashboardData['daily'] }) {
    const max = Math.max(1, ...daily.flatMap(row => [row.visits, row.runs]));
    const x = (index: number) => 48 + index * 686 / Math.max(1, daily.length - 1);
    const y = (value: number) => 180 - value / max * 148;
    return <><div className="ad-chart-legend"><span><i />造訪次數</span><span><i />合格遊玩局次</span></div>
        {daily.length ? <svg className="ad-chart" viewBox="0 0 760 220" role="img" aria-label={`每日造訪及合格遊玩趨勢，共 ${daily.length} 天；詳細數值可展開每日資料表。`}>
            {[0, 0.5, 1].map(tick => <g key={tick}><line x1="48" x2="734" y1={y(tick * max)} y2={y(tick * max)} stroke="currentColor" opacity=".12" /><text x="36" y={y(tick * max) + 4} textAnchor="end">{Number((tick * max).toFixed(1))}</text></g>)}
            <polyline points={daily.map((row, i) => `${x(i)},${y(row.visits)}`).join(' ')} fill="none" stroke="#dfbc79" strokeWidth="3" strokeLinejoin="round" />
            <polyline points={daily.map((row, i) => `${x(i)},${y(row.runs)}`).join(' ')} fill="none" stroke="#8abbba" strokeWidth="2.5" strokeLinejoin="round" />
            {daily.map((row, i) => <g key={row.date}><circle cx={x(i)} cy={y(row.visits)} r="3" fill="#dfbc79"><title>{row.date}：造訪 {row.visits} 次，遊玩 {row.runs} 局</title></circle><circle cx={x(i)} cy={y(row.runs)} r="3" fill="#8abbba" />{(i === 0 || i === daily.length - 1 || (daily.length > 4 && i === Math.floor(daily.length / 2))) && <text x={x(i)} y="208" textAnchor="middle">{row.date.slice(5)}</text>}</g>)}
        </svg> : <p className="ad-empty">這段期間尚無每日資料。</p>}
        <details className="ad-daily-details"><summary>查看每日資料表（{daily.length} 天）</summary><div className="ad-table-wrap"><table><thead><tr><th>日期</th><th>造訪</th><th>匿名玩家</th><th>遊玩局次</th><th>戰鬥樣本</th></tr></thead><tbody>{daily.map(row => <tr key={row.date}><th scope="row">{row.date}</th><td>{number(row.visits)}</td><td>{number(row.players)}</td><td>{number(row.runs)}</td><td>{number(row.battles)}</td></tr>)}</tbody></table></div></details></>;
}

export default function AuthorDashboard() {
    const [access, setAccess] = useState<Access>('checking');
    const [authError, setAuthError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    const setupToken = useRef(new URLSearchParams(window.location.hash.slice(1)).get('setup') || new URL(window.location.href).searchParams.get('setup'));
    const [needsPassword, setNeedsPassword] = useState(Boolean(setupToken.current));
    const [confirmation, setConfirmation] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const recoveryRequest = useRef<ReturnType<typeof authorClient.auth.verifyOtp> | null>(null);
    const [filters, setFilters] = useState(initialFilters);
    const [applied, setApplied] = useState(filters);
    const [refresh, setRefresh] = useState(0);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [online, setOnline] = useState(navigator.onLine);
    const accessCheck = useRef(0);
    const sessionUser = useRef<string | null>(null);
    useEffect(() => {
        document.body.classList.add('author-dashboard-open');
        const updateOnline = () => setOnline(navigator.onLine);
        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);
        let alive = true;
        async function verify(userId: string | null) {
            const check = ++accessCheck.current;
            sessionUser.current = userId;
            setData(null);
            setAuthError('');
            if (!userId) { setAccess('signed_out'); return; }
            setAccess('checking');
            try {
                const allowed = await isAuthor();
                if (alive && check === accessCheck.current) setAccess(allowed ? 'allowed' : 'denied');
            } catch (reason) {
                if (alive && check === accessCheck.current) { setAccess('error'); setAuthError(reason instanceof Error ? reason.message : '無法確認作者權限。'); }
            }
        }
        const { data: subscription } = authorClient.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION' && setupToken.current) return;
            if (event === 'TOKEN_REFRESHED' && session?.user.id === sessionUser.current) return;
            // Leave the auth callback before querying membership to avoid holding the auth lock.
            void Promise.resolve().then(() => { if (alive) void verify(session?.user.id ?? null); });
        });
        const initialCheck = accessCheck.current;
        const token = setupToken.current;
        if (token) {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('setup');
            cleanUrl.searchParams.delete('type');
            const fragment = new URLSearchParams(cleanUrl.hash.slice(1));
            fragment.delete('setup');
            fragment.delete('type');
            cleanUrl.hash = fragment.toString();
            window.history.replaceState(null, '', cleanUrl.href);
        }
        // Keep the one-time exchange outside the auth callback. Reuse its promise under StrictMode.
        if (token && !recoveryRequest.current) recoveryRequest.current = authorClient.auth.verifyOtp({ token_hash: token, type: 'recovery' });
        const sessionRequest = token
            ? recoveryRequest.current!
            : authorClient.auth.getSession();
        void sessionRequest.then(({ data: sessionData, error: sessionError }) => {
            if (!alive || initialCheck !== accessCheck.current) return;
            if (sessionError) { setAccess('error'); setAuthError(token ? '設定連結已失效或無法驗證，請向管理者取得新的設定連結。' : '無法讀取登入狀態，請重新登入。'); }
            else void verify(sessionData.session?.user.id ?? null);
        }).catch(() => { if (alive) { setAccess('error'); setAuthError('無法讀取登入狀態，請重新登入。'); } });
        return () => { alive = false; subscription.subscription.unsubscribe(); document.body.classList.remove('author-dashboard-open'); window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
    }, []);
    useEffect(() => {
        let alive = true;
        setData(null);
        setError('');
        if (access !== 'allowed' || needsPassword) { setLoading(false); return; }
        if (!online) { setLoading(false); return; }
        setLoading(true);
        void fetchDashboard(applied).then(result => { if (alive) setData(result); }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : '讀取資料失敗，請稍後再試。'); }).finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [access, applied, refresh, online, needsPassword]);
    async function login(event: FormEvent) {
        event.preventDefault(); setSigningIn(true); setAuthError('');
        try {
            const { error: loginError } = await authorClient.auth.signInWithPassword({ email: email.trim(), password });
            if (loginError) setAuthError('登入失敗，請確認電子郵件、密碼及網路連線。');
            else setPassword('');
        } catch { setAuthError('登入服務暫時無法連線，請稍後再試。'); }
        finally { setSigningIn(false); }
    }
    async function logout() {
        ++accessCheck.current; setData(null); setAccess('checking'); setAuthError('');
        try {
            const { error: logoutError } = await authorClient.auth.signOut();
            if (logoutError) { setAccess('error'); setAuthError('登出未完成，請重試。'); }
            else { setAccess('signed_out'); setNeedsPassword(false); setPassword(''); setConfirmation(''); }
        } catch { setAccess('error'); setAuthError('登出未完成，請重試。'); }
    }
    async function savePassword(event: FormEvent) {
        event.preventDefault();
        if (password.length < 12) { setAuthError('密碼至少需要 12 個字元。'); return; }
        if (password !== confirmation) { setAuthError('兩次輸入的密碼不一致。'); return; }
        setSavingPassword(true); setAuthError('');
        try {
            const { error: updateError } = await authorClient.auth.updateUser({ password });
            if (updateError) setAuthError('密碼設定未完成，請確認連線後重試，或取得新的設定連結。');
            else { setPassword(''); setConfirmation(''); setNeedsPassword(false); }
        } catch { setAuthError('無法連線至登入服務，請稍後重試。'); }
        finally { setSavingPassword(false); }
    }
    function applyFilters(event: FormEvent) { event.preventDefault(); setApplied({ ...filters }); setRefresh(value => value + 1); }
    const s = data?.summary;
    const gameUrl = new URL('./', window.location.href);
    return <main className="author-dashboard">
        <header className="ad-header"><a className="ad-brand" href={gameUrl.href}><span className="ad-brand-mark" aria-hidden="true">◒</span> 寶可夢自走棋<span className="ad-brand-caption">AUTHOR OBSERVATORY</span></a><nav aria-label="作者頁導覽"><span className="ad-private"><i />僅限作者</span><a href={gameUrl.href}>返回遊戲 ↗</a>{access !== 'signed_out' && access !== 'checking' && <button className="ad-button ad-button-quiet" onClick={() => void logout()}>登出</button>}</nav></header>
        <div className="ad-intro"><p className="ad-eyebrow">PLAY / UNDERSTAND / REFINE</p><h1>每一局，都有故事。</h1><p>從遊玩趨勢到最後一格隊伍，了解玩家如何走過這場冒險。</p></div>
        {!online && <div className="ad-notice" role="status">目前離線。恢復連線後將重新讀取；此頁不顯示快取統計。</div>}
        {access === 'checking' && <div className="ad-state" role="status"><span className="ad-loader" />正在確認作者權限…</div>}
        {access === 'signed_out' && <section className="ad-login ad-panel"><p className="ad-eyebrow">PRIVATE ACCESS</p><h2>作者登入</h2><p>使用已獲授權的作者帳號查看全站統計。</p><form onSubmit={event => void login(event)}><label>電子郵件<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>密碼<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{authError && <p className="ad-error" role="alert">{authError}</p>}<button className="ad-button ad-button-primary" disabled={signingIn || !online}>{signingIn ? '登入中…' : '登入作者統計 →'}</button></form><small>玩家不需註冊。此處僅開放既有作者帳號登入。</small></section>}
        {(access === 'denied' || access === 'error') && <section className="ad-state ad-panel"><p className="ad-eyebrow">ACCESS RESTRICTED</p><h2>{access === 'denied' ? '此帳號沒有作者權限' : '暫時無法確認權限'}</h2><p>{authError || '已登入的帳號未獲授權，無法查看統計資料。請登出後使用作者帳號。'}</p><button className="ad-button" onClick={() => void logout()}>登出並重新登入</button></section>}
        {access === 'allowed' && needsPassword && <section className="ad-login ad-panel"><p className="ad-eyebrow">FIRST VISIT</p><h2>設定作者密碼</h2><p>作者權限已確認。請設定日後登入使用的密碼。</p><form onSubmit={event => void savePassword(event)}><label>新密碼（至少 12 個字元）<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} required /></label><label>再次輸入新密碼<input type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>{authError && <p className="ad-error" role="alert">{authError}</p>}<button className="ad-button ad-button-primary" disabled={savingPassword || !online}>{savingPassword ? '設定中…' : '儲存密碼並查看統計 →'}</button></form><small>請妥善保存密碼；設定連結僅供首次啟用使用。</small></section>}
        {access === 'allowed' && !needsPassword && <>
            <form className="ad-filters ad-panel" onSubmit={applyFilters}><div className="ad-filter-heading"><strong>觀察區間</strong><span>Asia / Taipei · 含起訖日</span></div><div className="ad-filter-fields"><label>開始日期<input type="date" value={filters.from} max={filters.to} onChange={event => setFilters({ ...filters, from: event.target.value })} required /></label><label>結束日期<input type="date" value={filters.to} min={filters.from} onChange={event => setFilters({ ...filters, to: event.target.value })} required /></label><label>模式<select aria-label="模式" value={filters.edition} onChange={event => setFilters({ ...filters, edition: event.target.value })}><option value="">全部模式</option>{Object.entries(editions).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>難度<select aria-label="難度" value={filters.difficulty} onChange={event => setFilters({ ...filters, difficulty: event.target.value })}><option value="">全部難度</option>{Object.entries(difficulties).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>遊戲版本<select aria-label="遊戲版本" value={filters.version} onChange={event => setFilters({ ...filters, version: event.target.value })}><option value="">全部版本</option>{Array.from(new Set([...(data?.versions ?? []), filters.version].filter(Boolean))).map(version => <option key={version} value={version}>{version}</option>)}</select></label><button className="ad-button ad-button-primary" disabled={loading || !online}>套用 / 重新整理 ↻</button></div></form>
            <div className="ad-data-meta"><span>{applied.from} — {applied.to}<span className="ad-dot">·</span>造訪次數僅依日期統計</span><span>{data ? `更新於 ${dateTime(data.generatedAt)}` : '等待資料'}</span></div>
            {loading && <div className="ad-state" role="status"><span className="ad-loader" />正在讀取統計資料…</div>}
            {error && <div className="ad-notice ad-error" role="alert">{error}<button className="ad-button" onClick={() => setRefresh(value => value + 1)}>重新讀取</button></div>}
            {data && s && <>
                {s.runs === 0 && <div className="ad-notice" role="status">此篩選範圍尚無合格遊玩局次。完成第一場正式戰鬥後才計入，不回填部署前資料。</div>}
                <section className="ad-kpis" aria-label="統計摘要">{[
                    ['造訪次數', number(s.visits), '樣本：' + number(s.visits) + ' 次造訪；同分頁 30 分鐘為一段'],
                    ['活躍匿名玩家', number(s.players), '樣本：' + number(s.players) + ' 個匿名瀏覽器識別碼，非自然人人數'],
                    ['合格遊玩局次', number(s.runs), '樣本：' + number(s.runs) + ' 局；已完成首場正式戰鬥'],
                    ['戰鬥勝率', rate(s.winRate), `${number(s.battleWins)} 勝 / ${number(s.battles)} 場戰鬥；分母含平手`],
                    ['整局完成率', rate(s.completionRate), `${number(s.completedRuns)} 已完成 / ${number(s.runs)} 合格局次`],
                    ['整局通關率', rate(s.clearRate), `${number(s.victories)} 通關 / ${number(s.completedRuns)} 已完成局次`],
                ].map(([label, value, note], index) => <article className={`ad-kpi ${index === 2 ? 'ad-kpi-featured' : ''}`} key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</section>
                <div className="ad-main-grid"><section className="ad-panel ad-trend"><div className="ad-panel-heading"><div><p className="ad-eyebrow">01 / MOMENTUM</p><h2>每日遊玩趨勢</h2></div><span>{number(s.visits)} 次造訪 · {number(s.runs)} 局</span></div><DailyChart daily={data.daily} /></section>
                <section className="ad-panel ad-outcomes"><p className="ad-eyebrow">02 / JOURNEY</p><h2>玩家走到哪裡？</h2><p className="ad-muted">樣本：{number(s.runs)} 合格局次</p><div className="ad-outcome-bar" aria-hidden="true">{[['victory', s.victories], ['defeat', s.defeats], ['abandoned', s.abandonedRuns], ['in_progress', s.inProgressRuns]].map(([id, count]) => <i key={id} className={`ad-outcome-${id}`} style={{ flexGrow: Number(count), display: Number(count) ? undefined : 'none' }} />)}</div><dl>{([['victory', s.victories], ['defeat', s.defeats], ['abandoned', s.abandonedRuns], ['in_progress', s.inProgressRuns]] as const).map(([id, count]) => <div key={id}><dt><i className={`ad-outcome-${id}`} />{statuses[id]}</dt><dd>{number(count)} <small>局</small></dd></div>)}</dl><p className="ad-footnote">未完成包含明確重開，以及超過 24 小時無更新。觀察期間尚未結束的局次列為進行中。</p></section></div>
                <section className="ad-panel"><div className="ad-panel-heading"><div><p className="ad-eyebrow">03 / PLAY STYLES</p><h2>模式與難度</h2></div><span>{data.modes.length} 個組合 · {number(s.battles)} 場戰鬥樣本</span></div><div className="ad-table-wrap"><table><thead><tr><th>模式 / 難度</th><th>遊玩局次</th><th>已完成</th><th>通關</th><th>戰鬥樣本</th><th>戰鬥勝率</th></tr></thead><tbody>{data.modes.map(row => <tr key={`${row.edition}-${row.difficulty}`}><th scope="row">{editions[row.edition] ?? row.edition}<small>{difficulties[row.difficulty] ?? row.difficulty}</small></th><td>{number(row.runs)}</td><td>{number(row.completedRuns)}</td><td>{number(row.victories)}</td><td>{number(row.battles)}</td><td className="ad-gold">{rate(row.winRate)}</td></tr>)}</tbody></table></div>{!data.modes.length && <p className="ad-empty">尚無模式統計。</p>}</section>
                <section className="ad-panel"><div className="ad-panel-heading"><div><p className="ad-eyebrow">04 / SYNERGIES</p><h2>羈絆出場觀察</h2></div><span>{data.synergies.length} 種羈絆</span></div><p className="ad-footnote">以啟用該羈絆的戰鬥為樣本；同場可計入多種羈絆，勝率分母包含平手。樣本少時請審慎比較。</p><div className="ad-synergies">{data.synergies.map(row => <article key={row.id}><div><span aria-hidden="true">{SYNERGIES[row.id]?.icon ?? '◇'}</span><strong>{SYNERGIES[row.id]?.name ?? row.id}</strong><b>{rate(row.winRate)}</b></div><div className="ad-synergy-track"><i style={{ width: `${Math.min(100, Math.max(0, row.winRate ?? 0))}%` }} /></div><small>樣本 {number(row.battles)} 場 · {number(row.wins)} 勝</small></article>)}</div>{!data.synergies.length && <p className="ad-empty">尚無羈絆戰鬥樣本。</p>}</section>
                <section className="ad-panel"><div className="ad-panel-heading"><div><p className="ad-eyebrow">05 / FIELD NOTES</p><h2>最近遊玩與最終隊伍</h2></div><span>顯示 {data.recentRuns.length} 局樣本</span></div><p className="ad-footnote">隊伍保留邏輯槽位與空槽；數值為最後一次回報的快照，並非即時戰鬥畫面。</p><div className="ad-runs">{data.recentRuns.map(run => <article className="ad-run" key={run.runId}><div className="ad-run-heading"><div><span className={`ad-status ad-status-${run.status}`}>{statuses[run.status]}</span><strong>{editions[run.edition] ?? run.edition} · {difficulties[run.difficulty] ?? run.difficulty}</strong><span className="ad-run-score">{run.wins} 勝 / {run.draws} 平 / {run.losses} 敗</span></div><span>{dateTime(run.startedAt)}</span></div><Team team={run.team} /><div className="ad-run-meta"><span>版本 {run.version || '未回報'}</span><span title={run.runId}>局次 {run.runId}</span></div></article>)}</div>{!data.recentRuns.length && <p className="ad-empty">這段期間尚無隊伍紀錄。</p>}</section>
                <footer className="ad-footer"><span>寶可夢自走棋 / 作者觀測站</span><span>正式遊玩樣本 · 預設排除教學、本機開發與自動測試<br />統計依瀏覽器回報，適合觀察趨勢；無分母的比率以「—」顯示。</span></footer>
            </>}
        </>}
    </main>;
}
