import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { ConfirmPaymentRequest } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders')
  createOrder() {
    return this.paymentsService.createOrder();
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Body() body: ConfirmPaymentRequest) {
    return this.paymentsService.confirm(body);
  }
}
