import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
export class CreatePurchaseItemDto {
  @IsUUID() catalogItemId!: string;
  @IsOptional() @IsUUID() variantId?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerItem!: number;
}
export class CreatePurchaseDto {
  @IsUUID() supplierId!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;
  @IsOptional() @IsDateString() date?: string;
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  @ArrayMinSize(1)
  items!: CreatePurchaseItemDto[];
}
