import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LessonSentence } from './lesson-sentence.entity';

export type LessonLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LessonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

@Entity('lessons')
@Index('idx_lessons_status_level', ['status', 'level'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 20 })
  level!: LessonLevel;

  @Column({ name: 'audio_url', type: 'varchar', length: 500 })
  audioUrl!: string;

  @Column({ name: 'is_premium_only', type: 'boolean', default: false })
  isPremiumOnly!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: LessonStatus;

  @OneToMany(() => LessonSentence, (sentence) => sentence.lesson)
  sentences!: LessonSentence[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}