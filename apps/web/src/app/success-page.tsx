import { useEffect, useRef, useState } from 'react';

// 토스페이먼츠 Payment 객체 중 화면에 보여줄 필드만 정의한다.
interface Payment {
  status: string;
  method: string;
  orderName: string;
  totalAmount: number;
}

interface PaymentError {
  code: string;
  message: string;
}

export function SuccessPage() {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<PaymentError | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    // StrictMode에서 effect가 두 번 실행돼도 승인은 한 번만 요청한다.
    // 같은 결제를 두 번 승인하면 토스가 ALREADY_PROCESSED_PAYMENT 에러를 준다.
    if (requested.current) return;
    requested.current = true;

    // successUrl에 붙어 온 결제 정보를 그대로 서버에 넘긴다. 금액 검증은 서버가 한다.
    const params = new URLSearchParams(window.location.search);
    const body = {
      paymentKey: params.get('paymentKey'),
      orderId: params.get('orderId'),
      amount: Number(params.get('amount')),
    };

    async function confirm() {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json);
        return;
      }
      setPayment(json);
    }

    confirm().catch(() =>
      setError({ code: 'NETWORK_ERROR', message: '결제 승인 요청을 보내지 못했어요.' }),
    );
  }, []);

  if (error) {
    return (
      <main className="page">
        <h1>결제 승인에 실패했어요</h1>
        <dl className="details">
          <dt>에러 코드</dt>
          <dd>{error.code}</dd>
          <dt>에러 메시지</dt>
          <dd>{error.message}</dd>
        </dl>
        <a className="button" href="/">
          다시 주문하기
        </a>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="page">
        <h1>결제를 승인하고 있어요…</h1>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>결제를 완료했어요</h1>
      <dl className="details">
        <dt>상품</dt>
        <dd>{payment.orderName}</dd>
        <dt>결제 금액</dt>
        <dd>{payment.totalAmount.toLocaleString()}원</dd>
        <dt>결제 수단</dt>
        <dd>{payment.method}</dd>
        <dt>상태</dt>
        <dd>{payment.status}</dd>
      </dl>
      <details>
        <summary>Payment 객체 전체 보기</summary>
        <pre>{JSON.stringify(payment, null, 2)}</pre>
      </details>
      <a className="button" href="/">
        처음으로
      </a>
    </main>
  );
}
