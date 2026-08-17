import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ValidateIf(
    (value: RegisterDto) => !value.mobile || value.email !== undefined,
  )
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ValidateIf(
    (value: RegisterDto) => !value.email || value.mobile !== undefined,
  )
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,20}$/)
  mobile?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'password must contain uppercase, lowercase, and numeric characters',
  })
  password!: string;
}
