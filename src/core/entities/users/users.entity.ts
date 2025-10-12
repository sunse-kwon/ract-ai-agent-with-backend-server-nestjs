import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';


@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    email: string;

    @Column({select:false})
    password: string;

    @Column()
    name: string;

    @Column({ nullable: true, select:false })
    jti: string; // JWT ID

    @Column({default: true})
    isActive: boolean;

    @CreateDateColumn() // 생성 시간 자동 기록
    createdAt: Date;

    @UpdateDateColumn() // 수정 시간 자동 기록
    updatedAt: Date;

    @DeleteDateColumn({ nullable: true })
    deletedAt: Date | null;
}
