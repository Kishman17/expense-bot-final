import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Модель пользователя
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    telegramId!: number;

    @Column({ nullable: true })
    username?: string;

    @Column()
    firstName!: string;

    @Column({ nullable: true })
    lastName?: string;

    @CreateDateColumn()
    createdAt!: Date;
}

// Модель расхода
@Entity('expenses')
export class Expense {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount!: number;

    @Column()
    category!: string;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'timestamp' })
    date!: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ default: 'expense' }) // 'expense' или 'income'
    type!: string;

}

@Entity('incomes')
export class Income {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount!: number;

    @Column()
    category!: string; // 'Зарплата', 'Подарок', 'Кэшбэк' и т.д.

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'timestamp' })
    date!: Date;

    @CreateDateColumn()
    createdAt!: Date;
}