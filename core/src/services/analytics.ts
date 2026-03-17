import { getRepository, Between } from 'typeorm';
import { Expense, Income } from '../database/models';


export class AnalyticsService {
    // Получить расходы за период
    async getExpensesByDateRange(userId: string, startDate: Date, endDate: Date) {
        const expenseRepo = getRepository(Expense);
        
        return await expenseRepo.find({
            where: {
                userId,
                date: Between(startDate, endDate)
            },
            order: { date: 'DESC' }
        });
    }
     async getIncomeStats(userId: string, startDate: Date, endDate: Date) {
        const incomeRepo = getRepository(Income);
        const incomes = await incomeRepo.find({
            where: {
                userId,
                date: Between(startDate, endDate)
            }
        });
        
        const total = incomes.reduce((sum, i) => sum + i.amount, 0);
        return { total, count: incomes.length, items: incomes };
     }
    

    // 👇 И ЭТОТ МЕТОД
    async getBalance(userId: string, startDate: Date, endDate: Date) {
        const expenseRepo = getRepository(Expense);
        const incomeRepo = getRepository(Income);
        
        const expenses = await expenseRepo.find({
            where: { userId, date: Between(startDate, endDate) }
        });
        
        const incomes = await incomeRepo.find({
            where: { userId, date: Between(startDate, endDate) }
        });
        
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        
        return {
            income: totalIncome,
            expense: totalExpense,
            delta: totalIncome - totalExpense,
            savings: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
        };
    }

    // Получить статистику по категориям
    async getCategoryStats(userId: string, startDate: Date, endDate: Date) {
        const expenses = await this.getExpensesByDateRange(userId, startDate, endDate);
        
        const stats = new Map();
        let total = 0;

        for (const exp of expenses) {
            const current = stats.get(exp.category) || { total: 0, count: 0 };
            current.total += exp.amount;
            current.count += 1;
            stats.set(exp.category, current);
            total += exp.amount;
        }

        const result = [];
        for (const [category, data] of stats) {
            result.push({
                category,
                total: data.total,
                count: data.count,
                percentage: (data.total / total) * 100
            });
        }

        return result.sort((a, b) => b.total - a.total);
    }

    // Получить общую статистику
    async getGeneralStats(userId: string, startDate: Date, endDate: Date) {
        const expenses = await this.getExpensesByDateRange(userId, startDate, endDate);
        
        if (expenses.length === 0) {
            return {
                total: 0,
                average: 0,
                max: 0,
                min: 0,
                count: 0
            };
        }

        const amounts = expenses.map(e => e.amount);
        
        return {
            total: amounts.reduce((a, b) => a + b, 0),
            average: amounts.reduce((a, b) => a + b, 0) / amounts.length,
            max: Math.max(...amounts),
            min: Math.min(...amounts),
            count: expenses.length
        };
    }

    // Получить данные для графика (по дням)
    async getDailyStats(userId: string, startDate: Date, endDate: Date) {
        const expenses = await this.getExpensesByDateRange(userId, startDate, endDate);
        
        const daily = new Map();
        
        for (const exp of expenses) {
            const dateStr = exp.date.toISOString().split('T')[0];
            const current = daily.get(dateStr) || 0;
            daily.set(dateStr, current + exp.amount);
        }

        const result = [];
        for (const [date, total] of daily) {
            result.push({ date, total });
        }

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }
    
}
