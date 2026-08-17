import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
export class CreateExpenseCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
}
export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class CreateExpenseDto {
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsDateString() date?: string;
}
