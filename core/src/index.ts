import 'reflect-metadata';
import dotenv from 'dotenv';
import { connectDB } from './database/db';
import { ExpenseBot } from './bot/bot';

// Загружаем переменные окружения
dotenv.config();

// Получаем токен из .env
const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:8080';

// Проверяем наличие токена
if (!botToken) {
    console.error('❌ BOT_TOKEN не найден в .env файле');
    console.error('📝 Убедитесь, что файл .env содержит: BOT_TOKEN=ваш_токен');
    process.exit(1);
}

// Токен точно есть, можно использовать
const BOT_TOKEN: string = botToken;

async function main() {
    console.log('🚀 Запуск приложения...');
    console.log('🤖 BOT_TOKEN:', BOT_TOKEN ? '✅ загружен' : '❌ не загружен');
    console.log('📱 WEBAPP_URL:', webAppUrl);
    
    try {
        // Подключаемся к базе данных
        await connectDB();
        
        // Создаём бота - теперь BOT_TOKEN точно строка
        const bot = new ExpenseBot(BOT_TOKEN, webAppUrl);
        bot.start();
        
        console.log('✨ Бот успешно запущен и готов к работе!');
    } catch (error) {
        console.error('❌ Ошибка при запуске:', error);
        process.exit(1);
    }
}

// Запускаем приложение
main().catch(error => {
    console.error('❌ Необработанная ошибка:', error);
    process.exit(1);
});