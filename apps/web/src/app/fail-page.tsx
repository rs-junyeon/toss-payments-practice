export function FailPage() {
  // failUrl에는 code, message가 쿼리 파라미터로 붙어 온다.
  // 구매자가 결제를 취소한 경우(PAY_PROCESS_CANCELED)에는 orderId가 없다.
  const params = new URLSearchParams(window.location.search);

  return (
    <main className="page">
      <h1>결제를 실패했어요</h1>
      <dl className="details">
        <dt>에러 코드</dt>
        <dd>{params.get('code')}</dd>
        <dt>에러 메시지</dt>
        <dd>{params.get('message')}</dd>
      </dl>
      <a className="button" href="/">
        다시 주문하기
      </a>
    </main>
  );
}
