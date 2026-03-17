import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { getRepository } from 'typeorm';
import { User, Expense } from '../database/models';
import { AnalyticsService } from '../services/analytics';

export class ExpenseBot {
    private bot: Telegraf;
    private analytics: AnalyticsService;
    private webAppUrl: string;

    constructor(token: string, webAppUrl: string) {
        this.bot = new Telegraf(token);
        this.analytics = new AnalyticsService();
        this.webAppUrl = webAppUrl;
        
        this.setupCommands();
        this.setupHandlers();
    }

    private setupCommands() {
        // Команда /start
        this.bot.command('start', async (ctx) => {
            const userRepo = getRepository(User);
            
            let user = await userRepo.findOne({ 
                where: { telegramId: ctx.from.id } 
            });
            
            if (!user) {
                user = userRepo.create({
                    telegramId: ctx.from.id,
                    username: ctx.from.username,
                    firstName: ctx.from.first_name,
                    lastName: ctx.from.last_name
                });
                await userRepo.save(user);
            }

            await ctx.reply(
                `👋 Привет, ${user.firstName}!\n\n` +
                `Я бот для учёта расходов. Нажми кнопку ниже, чтобы открыть Mini App:`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '📱 Открыть учёт расходов',
                                web_app: { url: `${this.webAppUrl}?user_id=${user.id}` }
                            }
                        ]]
                    }
                }
            );
        });

        // Команда /help
        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '📚 Доступные команды:\n\n' +
                '/start - Начать работу\n' +
                '/stats - Статистика за месяц\n' +
                '/today - Расходы за сегодня\n' +
                '/help - Помощь'
            );
        });

        // Команда /stats
        this.bot.command('stats', async (ctx) => {
            try {
                const userRepo = getRepository(User);
                const user = await userRepo.findOne({ 
                    where: { telegramId: ctx.from.id } 
                });

                if (!user) {
                    return ctx.reply('Сначала используй /start');
                }

                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);

                const stats = await this.analytics.getGeneralStats(
                    user.id, 
                    startDate, 
                    endDate
                );

                await ctx.reply(
                    `📊 Статистика за месяц:\n\n` +
                    `💰 Всего: ${stats.total} ₽\n` +
                    `📊 Средний: ${stats.average.toFixed(2)} ₽\n` +
                    `📈 Макс: ${stats.max} ₽\n` +
                    `📉 Мин: ${stats.min} ₽\n` +
                    `📝 Количество: ${stats.count}`
                );
            } catch (error) {
                console.error('Ошибка в команде stats:', error);
                await ctx.reply('❌ Произошла ошибка при получении статистики');
            }
        });

        // Команда /today
        this.bot.command('today', async (ctx) => {
            try {
                const userRepo = getRepository(User);
                const user = await userRepo.findOne({ 
                    where: { telegramId: ctx.from.id } 
                });

                if (!user) {
                    return ctx.reply('Сначала используй /start');
                }

                const endDate = new Date();
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);

                const expenses = await this.analytics.getExpensesByDateRange(
                    user.id,
                    startDate,
                    endDate
                );

                const total = expenses.reduce((sum, e) => sum + e.amount, 0);

                await ctx.reply(
                    `📅 Расходы за сегодня:\n\n` +
                    `💰 Всего: ${total} ₽\n` +
                    `📝 Количество: ${expenses.length}`
                );
            } catch (error) {
                console.error('Ошибка в команде today:', error);
                await ctx.reply('❌ Произошла ошибка при получении расходов');
            }
        });
    }

    private setupHandlers() {
        // Обработка данных из Mini App
        this.bot.on(message('web_app_data'), async (ctx) => {
            try {
                const data = JSON.parse(ctx.message.web_app_data.data);
                console.log('Получены данные из Mini App:', data);

                const userRepo = getRepository(User);
                const user = await userRepo.findOne({ 
                    where: { telegramId: ctx.from.id } 
                });

                if (!user) {
                    return ctx.reply('Ошибка: пользователь не найден');
                }

                switch (data.action) {
                    case 'add_expense':
                        await this.handleAddExpense(ctx, user.id, data);
                        break;
                    
                    case 'get_stats':
                        await this.handleGetStats(ctx, user.id, data);
                        break;
                    
                    default:
                        ctx.reply('Неизвестное действие');
                }
            } catch (error) {
                console.error('Ошибка обработки данных:', error);
                ctx.reply('❌ Ошибка при обработке данных');
            }
        });
    }

    private async handleAddExpense(ctx: any, userId: string, data: any) {
        try {
            const expenseRepo = getRepository(Expense);
            
            const expense = expenseRepo.create({
                userId,
                amount: data.amount,
                category: data.category,
                description: data.description || '',
                date: data.date ? new Date(data.date) : new Date()
            });

            await expenseRepo.save(expense);

            await ctx.reply(
                `✅ Расход добавлен!\n\n` +
                `💰 Сумма: ${data.amount} ₽\n` +
                `📁 Категория: ${data.category}\n` +
                (data.description ? `📝 Описание: ${data.description}\n` : '') +
                `📅 Дата: ${new Date(expense.date).toLocaleDateString('ru-RU')}`
            );
        } catch (error) {
            console.error('Ошибка при добавлении расхода:', error);
            await ctx.reply('❌ Ошибка при добавлении расхода');
        }
    }

    private async handleGetStats(ctx: any, userId: string, data: any) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            
            switch (data.period) {
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    break;
                default:
                    startDate.setMonth(startDate.getMonth() - 1);
            }

            const stats = await this.analytics.getGeneralStats(userId, startDate, endDate);
            const categories = await this.analytics.getCategoryStats(userId, startDate, endDate);

            let message = `📊 Статистика:\n\n`;
            message += `💰 Всего: ${stats.total} ₽\n`;
            message += `📊 Средний: ${stats.average.toFixed(2)} ₽\n`;
            message += `📝 Количество: ${stats.count}\n\n`;
            message += `📋 По категориям:\n`;

            categories.slice(0, 5).forEach(c => {
                message += `${c.category}: ${c.total} ₽ (${c.percentage.toFixed(1)}%)\n`;
            });

            await ctx.reply(message);
        } catch (error) {
            console.error('Ошибка при получении статистики:', error);
            await ctx.reply('❌ Ошибка при получении статистики');
        }
    }

    public start() {
        this.bot.launch();
        console.log('🤖 Бот запущен');

        // Правильная остановка
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}