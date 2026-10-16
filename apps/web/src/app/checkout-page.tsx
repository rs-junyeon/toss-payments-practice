import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';
import type { TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { useEffect, useState } from 'react';

// 주문서형, 결제창형 연동 키 > 클라이언트 키 (test_gck_로 시작). 브라우저에 노출돼도 되는 키다.
const clientKey: string = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface Order {
  orderId: string;
  orderName: string;
  amount: number;
}

export function CheckoutPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결제를 요청하기 전에 서버에 주문(orderId, amount)을 먼저 저장한다.
  useEffect(() => {
    // StrictMode에서 effect가 두 번 실행돼도 마지막 실행 결과만 반영한다.
    let ignore = false;

    async function init() {
      const response = await fetch('/api/orders', { method: 'POST' });
      if (!response.ok) {
        throw new Error('주문을 만들지 못했어요. api 서버가 켜져 있는지 확인하세요.');
      }
      const order: Order = await response.json();
      const tossPayments = await loadTossPayments(clientKey);
      if (ignore) return;

      setOrder(order);
      setWidgets(tossPayments.widgets({ customerKey: ANONYMOUS }));
    }

    init().catch((e: Error) => {
      if (!ignore) setError(e.message);
    });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!widgets || !order) return;

    async function renderWidgets(widgets: TossPaymentsWidgets, order: Order) {
      // setAmount()는 renderPaymentMethods()보다 먼저 호출해야 한다.
      await widgets.setAmount({ currency: 'KRW', value: order.amount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
        widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
      ]);
      setReady(true);
    }

    renderWidgets(widgets, order).catch((e: Error) => setError(e.message));
  }, [widgets, order]);

  async function requestPayment() {
    if (!widgets || !order) return;

    try {
      // 인증이 끝나면 successUrl 또는 failUrl로 리다이렉트된다.
      await widgets.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/success`,
        failUrl: `${window.location.origin}/fail`,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="page">
      <h1>주문서</h1>
      <section className="order-summary">
        <span>{order?.orderName ?? '주문을 불러오는 중…'}</span>
        {order && <strong>{order.amount.toLocaleString()}원</strong>}
      </section>
      <div id="payment-method" />
      <div id="agreement" />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button" disabled={!ready} onClick={requestPayment}>
        결제하기
      </button>
    </main>
  );
}
