import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 'b373e3d8-f89d-470a-b590-bb201e25bcdb',
    description: 'Mã UUID của gói cước cần nâng cấp (từ bảng subscription_plans - camelCase)',
  })
  @IsUUID('4', { message: 'planId phải là định dạng UUID v4 hợp lệ' })
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    example: 'b373e3d8-f89d-470a-b590-bb201e25bcdb',
    description: 'Mã UUID của gói cước cần nâng cấp (snake_case theo đặc tả SRS)',
  })
  @IsUUID('4', { message: 'plan_id phải là định dạng UUID v4 hợp lệ' })
  @IsOptional()
  plan_id?: string;

  @ApiPropertyOptional({
    example: 'VNPAY',
    enum: ['VNPAY', 'STRIPE', 'MOCK_SANDBOX'],
    default: 'VNPAY',
    description: 'Cổng thanh toán đối tác (Mặc định: VNPAY)',
  })
  @IsString({ message: 'provider phải là chuỗi' })
  @IsOptional()
  provider?: string;
}

