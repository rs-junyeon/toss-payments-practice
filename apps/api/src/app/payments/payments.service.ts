import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

// 연습용 단일 상품. 금액은 클라이언트가 아니라 서버가 정한다.
const PRODUCT = { name: '토스 티셔츠', amount: 50000 };

export interface Order {
  orderId: string;
  orderName: string;
  amount: number;
}

export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

@Injectable()
export class PaymentsService {
  // 연습용이라 DB 대신 메모리에 저장한다. 서버를 재시작하면 사라진다.
  private readonly orders = new Map<string, Order>();

  createOrder(): Order {
    const order = { orderId: randomUUID(), orderName: PRODUCT.name, amount: PRODUCT.amount };
    this.orders.set(order.orderId, order);
    return order;
  }

  async confirm({
    paymentKey,
    orderId,
    amount,
  }: ConfirmPaymentRequest): Promise<Record<string, unknown>> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException({ code: 'NOT_FOUND_ORDER', message: '주문을 찾을 수 없어요.' });
    }
    // 결제 요청 과정에서 클라이언트가 금액을 조작하지 않았는지 확인한다.
    if (order.amount !== amount) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: '결제 금액이 주문 금액과 달라요.',
      });
    }

    const response = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    // 성공하면 Payment 객체, 실패하면 { code, message } 에러 객체가 온다.
    const body = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      throw new HttpException(body, response.status);
    }
    return body;
  }
}

// 토스페이먼츠는 시크릿 키를 사용자 ID로 쓰고 비밀번호는 비워 둔다. 그래서 키 뒤에 ':'를 붙인다.
function basicAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new InternalServerErrorException({
      code: 'MISSING_SECRET_KEY',
      message: 'TOSS_SECRET_KEY 환경 변수가 없어요.',
    });
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}
