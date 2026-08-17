import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  NotEquals,
} from 'class-validator';

export enum InventoryOperation {
  OPENING = 'OPENING',
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class AdjustInventoryDto {
  @IsUUID() catalogItemId!: string;
  @IsOptional() @IsUUID() variantId?: string;
  @IsEnum(InventoryOperation) operation!: InventoryOperation;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @NotEquals(0)
  quantity!: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}
