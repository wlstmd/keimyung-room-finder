import { useEffect, useState } from "react";

const CONTACT_EMAIL = "wlstmd@wlstmd.cloud";

type ModalKind = "privacy" | "terms" | null;

export default function Footer() {
  const year = new Date().getFullYear();
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  return (
    <footer className="app-footer">
      <div className="footer-links">
        <button className="footer-link" onClick={() => setModal("privacy")}>
          개인정보처리방침
        </button>
        <span className="footer-divider" aria-hidden="true">·</span>
        <button className="footer-link" onClick={() => setModal("terms")}>
          이용약관
        </button>
        <span className="footer-divider" aria-hidden="true">·</span>
        <a className="footer-link" href={`mailto:${CONTACT_EMAIL}`}>
          문의 및 피드백: {CONTACT_EMAIL}
        </a>
      </div>
      <p>© {year} 계명대 빈 강의실 찾기. All rights reserved.</p>

      {modal && (
        <div className="footer-modal-backdrop" onClick={() => setModal(null)}>
          <div
            className="footer-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="footer-modal-header">
              <h2>{modal === "privacy" ? "개인정보처리방침" : "이용약관"}</h2>
              <button
                className="footer-modal-close"
                aria-label="닫기"
                onClick={() => setModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="footer-modal-body">
              {modal === "privacy" ? <PrivacyPolicy /> : <TermsOfService />}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <p>
        계명대 빈 강의실 찾기(이하 "이 서비스")는 개인 학습 목적으로 제작된 비영리
        서비스이며, 회원가입이나 로그인 기능이 없어 이름, 이메일 등 개인정보를
        별도로 수집·저장하지 않습니다.
      </p>
      <h3>1. 수집하는 정보</h3>
      <p>
        이 서비스는 서버나 데이터베이스 없이 정적으로 동작하며, 이용자로부터
        개인정보를 직접 수집하지 않습니다. 강의실 시간표 데이터는 학교에서
        공개한 자료를 가공하여 사용합니다.
      </p>
      <h3>2. 제3자 서비스</h3>
      <p>
        지도 표시를 위해 카카오맵(Kakao Maps) SDK를 사용하고 있으며, 이 과정에서
        카카오의 자체 정책에 따라 접속 기기 정보 등이 처리될 수 있습니다. 자세한
        내용은 카카오의 개인정보처리방침을 참고해 주세요.
      </p>
      <h3>3. 문의</h3>
      <p>
        개인정보 관련 문의는 아래 이메일로 연락해 주세요.
        <br />
        {CONTACT_EMAIL}
      </p>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <p>
        이 약관은 계명대 빈 강의실 찾기(이하 "이 서비스") 이용과 관련한 안내를
        위해 작성되었습니다.
      </p>
      <h3>1. 서비스의 성격</h3>
      <p>
        이 서비스는 계명대학교와 무관한 개인 프로젝트로, 재학생의 편의를 위해
        비영리 목적으로 제공됩니다.
      </p>
      <h3>2. 정보의 정확성</h3>
      <p>
        시간표 및 건물 정보는 공개된 자료를 바탕으로 제공되며, 학사 일정 변경,
        휴강, 강의실 변경 등으로 실제 정보와 차이가 있을 수 있습니다. 중요한
        일정은 반드시 학교 공식 시스템(수강신청 시스템 등)에서 다시 확인해
        주세요.
      </p>
      <h3>3. 책임의 한계</h3>
      <p>
        이 서비스의 정보를 이용하여 발생한 불이익에 대해 운영자는 책임을 지지
        않습니다.
      </p>
      <h3>4. 문의 및 피드백</h3>
      <p>
        오류 제보, 개선 제안 등은 아래 이메일로 보내주시면 감사하겠습니다.
        <br />
        {CONTACT_EMAIL}
      </p>
    </>
  );
}
