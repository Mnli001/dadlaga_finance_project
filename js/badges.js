import { supabase } from './supabase.js';

const BADGES = [
    {
        name: 'Баатар',
        icon: 'fa-shield-halved',
        min: 1_000_000,
        color: '#cd7f32',
        bg: 'rgba(205,127,50,0.15)',
        shadow: 'rgba(205,127,50,0.3)',
    },
    {
        name: 'Түшмэл',
        icon: 'fa-scroll',
        min: 5_000_000,
        color: '#78909c',
        bg: 'rgba(120,144,156,0.15)',
        shadow: 'rgba(120,144,156,0.3)',
    },
    {
        name: 'Тайж',
        icon: 'fa-gem',
        min: 10_000_000,
        color: '#26c6da',
        bg: 'rgba(38,198,218,0.15)',
        shadow: 'rgba(38,198,218,0.3)',
    },
    {
        name: 'Ноён',
        icon: 'fa-chess-knight',
        min: 25_000_000,
        color: '#66bb6a',
        bg: 'rgba(102,187,106,0.15)',
        shadow: 'rgba(102,187,106,0.3)',
    },
    {
        name: 'Ван',
        icon: 'fa-chess-king',
        min: 50_000_000,
        color: '#ff9800',
        bg: 'rgba(255,152,0,0.15)',
        shadow: 'rgba(255,152,0,0.3)',
    },
    {
        name: 'Хаан',
        icon: 'fa-crown',
        min: 100_000_000,
        color: '#ffc107',
        bg: 'rgba(255,193,7,0.15)',
        shadow: 'rgba(255,193,7,0.3)',
    },
];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) { window.location.href = 'index.html'; return; }

    const { data: txs } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id);

    let totalIncome = 0, totalExpense = 0;
    txs?.forEach(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        else totalExpense += tx.amount;
    });
    const balance = totalIncome - totalExpense;

    let currentIdx = -1;
    for (let i = BADGES.length - 1; i >= 0; i--) {
        if (balance >= BADGES[i].min) { currentIdx = i; break; }
    }

    // Earned badges-ийг Supabase-д хадгалах
    const earnedNames = BADGES.slice(0, currentIdx + 1).map(b => b.name);
    if (earnedNames.length > 0) {
        const { data: existing } = await supabase
            .from('badges')
            .select('badge_name')
            .eq('user_id', user.id);

        const existingNames = new Set(existing?.map(r => r.badge_name) ?? []);
        const newBadges = earnedNames
            .filter(name => !existingNames.has(name))
            .map(name => ({ user_id: user.id, badge_name: name, awarded_at: new Date().toISOString() }));

        if (newBadges.length > 0) {
            await supabase.from('badges').insert(newBadges);
        }
    }

    const listEl = document.getElementById('badge-list');
    listEl.innerHTML = BADGES.map((b, i) => {
        const earned = balance >= b.min;
        const isCurrent = i === currentIdx;

        let rowStyle = 'background: white; border: 2px solid #e9ecef;';
        if (isCurrent) rowStyle = `background: white; border: 2px solid ${b.color}; box-shadow: 0 4px 20px ${b.shadow};`;

        let statusBadge = '';
        if (isCurrent) statusBadge = `<span class="status-badge" style="background:${b.color}; color:#fff;">Одоогийн</span>`;
        else if (earned) statusBadge = `<span class="status-badge" style="background:#d1fae5; color:#065f46;">Нээлттэй</span>`;
        else statusBadge = `<span class="status-badge" style="background:#f1f5f9; color:#94a3b8;">Түгжигдсэн</span>`;

        let rightIcon = '';
        if (isCurrent) rightIcon = `<i class="fa-solid fa-star ms-2" style="color:${b.color}; font-size:1.1rem;"></i>`;
        else if (earned) rightIcon = `<i class="fa-solid fa-circle-check ms-2 text-success" style="font-size:1.1rem;"></i>`;
        else rightIcon = `<i class="fa-solid fa-lock ms-2 text-secondary" style="font-size:1rem; opacity:0.5;"></i>`;

        const rowOpacity = (!earned && !isCurrent) ? 'opacity: 0.45; filter: grayscale(1);' : '';

        return `
            <div class="badge-row" style="${rowStyle} ${rowOpacity}">
                <div class="badge-icon-circle" style="background: ${b.bg}; color: ${b.color};">
                    <i class="fa-solid ${b.icon}"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
                        <span class="badge-name">${b.name}</span>
                        ${statusBadge}
                    </div>
                    <p class="text-muted mb-0" style="font-size: 0.82rem;">
                        <i class="fa-solid fa-coins me-1"></i>${(b.min / 1_000_000).toFixed(0)} сая ₮-с дээш үлдэгдэлтэй
                    </p>
                </div>
                ${rightIcon}
            </div>
        `;
    }).join('');
});
