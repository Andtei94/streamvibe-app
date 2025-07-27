import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsMobile(false); 
      return;
    }
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    
    // Set initial value after mount
    setIsMobile(mql.matches)

    mql.addEventListener("change", onChange)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
