import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { SuccessPage } from './success-page';

describe('SuccessPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState(
      {},
      '',
      '/success?paymentType=NORMAL&orderId=order-123&paymentKey=pk-123&amount=50000',
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('StrictMode에서도 결제 승인을 한 번만 요청하고 결과를 보여준다', async () => {
    const payment = {
      status: 'DONE',
      method: '카드',
      orderName: '토스 티셔츠',
      totalAmount: 50000,
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payment), { status: 200 }));

    render(
      <StrictMode>
        <SuccessPage />
      </StrictMode>,
    );

    expect(await screen.findByText('결제를 완료했어요')).toBeTruthy();
    expect(screen.getByText('50,000원')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey: 'pk-123', orderId: 'order-123', amount: 50000 }),
    });
  });

  it('승인에 실패하면 에러 코드와 메시지를 보여준다', async () => {
    const error = {
      code: 'NOT_FOUND_PAYMENT_SESSION',
      message: '결제 시간이 만료되어 결제 진행 데이터가 존재하지 않습니다.',
    };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(error), { status: 404 }));

    render(<SuccessPage />);

    expect(await screen.findByText('결제 승인에 실패했어요')).toBeTruthy();
    expect(screen.getByText(error.code)).toBeTruthy();
    expect(screen.getByText(error.message)).toBeTruthy();
  });
});
