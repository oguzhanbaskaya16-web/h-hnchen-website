import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimTransform = ({ value }: TransformFnParams): unknown =>
  trimString(value as unknown);

export class OrderCustomerDto {
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @Transform(trimTransform)
  @IsString()
  @Length(6, 30)
  @Matches(/^\+?[0-9][0-9 ()/-]*$/, {
    message: 'phone muss eine gültige Telefonnummer sein.',
  })
  phone: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  cartId: string;

  @IsInt()
  @Min(1)
  paymentMethodId: number;

  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @IsOptional()
  @IsISO8601({ strict: true })
  requestedTime?: string;

  @IsOptional()
  @Transform(trimTransform)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
