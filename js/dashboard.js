import { supabase } from './supabase.js';

const transactionForm = document.getElementById('transaction-form');
const txTypeInput = document.getElementById('tx-type');
const txCategoryInput = document.getElementById('tx-category');
const txAmountInput = document.getElementById('tx-amount');
const txDateInput = document.getElementById('tx-date');
const txDescInput = document.getElementById('tx-desc');

const budgetForm = document.getElementById('budget-form');
const budgetCategoryInput = document.getElementById('budget-category');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetMonthInput = document.getElementById('budget-month');

const btnLogout = document.getElementById('btn-logout');

// --- Эхлүүлэх ---

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-email').textContent = user.email;

    await fetchTransactions();
    await fetchBudgets();
});

// --- Гүйлгээ ---

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        alert("Сешн дууссан байна. Дахин нэвтрэнэ үү!");
        window.location.href = 'index.html';
        return;
    }

    const type = txTypeInput.value;
    const category = txCategoryInput.value;
    const amount = parseFloat(txAmountInput.value);
    const description = txDescInput.value;
    const date = txDateInput.value;

    if (type === 'expense') {
        const currentMonthYear = date.substring(0, 7);

        const { data: budgetData } = await supabase
            .from('budgets')
            .select('limit_amount')
            .eq('user_id', user.id)
            .eq('category', category)
            .eq('month_year', currentMonthYear)
            .maybeSingle();

        if (budgetData) {
            const limitAmount = budgetData.limit_amount;

            const { data: pastExpenses } = await supabase
                .from('transactions')
                .select('amount, date')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .eq('category', category);

            let totalPastExpense = 0;
            if (pastExpenses) {
                pastExpenses.forEach(tx => {
                    if (tx.date && tx.date.substring(0, 7) === currentMonthYear) {
                        totalPastExpense += tx.amount;
                    }
                });
            }

            if (totalPastExpense + amount > limitAmount) {
                const newTotal = totalPastExpense + amount;
                const proceed = confirm(
                    `АНХААРУУЛГА!\n\n"${category}" ангиллын ${currentMonthYear} сарын төсвийн хязгаар: ${limitAmount.toLocaleString()} ₮\nӨмнөх зарцуулалт: ${totalPastExpense.toLocaleString()} ₮\nОдоо нэмэх дүн: ${amount.toLocaleString()} ₮\nНийт болно: ${newTotal.toLocaleString()} ₮\n\nТөсөв хэтрүүлж гүйлгээг үргэлжлүүлэх үү?`
                );
                if (!proceed) return;
            }
        }
    }

    const { error } = await supabase.from('transactions').insert([{
        user_id: user.id,
        type,
        category,
        amount,
        description,
        date,
    }]).select();

    if (error) {
        alert("Гүйлгээг хадгалахад алдаа гарлаа: " + error.message);
    } else {
        alert("Гүйлгээ амжилттай бүртгэгдлээ!");
        transactionForm.reset();
        await fetchTransactions();
    }
});


async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) {
        console.error("Гүйлгээ уншихад алдаа гарлаа:", error.message);
        return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        else if (tx.type === 'expense') totalExpense += tx.amount;
    });

    const totalBalance = totalIncome - totalExpense;
    document.getElementById('total-balance').textContent = `${totalBalance.toLocaleString()} ₮`;
    document.getElementById('total-income').textContent = `${totalIncome.toLocaleString()} ₮`;
    document.getElementById('total-expense').textContent = `${totalExpense.toLocaleString()} ₮`;

    renderTransactions(transactions);
}

function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list');

    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>
        `;
        return;
    }

    listContainer.innerHTML = transactions.map(tx => {
        const isIncome = tx.type === 'income';
        const badgeColor = isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
        const typeText = isIncome ? 'Орлого' : 'Зарлага';
        const amountSign = isIncome ? '+' : '-';
        const amountColor = isIncome ? 'text-success' : 'text-danger';

        return `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${badgeColor}">${typeText}</span></td>
                <td class="text-end fw-bold ${amountColor}">${amountSign}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.deleteTransaction = async function(id) {
    if (!confirm("Та энэ гүйлгээг устгахдаа итгэлтэй байна уу?")) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
        alert("Гүйлгээ устгахад алдаа гарлаа: " + error.message);
        return;
    }

    alert("Гүйлгээ амжилттай устгагдлаа.");
    await fetchTransactions();
};

// --- Төсөв ---

budgetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category = budgetCategoryInput.value;
    const limitAmount = parseFloat(budgetAmountInput.value);
    const monthYear = budgetMonthInput.value;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Сешн дууссан байна!");
        return;
    }

    const { error } = await supabase.from('budgets').insert([{
        user_id: user.id,
        category: category,
        limit_amount: limitAmount,
        month_year: monthYear,
    }]);

    if (error) {
        alert("Төсөв тогтооход алдаа гарлаа: " + error.message);
    } else {
        alert(`${monthYear} сарын ${category} ангилалд төсөв амжилттай тогтоогдлоо!`);
        budgetForm.reset();

        const instance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasBudget'));
        if (instance) instance.hide();

        await fetchBudgets();
    }
});

async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('month_year', { ascending: false });

    if (error) {
        console.error("Төсөв уншихад алдаа гарлаа:", error.message);
        return;
    }

    renderBudgets(budgets);
}

function renderBudgets(budgets) {
    const container = document.getElementById('current-budgets-list');

    if (budgets.length === 0) {
        container.innerHTML = `
            <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
            <div class="text-center py-3 text-muted small bg-light rounded">
                Одоогоор төсөв тогтоогоогүй байна.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h6 class="fw-bold text-dark mb-3">Одоогийн тогтоосон төсвүүд:</h6>
        ${budgets.map(b => `
            <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2 bg-light">
                <div>
                    <span class="fw-medium">${b.category}</span>
                    <span class="text-muted small ms-2">${b.month_year}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-primary">${b.limit_amount.toLocaleString()} ₮</span>
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="deleteBudget('${b.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('')}
    `;
}

window.deleteBudget = async function(id) {
    if (!confirm("Энэ төсвийг устгахдаа итгэлтэй байна уу?")) return;

    const { error } = await supabase.from('budgets').delete().eq('id', id);

    if (error) {
        alert("Төсөв устгахад алдаа гарлаа: " + error.message);
        return;
    }

    await fetchBudgets();
};

// --- Гарах ---

btnLogout.addEventListener('click', async () => {
    if (!confirm("Та системээс гарахдаа итгэлтэй байна уу?")) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
        alert("Системээс гарахад алдаа гарлаа: " + error.message);
        return;
    }

    window.location.href = 'index.html';
});

