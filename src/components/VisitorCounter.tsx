import { useEffect, useState } from "react";

interface VisitCounts {
  today: number;
  total: number;
}

let pageViewRequest: Promise<VisitCounts> | undefined;

function isVisitCounts(value: unknown): value is VisitCounts {
  if (!value || typeof value !== "object") return false;
  const counts = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(counts.today) &&
    Number.isSafeInteger(counts.total) &&
    Number(counts.today) >= 0 &&
    Number(counts.total) >= 0
  );
}

function recordPageView(): Promise<VisitCounts> {
  if (!pageViewRequest) {
    pageViewRequest = fetch("/api/visits", {
      method: "POST",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Visitor counter returned HTTP ${response.status}.`);
      }

      const result: unknown = await response.json();
      if (!isVisitCounts(result)) {
        throw new Error("Visitor counter returned an invalid response.");
      }
      return result;
    });
  }
  return pageViewRequest;
}

export default function VisitorCounter() {
  const [counts, setCounts] = useState<VisitCounts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void recordPageView()
      .then((result) => {
        if (active) setCounts(result);
      })
      .catch((error: unknown) => {
        console.error("Could not record page view:", error);
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="visitor-counter" aria-live="polite" aria-label="페이지 조회 수">
      {counts ? (
        <>
          <span>
            오늘 <strong>{counts.today.toLocaleString("ko-KR")}</strong>회
          </span>
          <span aria-hidden="true">·</span>
          <span>
            누적 <strong>{counts.total.toLocaleString("ko-KR")}</strong>회
          </span>
        </>
      ) : failed ? (
        <span className="visitor-counter-error">방문 통계를 불러오지 못했습니다.</span>
      ) : (
        <span>방문 통계 불러오는 중...</span>
      )}
    </div>
  );
}
