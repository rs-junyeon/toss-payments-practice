import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('/fail 경로에서 쿼리 파라미터의 에러 코드와 메시지를 보여준다', () => {
    window.history.pushState(
      {},
      '',
      `/fail?code=PAY_PROCESS_CANCELED&message=${encodeURIComponent('사용자에 의해 결제가 취소되었습니다.')}`,
    );

    render(<App />);

    expect(screen.getByText('결제를 실패했어요')).toBeTruthy();
    expect(screen.getByText('PAY_PROCESS_CANCELED')).toBeTruthy();
    expect(screen.getByText('사용자에 의해 결제가 취소되었습니다.')).toBeTruthy();
  });
});
