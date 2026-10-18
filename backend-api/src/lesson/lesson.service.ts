import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, LessonLevel, LessonStatus } from '../database/entities/lesson.entity';
import { LessonSentence, WordTiming } from '../database/entities/lesson-sentence.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateSentenceDto, UpdateSentenceDto } from './dto/create-sentence.dto';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonSentence)
    private readonly sentenceRepository: Repository<LessonSentence>,
  ) {}

  /**
   * Tự động tính toán phân bố thời gian từng từ nếu chưa có dữ liệu chi tiết
   */
  private buildWordsLinear(text: string, start: number, end: number): WordTiming[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const duration = Math.max(0.1, end - start);
    const step = duration / words.length;
    return words.map((w, i) => ({
      word: w.replace(/[.,!?;:"'()]/g, ''),
      start: Number((start + i * step).toFixed(2)),
      end: Number((start + (i + 1) * step).toFixed(2)),
    }));
  }

  /**
   * Admin lấy toàn bộ danh sách bài học (kèm số câu và bộ lọc)
   */
  async findAllAdmin(query: {
    level?: LessonLevel;
    status?: LessonStatus;
    isPremiumOnly?: boolean;
    q?: string;
  }) {
    const qb = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoin('lesson.sentences', 'sentence')
      .select([
        'lesson.id',
        'lesson.title',
        'lesson.level',
        'lesson.audioUrl',
        'lesson.mediaType',
        'lesson.sourceName',
        'lesson.sourceUrl',
        'lesson.durationSeconds',
        'lesson.isPremiumOnly',
        'lesson.status',
        'lesson.createdAt',
      ])
      .addSelect('COUNT(sentence.id)', 'sentenceCount');

    if (query.level) {
      qb.andWhere('lesson.level = :level', { level: query.level });
    }
    if (query.status) {
      qb.andWhere('lesson.status = :status', { status: query.status });
    }
    if (query.isPremiumOnly !== undefined) {
      qb.andWhere('lesson.isPremiumOnly = :isPremiumOnly', { isPremiumOnly: query.isPremiumOnly });
    }
    if (query.q) {
      qb.andWhere('LOWER(lesson.title) LIKE :q', { q: `%${query.q.toLowerCase()}%` });
    }

    qb.groupBy('lesson.id').orderBy('lesson.createdAt', 'DESC');

    const rawAndEntities = await qb.getRawAndEntities();

    return rawAndEntities.entities.map((lesson, index) => ({
      ...lesson,
      sentenceCount: Number(rawAndEntities.raw[index]?.sentenceCount ?? 0),
    }));
  }

  /**
   * Lấy chi tiết một bài học kèm toàn bộ danh sách câu
   */
  async findByIdWithSentences(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['sentences'],
      order: {
        sentences: {
          orderIndex: 'ASC',
          startTime: 'ASC',
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    return lesson;
  }

  /**
   * Admin tạo mới bài học (có thể đính kèm danh sách câu ngay)
   */
  async createLesson(dto: CreateLessonDto, adminUserId?: string): Promise<Lesson> {
    const lesson = this.lessonRepository.create({
      title: dto.title.trim(),
      level: dto.level,
      audioUrl: dto.audioUrl.trim(),
      mediaType: dto.mediaType ?? 'AUDIO',
      sourceName: dto.sourceName?.trim() || null,
      sourceUrl: dto.sourceUrl?.trim() || null,
      durationSeconds: dto.durationSeconds ?? null,
      isPremiumOnly: dto.isPremiumOnly ?? false,
      status: dto.status ?? 'DRAFT',
      createdByUserId: adminUserId || null,
    });

    const savedLesson = await this.lessonRepository.save(lesson);

    // Nếu có danh sách câu gửi kèm
    if (dto.sentences && dto.sentences.length > 0) {
      const sentenceEntities = dto.sentences.map((s, index) => {
        const wordsJson =
          s.wordsJson && s.wordsJson.length > 0
            ? s.wordsJson
            : this.buildWordsLinear(s.textContent, s.startTime, s.endTime);

        return this.sentenceRepository.create({
          lessonId: savedLesson.id,
          orderIndex: s.orderIndex !== undefined ? s.orderIndex : index,
          startTime: s.startTime,
          endTime: s.endTime,
          textContent: s.textContent.trim(),
          wordsJson,
        });
      });

      await this.sentenceRepository.save(sentenceEntities);
    }

    return this.findByIdWithSentences(savedLesson.id);
  }

  /**
   * Admin cập nhật thông tin bài học (tiêu đề, cờ premium, trạng thái, ...)
   */
  async updateLesson(id: string, dto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    if (dto.title !== undefined) lesson.title = dto.title.trim();
    if (dto.level !== undefined) lesson.level = dto.level;
    if (dto.audioUrl !== undefined) lesson.audioUrl = dto.audioUrl.trim();
    if (dto.mediaType !== undefined) lesson.mediaType = dto.mediaType;
    if (dto.sourceName !== undefined) lesson.sourceName = dto.sourceName ? dto.sourceName.trim() : null;
    if (dto.sourceUrl !== undefined) lesson.sourceUrl = dto.sourceUrl ? dto.sourceUrl.trim() : null;
    if (dto.durationSeconds !== undefined) lesson.durationSeconds = dto.durationSeconds;
    if (dto.isPremiumOnly !== undefined) lesson.isPremiumOnly = dto.isPremiumOnly;
    if (dto.status !== undefined) lesson.status = dto.status;

    await this.lessonRepository.save(lesson);
    return this.findByIdWithSentences(id);
  }

  /**
   * Admin xóa bài học (CSDL tự động cascade xóa các câu)
   */
  async deleteLesson(id: string): Promise<{ success: boolean; message: string }> {
    const lesson = await this.lessonRepository.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${id}`);
    }

    await this.lessonRepository.delete(id);
    return {
      success: true,
      message: `Đã xóa bài học "${lesson.title}" thành công.`,
    };
  }

  /**
   * Thêm 1 câu mới vào bài học
   */
  async addSentence(lessonId: string, dto: CreateSentenceDto): Promise<LessonSentence> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    const wordsJson =
      dto.wordsJson && dto.wordsJson.length > 0
        ? dto.wordsJson
        : this.buildWordsLinear(dto.textContent, dto.startTime, dto.endTime);

    const sentence = this.sentenceRepository.create({
      lessonId,
      orderIndex: dto.orderIndex,
      startTime: dto.startTime,
      endTime: dto.endTime,
      textContent: dto.textContent.trim(),
      wordsJson,
    });

    return this.sentenceRepository.save(sentence);
  }

  /**
   * Cập nhật 1 câu cụ thể trong bài học
   */
  async updateSentence(lessonId: string, sentenceId: string, dto: UpdateSentenceDto): Promise<LessonSentence> {
    const sentence = await this.sentenceRepository.findOne({
      where: { id: sentenceId, lessonId },
    });
    if (!sentence) {
      throw new NotFoundException(`Không tìm thấy câu với ID: ${sentenceId} trong bài học này`);
    }

    if (dto.orderIndex !== undefined) sentence.orderIndex = dto.orderIndex;
    if (dto.startTime !== undefined) sentence.startTime = dto.startTime;
    if (dto.endTime !== undefined) sentence.endTime = dto.endTime;
    if (dto.textContent !== undefined) {
      sentence.textContent = dto.textContent.trim();
      // Nếu có cập nhật textContent mà không truyền wordsJson, tự cập nhật lại wordsJson
      if (!dto.wordsJson) {
        sentence.wordsJson = this.buildWordsLinear(sentence.textContent, sentence.startTime, sentence.endTime);
      }
    }
    if (dto.wordsJson !== undefined) {
      sentence.wordsJson = dto.wordsJson;
    }

    return this.sentenceRepository.save(sentence);
  }

  /**
   * Xóa 1 câu trong bài học
   */
  async deleteSentence(lessonId: string, sentenceId: string): Promise<{ success: boolean; message: string }> {
    const sentence = await this.sentenceRepository.findOne({
      where: { id: sentenceId, lessonId },
    });
    if (!sentence) {
      throw new NotFoundException(`Không tìm thấy câu với ID: ${sentenceId} trong bài học này`);
    }

    await this.sentenceRepository.delete(sentenceId);
    return {
      success: true,
      message: `Đã xóa câu thứ tự ${sentence.orderIndex} thành công.`,
    };
  }

  /**
   * Ghi đè toàn bộ danh sách câu của bài học (Bulk replace)
   */
  async bulkSetSentences(lessonId: string, sentences: CreateSentenceDto[]): Promise<LessonSentence[]> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${lessonId}`);
    }

    // Xóa tất cả các câu hiện tại của bài học này
    await this.sentenceRepository.delete({ lessonId });

    // Tạo danh sách câu mới
    const entities = sentences.map((s, index) => {
      const wordsJson =
        s.wordsJson && s.wordsJson.length > 0
          ? s.wordsJson
          : this.buildWordsLinear(s.textContent, s.startTime, s.endTime);

      return this.sentenceRepository.create({
        lessonId,
        orderIndex: s.orderIndex !== undefined ? s.orderIndex : index,
        startTime: s.startTime,
        endTime: s.endTime,
        textContent: s.textContent.trim(),
        wordsJson,
      });
    });

    return this.sentenceRepository.save(entities);
  }
}
