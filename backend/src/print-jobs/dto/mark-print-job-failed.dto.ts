import { Transform, TransformFnParams } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const PRINT_ERROR_TYPES = ['NETWORK', 'PRINTER', 'PERMANENT'] as const;

export type PrintErrorType = (typeof PRINT_ERROR_TYPES)[number];

export class MarkPrintJobFailedDto {
  @Transform(trim)
  @IsUUID('4')
  claimToken: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  agentId: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  printerName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  error: string;

  @IsIn(PRINT_ERROR_TYPES)
  errorType: PrintErrorType;
}
