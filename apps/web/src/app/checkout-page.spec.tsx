import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CheckoutPage } from './checkout-page';

const widgets = vi.hoisted(() => ({
  setAmount: vi.fn(),
  renderPaymentMethods: vi.fn(),
  renderAgreement: vi.fn(),
  requestPayment: vi.fn(),
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  ANONYMOUS: '@@ANONYMOUS',
  loadTossPayments: vi.fn(async () => ({ widgets: () => widgets })),
}));

const order = { orderId: 'order-123', orderName: '토스 티셔츠', amount: 50000 };

function payButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: '결제하기' });
}

describe('CheckoutPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    Object.values(widgets).forEach((fn) => fn.mockReset());
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('서버에서 만든 주문 금액으로 결제 UI를 렌더링한다', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(order), { status: 201 }));

    render(<CheckoutPage />);

    await waitFor(() => expect(payButton().disabled).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith('/api/orders', { method: 'POST' });
    expect(widgets.setAmount).toHaveBeenCalledWith({ currency: 'KRW', value: 50000 });
    expect(widgets.renderPaymentMethods).toHaveBeenCalledWith({
      selector: '#payment-method',
      variantKey: 'DEFAULT',
    });
    expect(widgets.renderAgreement).toHaveBeenCalledWith({
      selector: '#agreement',
      variantKey: 'AGREEMENT',
    });
  });

  it('결제하기를 누르면 서버 주문 정보로 결제를 요청한다', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(order), { status: 201 }));
    render(<CheckoutPage />);
    await waitFor(() => expect(payButton().disabled).toBe(false));

    fireEvent.click(payButton());

    expect(widgets.requestPayment).toHaveBeenCalledWith({
      orderId: 'order-123',
      orderName: '토스 티셔츠',
      successUrl: `${window.location.origin}/success`,
      failUrl: `${window.location.origin}/fail`,
    });
  });

  it('결제를 다시 요청하면 이전 에러 메시지를 지운다', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(order), { status: 201 }));
    widgets.requestPayment
      .mockRejectedValueOnce(new Error('카드 결제 정보를 선택해주세요.'))
      .mockReturnValueOnce(new Promise(() => undefined));
    render(<CheckoutPage />);
    await waitFor(() => expect(payButton().disabled).toBe(false));

    fireEvent.click(payButton());
    expect((await screen.findByRole('alert')).textContent).toBe('카드 결제 정보를 선택해주세요.');

    fireEvent.click(payButton());
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('주문 생성에 실패하면 에러를 보여주고 결제 버튼을 막는다', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));

    render(<CheckoutPage />);

    expect((await screen.findByRole('alert')).textContent).toContain('주문을 만들지 못했어요');
    expect(payButton().disabled).toBe(true);
    expect(widgets.renderPaymentMethods).not.toHaveBeenCalled();
  });
});
