import 'multer';
import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { SpeechService } from './speech.service';
import { AssessSpeechDto } from './dto/assess-speech.dto';

@ApiTags('Speech & Pronunciation Assessment')
@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Post('assess')
  @ApiOperation({
    summary: 'Chấm điểm phát âm Shadowing',
    description: 'Nhận file ghi âm của học viên và câu tiếng Anh mẫu, trả về điểm chi tiết theo chuẩn Azure.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'referenceText'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'File âm thanh (WAV, WebM, OGG, MP3)',
        },
        referenceText: {
          type: 'string',
          description: 'Câu mẫu tiếng Anh để đối chiếu',
          example: 'I love learning English every single day.',
        },
        sentenceId: {
          type: 'string',
          description: 'ID câu trong bài học (nếu có)',
        },
        attemptId: {
          type: 'string',
          description: 'ID của lượt làm bài (nếu có)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audio'))
  async assessPronunciation(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AssessSpeechDto,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên file âm thanh (audio)');
    }
    return this.speechService.assessPronunciation(file.buffer, dto.referenceText);
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái cấu hình Azure Speech Service' })
  health() {
    return this.speechService.healthCheck();
  }
}
