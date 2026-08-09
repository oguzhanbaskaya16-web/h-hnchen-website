import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export function cartNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'CART_NOT_FOUND',
    message: 'Warenkorb wurde nicht gefunden.',
    error: 'Not Found',
  });
}

export function cartClosed(message: string): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'CART_CLOSED',
    message,
    error: 'Conflict',
  });
}

export function cartItemNotFound(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'CART_ITEM_NOT_FOUND',
    message: 'Warenkorbposition wurde nicht gefunden.',
    error: 'Not Found',
  });
}

export function productUnavailable(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: 'PRODUCT_UNAVAILABLE',
    message: 'Produkt ist nicht verfügbar.',
    error: 'Not Found',
  });
}

export function productOptionInvalid(optionId: number): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'PRODUCT_OPTION_INVALID',
    message: `Die Produktoption mit der ID ${optionId} ist für dieses Produkt nicht erlaubt.`,
    error: 'Bad Request',
  });
}

export function productOptionUnavailable(
  optionName: string,
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'PRODUCT_OPTION_UNAVAILABLE',
    message: `Die Produktoption "${optionName}" ist derzeit nicht verfügbar.`,
    error: 'Conflict',
  });
}

export function optionSelectionInvalid(message: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    code: 'OPTION_SELECTION_INVALID',
    message,
    error: 'Bad Request',
  });
}

export function maximumQuantityExceeded(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'MAXIMUM_QUANTITY_EXCEEDED',
    message:
      'Von einer Produktkonfiguration sind höchstens 99 Stück pro Warenkorb erlaubt.',
    error: 'Conflict',
  });
}
