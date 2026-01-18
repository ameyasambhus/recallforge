import { useEffect, useRef } from "react";

export default function Recaptcha({ onVerify }) {
  const captchaRef = useRef(null);

  const isRendered = useRef(false);
  const verifyCallbackRef = useRef(onVerify);

  useEffect(() => {
    verifyCallbackRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    if (!window.grecaptcha || isRendered.current) return;

    isRendered.current = true;
    window.grecaptcha.render(captchaRef.current, {
      sitekey: import.meta.env.VITE_SITE_KEY,
      callback: (token) => {
        if (verifyCallbackRef.current) verifyCallbackRef.current(token);
      },
    });
  }, []);

  return <div ref={captchaRef}></div>;
}
