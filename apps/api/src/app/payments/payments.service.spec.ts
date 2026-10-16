import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  const fetchMock = vi.fn();

  beforeEach(() => {
    service = new PaymentsService();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('TOSS_SECRET_KEY', 'test_gsk_example');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('createOrder', () => {
    it('서버가 정한 상품 금액으로 주문을 만든다', () => {
      const order = service.createOrder();

      expect(order.orderId).toMatch(/^[A-Za-z0-9_-]{6,64}$/);
      expect(order.orderName).toBe('토스 티셔츠');
      expect(order.amount).toBe(50000);
    });

    it('주문마다 다른 orderId를 발급한다', () => {
      expect(service.createOrder().orderId).not.toBe(service.createOrder().orderId);
    });
  });

  describe('confirm', () => {
    it('없는 주문이면 토스를 호출하지 않고 404를 던진다', async () => {
      await expect(
        service.confirm({ paymentKey: 'pk', orderId: 'unknown-order', amount: 50000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('금액이 주문 금액과 다르면 토스를 호출하지 않고 400을 던진다', async () => {
      const { orderId } = service.createOrder();

      await expect(
        service.confirm({ paymentKey: 'pk', orderId, amount: 100 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('시크릿 키로 Basic 인증해서 결제 승인 API를 호출하고 응답을 돌려준다', async () => {
      const { orderId } = service.createOrder();
      const payment = { paymentKey: 'pk', orderId, status: 'DONE' };
      fetchMock.mockResolvedValue(new Response(JSON.stringify(payment), { status: 200 }));

      const result = await service.confirm({ paymentKey: 'pk', orderId, amount: 50000 });

      expect(result).toEqual(payment);
      expect(fetchMock).toHaveBeenCalledWith('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from('test_gsk_example:').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey: 'pk', orderId, amount: 50000 }),
      });
    });

    it('토스가 에러를 응답하면 같은 상태 코드와 에러 본문으로 던진다', async () => {
      const { orderId } = service.createOrder();
      const error = {
        code: 'REJECT_CARD_PAYMENT',
        message: '한도초과 혹은 잔액부족으로 결제에 실패했습니다.',
      };
      fetchMock.mockResolvedValue(new Response(JSON.stringify(error), { status: 403 }));

      const thrown = await service
        .confirm({ paymentKey: 'pk', orderId, amount: 50000 })
        .catch((e: unknown) => e);

      expect(thrown).toBeInstanceOf(HttpException);
      expect((thrown as HttpException).getStatus()).toBe(403);
      expect((thrown as HttpException).getResponse()).toEqual(error);
    });
  });
});
