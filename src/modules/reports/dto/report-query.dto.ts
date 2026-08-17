import { IsDateString, IsEnum, IsOptional } from 'class-validator';
export enum ReportPeriod {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  CUSTOM = 'CUSTOM',
}
export class ReportQueryDto {
  @IsOptional() @IsEnum(ReportPeriod) period?: ReportPeriod;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
