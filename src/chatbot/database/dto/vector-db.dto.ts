import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


export class VectorDbPayloadDto {
  @IsString()
  text: string;

  @IsArray()
  @IsOptional()
  labels?: string[];

  @IsString()
  @IsOptional()
  company?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VectorDbFilterDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  labels?: string;
}

export class VectorDbBatchPayloadDto {
  @IsArray()
  @ValidateNested({each: true})
  @Type(() => VectorDbPayloadDto)
  items: VectorDbPayloadDto[];
}