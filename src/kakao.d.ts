export {};

declare global {
  interface Window {
    kakao: any;
    __APP_CONFIG__?: {
      kakaoJsKey?: string;
    };
  }
}
