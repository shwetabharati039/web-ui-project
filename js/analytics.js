// ═══════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════
import { entries, moodOrder } from './state.js';

export function renderAnalytics() {
    // Stats cards
    const totalWords = entries.reduce((s, e) => s + (e.wordCount || 0), 0);
    const avgWords = entries.length ? Math.round(totalWords / entries.length) : 0;
    const longestStreak = calculateLongestStreak();

    const allTags = {};
    entries.forEach(e => (e.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));
    const topTag = Object.entries(allTags).sort((a, b) => b[1] - a[1])[0];

    const readTime = Math.ceil(totalWords / 200);

    document.getElementById('analyticsStats').innerHTML =
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="stat-card-value">' + entries.length + '</div><div class="stat-card-label">Total Entries</div></div>' +
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-font"></i></div><div class="stat-card-value">' + totalWords.toLocaleString() + '</div><div class="stat-card-label">Total Words</div></div>' +
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-chart-simple"></i></div><div class="stat-card-value">' + avgWords + '</div><div class="stat-card-label">Avg Words/Entry</div></div>' +
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-fire"></i></div><div class="stat-card-value">' + longestStreak + '</div><div class="stat-card-label">Longest Streak</div></div>' +
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-tag"></i></div><div class="stat-card-value">' + (topTag ? '#' + topTag[0] : '—') + '</div><div class="stat-card-label">Most Used Tag</div></div>' +
        '<div class="stat-card"><div class="stat-card-icon"><i class="fa-solid fa-stopwatch"></i></div><div class="stat-card-value">' + readTime + 'm</div><div class="stat-card-label">Total Read Time</div></div>';

    // Mood distribution
    const moods = {};
    entries.forEach(e => { const m = e.mood || '📝'; moods[m] = (moods[m] || 0) + 1; });
    const maxMood = Math.max(...Object.values(moods), 1);
    const sortedMoods = Object.entries(moods).sort((a, b) => b[1] - a[1]);

    document.getElementById('moodChart').innerHTML = sortedMoods.map(([emoji, count]) =>
        '<div class="mood-bar-row"><span class="mood-bar-emoji">' + emoji + '</span><div class="mood-bar-track"><div class="mood-bar-fill" style="width:' + (count / maxMood * 100) + '%"></div></div><span class="mood-bar-count">' + count + '</span></div>'
    ).join('');

    if (sortedMoods.length === 0) {
        document.getElementById('moodChart').innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No mood data yet.</p>';
    }

    // Mood line chart (trend over time)
    const trendCanvas = document.getElementById('moodTrendChart');
    const parent = trendCanvas.parentElement;
    const trendCtx = trendCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cw = parent.clientWidth - 48;
    const ch = 260;
    trendCanvas.width = cw * dpr;
    trendCanvas.height = ch * dpr;
    trendCanvas.style.width = cw + 'px';
    trendCanvas.style.height = ch + 'px';
    trendCtx.scale(dpr, dpr);

    const moodEntries = entries.filter(e => e.mood && e.mood !== '📝' && moodOrder[e.mood] !== undefined);
    if (moodEntries.length < 2) {
        trendCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        trendCtx.font = '13px Inter, sans-serif';
        trendCtx.textAlign = 'center';
        trendCtx.textBaseline = 'middle';
        trendCtx.fillText('Write more entries with moods to see your emotional trend.', cw / 2, ch / 2);
    } else {
        moodEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
        const dailyMap = new Map();
        moodEntries.forEach(e => {
            const key = new Date(e.date).toLocaleDateString();
            if (!dailyMap.has(key)) dailyMap.set(key, []);
            dailyMap.get(key).push(moodOrder[e.mood]);
        });
        const dates = [...dailyMap.keys()];
        const rawVals = dates.map(d => {
            const v = dailyMap.get(d);
            return v.reduce((a, b) => a + b, 0) / v.length;
        });
        const values = rawVals.map(v => 10 - v);

        if (dates.length < 2) {
            trendCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
            trendCtx.font = '13px Inter, sans-serif';
            trendCtx.textAlign = 'center';
            trendCtx.textBaseline = 'middle';
            trendCtx.fillText('Not enough data points for a trend line. Write more!', cw / 2, ch / 2);
        } else {
            const pad = { top: 16, right: 16, bottom: 36, left: 44 };
            const chartW = cw - pad.left - pad.right;
            const chartH = ch - pad.top - pad.bottom;
            const yMin = 1, yMax = 10;
            const xStep = chartW / (dates.length - 1);

            const style = getComputedStyle(document.documentElement);
            const accent = style.getPropertyValue('--accent').trim();
            const border = style.getPropertyValue('--border').trim();
            const textMuted = style.getPropertyValue('--text-muted').trim();
            const bgCard = style.getPropertyValue('--bg-card').trim();

            function hexToRgb(hex) {
                const h = hex.replace('#', '');
                return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
            }
            function parseColor(str) {
                if (str.startsWith('#')) return hexToRgb(str);
                const m = str.match(/(\d+)/g);
                return m ? m.map(Number) : [37, 99, 235];
            }
            const [ar, ag, ab] = parseColor(accent);

            const points = values.map((v, i) => ({
                x: pad.left + i * xStep,
                y: pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH
            }));

            // Grid lines
            trendCtx.strokeStyle = border;
            trendCtx.lineWidth = 1;
            for (let v = 1; v <= 10; v++) {
                const y = pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
                trendCtx.beginPath();
                trendCtx.moveTo(pad.left, y);
                trendCtx.lineTo(cw - pad.right, y);
                trendCtx.stroke();
            }

            // Y-axis emoji labels
            const yLabels = { 1: '💔', 2: '😤', 3: '😢', 4: '😴', 5: '🤔', 6: '😐', 7: '🎉', 8: '😎', 9: '😊', 10: '🥰' };
            trendCtx.textAlign = 'right';
            trendCtx.textBaseline = 'middle';
            trendCtx.font = '14px sans-serif';
            for (let v = 1; v <= 10; v++) {
                const y = pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
                trendCtx.fillStyle = textMuted;
                trendCtx.globalAlpha = 0.6;
                trendCtx.fillText(yLabels[v] || '', pad.left - 8, y);
                trendCtx.globalAlpha = 1;
            }

            // Gradient fill under line
            if (points.length >= 2) {
                const grad = trendCtx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
                grad.addColorStop(0, `rgba(${ar},${ag},${ab},0.2)`);
                grad.addColorStop(1, `rgba(${ar},${ag},${ab},0.02)`);
                trendCtx.beginPath();
                trendCtx.moveTo(points[0].x, pad.top + chartH);
                points.forEach((p, i) => {
                    if (i === 0) trendCtx.lineTo(p.x, p.y);
                    else {
                        const prev = points[i - 1];
                        const cpx = (prev.x + p.x) / 2;
                        trendCtx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
                    }
                });
                trendCtx.lineTo(points[points.length - 1].x, pad.top + chartH);
                trendCtx.closePath();
                trendCtx.fillStyle = grad;
                trendCtx.fill();
            }

            // Line
            trendCtx.beginPath();
            points.forEach((p, i) => {
                if (i === 0) trendCtx.moveTo(p.x, p.y);
                else {
                    const prev = points[i - 1];
                    const cpx = (prev.x + p.x) / 2;
                    trendCtx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
                }
            });
            trendCtx.strokeStyle = accent;
            trendCtx.lineWidth = 2.5;
            trendCtx.lineJoin = 'round';
            trendCtx.lineCap = 'round';
            trendCtx.stroke();

            // Dots
            points.forEach(p => {
                trendCtx.beginPath();
                trendCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                trendCtx.fillStyle = accent;
                trendCtx.fill();
                trendCtx.strokeStyle = bgCard;
                trendCtx.lineWidth = 2;
                trendCtx.stroke();
            });

            // X-axis date labels
            trendCtx.textAlign = 'center';
            trendCtx.textBaseline = 'top';
            trendCtx.font = '10px Inter, sans-serif';
            trendCtx.fillStyle = textMuted;
            const interval = Math.max(1, Math.floor(points.length / 10));
            points.forEach((p, i) => {
                if (i % interval === 0 || i === points.length - 1) {
                    const d = new Date(dates[i]);
                    trendCtx.fillText(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), p.x, pad.top + chartH + 8);
                }
            });
        }
    }

    // Activity heatmap (last 30 days)
    const heatmap = document.getElementById('activityHeatmap');
    let heatHtml = '';
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = d.toLocaleDateString();
        const count = entries.filter(e => new Date(e.date).toLocaleDateString() === key).length;
        let level = '';
        if (count === 1) level = 'level-1';
        else if (count === 2) level = 'level-2';
        else if (count >= 3) level = 'level-4';
        heatHtml += '<div class="heatmap-cell ' + level + '" title="' + key + ': ' + count + ' entries"></div>';
    }
    heatmap.innerHTML = heatHtml;

    // Tag cloud
    const tagCloud = document.getElementById('tagCloud');
    const sortedTags = Object.entries(allTags).sort((a, b) => b[1] - a[1]).slice(0, 15);
    if (sortedTags.length === 0) {
        tagCloud.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No tags yet.</p>';
    } else {
        tagCloud.innerHTML = sortedTags.map(([tag, count]) =>
            '<span class="tag-cloud-item">#' + tag + ' <small>(' + count + ')</small></span>'
        ).join('');
    }

    // Mood timeline (recent 15 entries)
    const timeline = document.getElementById('moodTimeline');
    const recent = entries.slice(0, 15);
    if (recent.length === 0) {
        timeline.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No entries yet.</p>';
    } else {
        timeline.innerHTML = recent.map(e => {
            const d = new Date(e.date);
            return '<div class="mood-timeline-item"><span class="mood-timeline-emoji">' + (e.mood || '📝') + '</span><span class="mood-timeline-date">' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</span></div>';
        }).join('');
    }
}

export function calculateLongestStreak() {
    if (entries.length === 0) return 0;
    const dates = [...new Set(entries.map(e => new Date(e.date).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b));
    let longest = 1, current = 1;
    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr - prev) / 86400000;
        if (diff === 1) { current++; longest = Math.max(longest, current); }
        else { current = 1; }
    }
    return longest;
}

