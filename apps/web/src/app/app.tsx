import { CheckoutPage } from './checkout-page';
import { FailPage } from './fail-page';
import { SuccessPage } from './success-page';

// 페이지가 세 개뿐이라 라우터 없이 경로로 고른다.
export function App() {
  switch (window.location.pathname) {
    case '/success':
      return <SuccessPage />;
    case '/fail':
      return <FailPage />;
    default:
      return <CheckoutPage />;
  }
}

export default App;
