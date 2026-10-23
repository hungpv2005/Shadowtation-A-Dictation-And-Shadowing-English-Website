import { Module } from '@nestjs/common';
import { DictationController } from './dictation.controller';
import { DictationService } from './dictation.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './jwt-auth.guard';

@Module({ controllers: [DictationController], providers: [DictationService, JwtAuthGuard, OptionalJwtAuthGuard] })
export class DictationModule {}
