import { useEffect, useState } from "react";

const SDK_ID = "kakao-maps-sdk";

export function useKakaoLoader() {
  const [loaded, setLoaded] = useState(!!window.kakao?.maps);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.kakao?.maps) {
      setLoaded(true);
      return;
    }

    const appkey =
      window.__APP_CONFIG__?.kakaoJsKey || import.meta.env.VITE_KAKAO_JS_KEY;
    if (!appkey) {
      setError("VITE_KAKAO_JS_KEY가 설정되지 않았어요 (.env 확인)");
      return;
    }

    let script = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SDK_ID;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
      script.async = true;
      document.head.appendChild(script);
    }

    const onLoad = () => window.kakao.maps.load(() => setLoaded(true));
    const onError = () =>
      setError(
        "카카오맵 SDK 로드 실패 (앱 키 또는 등록된 도메인을 확인하세요)",
      );

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if ((script as any)._loaded) onLoad();

    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, []);

  return { loaded, error };
}
