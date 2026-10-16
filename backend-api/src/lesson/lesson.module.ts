import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from '../database/entities/lesson.entity';
import { LessonSentence } from '../database/entities/lesson-sentence.entity';
import { LessonService } from './lesson.service';
import { AdminLessonController } from './admin-lesson.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, LessonSentence])],
  controllers: [AdminLessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
