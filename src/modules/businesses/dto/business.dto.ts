import { BusinessType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() industry!: string;
  @IsEnum(BusinessType) type!: BusinessType;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) enabledFeatures?: string[];
}

export class UpdateBusinessDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() industry?: string;
  @IsOptional() @IsEnum(BusinessType) type?: BusinessType;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) enabledFeatures?: string[];
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
