import { createConnection } from 'typeorm';
import { User, Expense } from './models';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
    try {
        const connection = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: [User, Expense],
            synchronize: true, // автоматически создаёт таблицы
            logging: false
        });
        
        console.log('✅ База данных подключена');
        return connection;
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error);
        throw error;
    }
};